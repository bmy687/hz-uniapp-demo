import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getBreakerState, getBreakerStateText, getBreakerStateColor, breakerStatusMap } from '../../src/shared/constants/breakerCodes.js'

const run = async (name, fn) => {
	await fn()
	console.log(`ok - ${name}`)
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const componentPath = path.resolve(currentDir, '../../src/pages/index/index.vue')
const componentSource = fs.readFileSync(componentPath, 'utf8')
const scriptMatch = componentSource.match(/<script setup>([\s\S]*?)<\/script>/)

assert.ok(scriptMatch, 'index.vue should contain a <script setup> block')

const scriptContent = scriptMatch[1].replace(/^\s*import\s.+$/gm, '').trim()

const importModule = async (relativePath) => {
	const modulePath = path.resolve(currentDir, relativePath)
	return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}-${Math.random()}`)
}

const createRequestMock = (handlers, requestLog) => {
	return (options) => {
		const method = options.method || 'GET'
		requestLog.push({
			method,
			url: options.url,
			data: options.data
		})

		const handlerKey = `${method} ${options.url}`
		const handler = handlers[handlerKey]
		const result = typeof handler === 'function' ? handler(options) : handler

		if (result && result.fail) {
			options.fail?.(result.fail)
			return
		}

		options.success?.({
			statusCode: result?.statusCode ?? 200,
			data: result?.data ?? {}
		})
	}
}

const loadPage = ({
	handlers = {},
	location = { protocol: 'https:', host: 'mobile.example.com' },
	pageOptions = { building: 'B', room: '101', gateway: 'G1' }
} = {}) => {
	const requestLog = []
	const connectSocketCalls = []
	const timeoutCalls = []
	const intervalCalls = []
	let mountedHook = () => {}
	let unmountedHook = () => {}
	let showHook = () => {}
	let hideHook = () => {}
	let now = 1000

	const socketHandlers = {
		open: () => {},
		message: () => {},
		close: () => {},
		error: () => {}
	}

	const windowMock = { location }

	const buildWsUrlForSandbox = () => {
		const protocol = windowMock.location.protocol === 'https:' ? 'wss' : 'ws'
		return `${protocol}://${windowMock.location.host}/ws`
	}

	const uniMock = {
		request: createRequestMock(handlers, requestLog),
		connectSocket: (options) => {
			connectSocketCalls.push(options)
			const task = {
				onOpen: (fn) => { socketHandlers.open = fn },
				onMessage: (fn) => { socketHandlers.message = fn },
				onClose: (fn) => { socketHandlers.close = fn },
				onError: (fn) => { socketHandlers.error = fn },
				close: () => {}
			}
			return task
		},
		showModal: () => {},
		showToast: () => {},
		makePhoneCall: () => {}
	}

	const createWsManagerForSandbox = ({ onOpen, onMessage, onClose, onError, reconnectDelay = 3000 } = {}) => {
		let wsTask = null
		let reconnectTimer = null
		let allowReconnect = true

		const clearReconnectTimer = () => {
			if (!reconnectTimer) return
			reconnectTimer = null
		}

		const scheduleReconnect = () => {
			if (!allowReconnect || reconnectTimer) return
			reconnectTimer = { fn: () => { reconnectTimer = null; connect() }, delay: reconnectDelay }
			timeoutCalls.push(reconnectTimer)
		}

		const close = () => {
			clearReconnectTimer()
			if (!wsTask) return
			try { wsTask.close() } catch (e) {}
			wsTask = null
		}

		const connect = () => {
			if (wsTask) return
			clearReconnectTimer()
			const task = uniMock.connectSocket({ url: buildWsUrlForSandbox() })
			wsTask = task
			task.onOpen(() => { clearReconnectTimer(); onOpen?.() })
			task.onMessage((res) => { onMessage?.(res) })
			task.onClose(() => { wsTask = null; onClose?.(); scheduleReconnect() })
			task.onError(() => { wsTask = null; onError?.(); scheduleReconnect() })
		}

		const setAllowReconnect = (value) => { allowReconnect = value }
		const isConnected = () => wsTask !== null

		return { connect, close, isConnected, setAllowReconnect }
	}

	// Sandbox-compatible API functions that delegate to the mocked uni.request
	const apiRequest = ({ url, method = 'GET', data, header }) => {
		return new Promise((resolve, reject) => {
			uniMock.request({
				url: `/api${url}`,
				method,
				data,
				header,
				success: (res) => {
					if (res.statusCode === 200) resolve(res.data)
					else reject(res.data || res)
				},
				fail: (err) => reject(err)
			})
		})
	}

	const getDeviceInfo = (building, room, gateway) =>
		apiRequest({ url: `/${building}/${room}/${gateway}/info` })
	const getDeviceData = (building, room, gateway) =>
		apiRequest({ url: `/${building}/${room}/${gateway}/data?_t=${now}` })
	const sendDeviceControl = (building, room, gateway, action) =>
		apiRequest({
			url: `/${building}/${room}/${gateway}/control`,
			method: 'POST',
			header: { 'Content-Type': 'application/json' },
			data: { action }
		})

	const context = {
		ref: (value) => ({ value }),
		onMounted: (fn) => {
			mountedHook = fn
		},
		onUnmounted: (fn) => {
			unmountedHook = fn
		},
		onShow: (fn) => {
			showHook = fn
		},
		onHide: (fn) => {
			hideHook = fn
		},
		getBreakerState,
		getBreakerStateText,
		getBreakerStateColor,
		breakerStatusMap,
		createWsManager: createWsManagerForSandbox,
		getDeviceInfo,
		getDeviceData,
		sendDeviceControl,
		Date: {
			now: () => now
		},
		window: windowMock,
		getCurrentPages: () => [{
			options: pageOptions,
			$page: { options: pageOptions }
		}],
		setTimeout: (fn, delay) => {
			const timer = { fn, delay }
			timeoutCalls.push(timer)
			return timer
		},
		clearTimeout: () => {},
		setInterval: (fn, delay) => {
			const timer = { fn, delay }
			intervalCalls.push(timer)
			return timer
		},
		clearInterval: () => {},
		uni: uniMock,
		console,
		Promise,
		decodeURIComponent,
		Number,
		JSON
	}

	const bindings = vm.runInNewContext(
		`(() => {
			${scriptContent}
			return {
				fetchData,
				connectWS,
				closeWS
			}
		})()`,
		context,
		{ filename: componentPath }
	)

	return {
		bindings,
		requestLog,
		connectSocketCalls,
		socketHandlers,
		timeoutCalls,
		intervalCalls,
		runMounted: () => mountedHook(),
		runShow: () => showHook(),
		runHide: () => hideHook(),
		runUnmounted: () => unmountedHook(),
		advanceTime: (value) => {
			now += value
		}
	}
}

await run('mounted fetchData uses a cache-busting data URL', async () => {
	const { requestLog, runMounted } = loadPage({
		handlers: {
			'GET /api/B/101/G1/info': { data: { device_type: 'breaker' } },
			'GET /api/B/101/G1/data?_t=1000': { data: { breaker_work: 4 } }
		}
	})

	runMounted()

	assert.equal(requestLog.some(item => item.url === '/api/B/101/G1/data?_t=1000'), true)
})

await run('request accepts 201 responses and uses the H5 dev proxy url', async () => {
	let requestOptions = null
	globalThis.window = {
		location: {
			port: '5174',
			host: '127.0.0.1:5174',
			protocol: 'http:'
		}
	}
	globalThis.uni = {
		request: (options) => {
			requestOptions = options
			options.success?.({
				statusCode: 201,
				data: { id: '10101' }
			})
			return {
				abort: () => {
					requestOptions.aborted = true
				}
			}
		}
	}

	const { request } = await importModule('../../src/shared/network/request.js')
	const promise = request({
		url: '/devices',
		method: 'POST',
		timeout: 4321
	})

	assert.deepEqual(await promise, { id: '10101' })
	assert.equal(requestOptions.url, '/api/devices')
	assert.equal(requestOptions.timeout, 4321)
	promise.abort()
	assert.equal(requestOptions.aborted, true)

	delete globalThis.window
	delete globalThis.uni
})

await run('network config derives websocket and request urls from the shared runtime config', async () => {
	globalThis.window = {
		location: {
			port: '5174',
			host: '127.0.0.1:5174',
			protocol: 'https:'
		}
	}

	const { buildRequestUrl, getWsUrl } = await importModule('../../src/shared/config/network.js')

	assert.equal(buildRequestUrl('/devices'), '/api/devices')
	assert.equal(getWsUrl(), 'wss://127.0.0.1:5174/ws')

	delete globalThis.window
})

await run('device api caches the device list and only cache-busts runtime data when requested', async () => {
	const requestUrls = []
	let deviceListRequestCount = 0

	globalThis.window = {
		location: {
			port: '5174',
			host: '127.0.0.1:5174',
			protocol: 'http:'
		}
	}
	globalThis.uni = {
		request: (options) => {
			requestUrls.push(options.url)
			if (options.url === '/api/devices') {
				deviceListRequestCount += 1
				options.success?.({
					statusCode: 200,
					data: [{ gateway: `G${deviceListRequestCount}` }]
				})
				return { abort: () => {} }
			}

			if (options.url === '/api/B/101/G1/data') {
				options.success?.({
					statusCode: 200,
					data: { breaker_work: 4 }
				})
				return { abort: () => {} }
			}

			if (options.url.startsWith('/api/B/101/G1/data?_t=')) {
				options.success?.({
					statusCode: 200,
					data: { breaker_work: 5 }
				})
				return { abort: () => {} }
			}

			options.fail?.({ error: `unexpected url: ${options.url}` })
			return { abort: () => {} }
		}
	}

	const { getDeviceList, getDeviceData, clearDeviceListCache } = await importModule('../../src/api/device.js')

	clearDeviceListCache()
	const firstList = await getDeviceList()
	const secondList = await getDeviceList()
	await getDeviceData('B', '101', 'G1')
	await getDeviceData('B', '101', 'G1', { noCache: true })

	assert.equal(deviceListRequestCount, 1)
	assert.deepEqual(firstList, secondList)
	assert.notEqual(firstList, secondList)
	assert.equal(requestUrls.includes('/api/B/101/G1/data'), true)
	assert.equal(requestUrls.some(url => url.startsWith('/api/B/101/G1/data?_t=')), true)

	clearDeviceListCache()
	delete globalThis.window
	delete globalThis.uni
})

await run('websocket connects using the current page protocol and host', async () => {
	const { connectSocketCalls, runMounted } = loadPage({
		location: { protocol: 'https:', host: 'mobile.example.com' }
	})

	runMounted()

	assert.equal(connectSocketCalls.length, 1)
	assert.equal(connectSocketCalls[0].url, 'wss://mobile.example.com/ws')
})

await run('socket close schedules a reconnect on the current host', async () => {
	const { connectSocketCalls, socketHandlers, timeoutCalls, runMounted } = loadPage({
		location: { protocol: 'https:', host: 'mobile.example.com' },
		handlers: {
			'GET /api/B/101/G1/info': { data: { device_type: 'breaker' } },
			'GET /api/B/101/G1/data?_t=1000': { data: { breaker_work: 4 } }
		}
	})

	runMounted()
	assert.equal(connectSocketCalls[0].url, 'wss://mobile.example.com/ws')

	socketHandlers.close()

	assert.equal(timeoutCalls.length, 1)
	assert.equal(timeoutCalls[0].delay, 3000)

	timeoutCalls[0].fn()

	assert.equal(connectSocketCalls.length, 2)
	assert.equal(connectSocketCalls[1].url, 'wss://mobile.example.com/ws')
})

await run('subsequent onShow triggers an immediate fresh data fetch', async () => {
	const { requestLog, runMounted, runShow, advanceTime } = loadPage({
		handlers: {
			'GET /api/B/101/G1/info': { data: { device_type: 'breaker' } },
			'GET /api/B/101/G1/data?_t=1000': { data: { breaker_work: 4 } },
			'GET /api/B/101/G1/data?_t=1500': { data: { breaker_work: 0 } },
			'GET /api/B/101/G1/data?_t=2000': { data: { breaker_work: 5 } }
		}
	})

	runMounted()
	runShow()
	advanceTime(500)
	runShow()
	advanceTime(500)
	runShow()

	assert.equal(requestLog.some(item => item.url === '/api/B/101/G1/data?_t=2000'), true)
})

await run('ws open stops polling, ws close starts polling as fallback', async () => {
	const { socketHandlers, intervalCalls, runMounted } = loadPage({
		handlers: {
			'GET /api/B/101/G1/info': { data: { device_type: 'breaker' } },
			'GET /api/B/101/G1/data?_t=1000': { data: { breaker_work: 4 } }
		}
	})

	runMounted()
	// onMounted calls connectWS but no startPolling 鈥?polling starts only as fallback
	assert.equal(intervalCalls.length, 0)

	// WS open 鈥?stopPolling is called (no-op here) but no polling started
	socketHandlers.open()
	assert.equal(intervalCalls.length, 0)

	// WS close 鈥?polling starts as fallback
	socketHandlers.close()
	assert.equal(intervalCalls.length, 1)
	assert.equal(intervalCalls[0].delay, 5000)
})

await run('ws open no longer triggers an extra fetch after the mounted request', async () => {
	const { requestLog, socketHandlers, runMounted } = loadPage({
		handlers: {
			'GET /api/B/101/G1/info': { data: { device_type: 'breaker' } },
			'GET /api/B/101/G1/data?_t=1000': { data: { breaker_work: 4 } }
		}
	})

	runMounted()
	const fetchCountBeforeOpen = requestLog.filter(item => item.url === '/api/B/101/G1/data?_t=1000').length

	socketHandlers.open()

	const fetchCountAfterOpen = requestLog.filter(item => item.url === '/api/B/101/G1/data?_t=1000').length
	assert.equal(fetchCountBeforeOpen, 1)
	assert.equal(fetchCountAfterOpen, 1)
})

