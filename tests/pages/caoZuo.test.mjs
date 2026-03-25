import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { getBreakerState, getBreakerStateText } from '../../src/shared/constants/breakerCodes.js'

const run = async (name, fn) => {
	await fn()
	console.log(`ok - ${name}`)
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const componentPath = path.resolve(currentDir, '../../src/pages/caoZuo/caoZuo.vue')
const componentSource = fs.readFileSync(componentPath, 'utf8')
const scriptMatch = componentSource.match(/<script setup>([\s\S]*?)<\/script>/)

assert.ok(scriptMatch, 'caoZuo.vue should contain a <script setup> block')

const scriptContent = scriptMatch[1].replace(/^\s*import\s.+$/gm, '').trim()

const createComputed = (getter) => ({
	get value() {
		return getter()
	}
})

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
		if (!handler) {
			options.fail?.({ error: `missing handler for ${handlerKey}` })
			return
		}

		const result = typeof handler === 'function' ? handler(options) : handler
		if (result?.then) {
			result
				.then((resolvedResult) => {
					if (resolvedResult && resolvedResult.fail) {
						options.fail?.(resolvedResult.fail)
						return
					}

					options.success?.({
						statusCode: resolvedResult?.statusCode ?? 200,
						data: resolvedResult?.data ?? resolvedResult
					})
				})
				.catch((error) => {
					options.fail?.(error)
				})
			return
		}
		if (result && result.fail) {
			options.fail?.(result.fail)
			return
		}

		options.success?.({
			statusCode: result?.statusCode ?? 200,
			data: result?.data ?? result
		})
	}
}

const loadPage = (handlers = {}) => {
	const requestLog = []
	const toastCalls = []
	const modalCalls = []
	const timeoutCalls = []
	const connectSocketCalls = []
	const socketHandlers = {
		open: () => {},
		message: () => {},
		close: () => {},
		error: () => {}
	}
	let showHook = () => {}
	let hideHook = () => {}
	let now = 0

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
		showToast: (options) => {
			toastCalls.push(options)
		},
		showModal: (options) => {
			modalCalls.push(options)
		}
	}

	const windowMock = {
		location: {
			protocol: 'https:',
			host: 'mobile.example.com'
		}
	}

	const buildWsUrlForSandbox = () => {
		const protocol = windowMock.location.protocol === 'https:' ? 'wss' : 'ws'
		return `${protocol}://${windowMock.location.host}/ws`
	}

	// createWsManager needs access to sandbox's uni and setTimeout, so build it here
	const createWsManagerForSandbox = ({ onOpen, onMessage, onClose, onError, reconnectDelay = 3000 } = {}) => {
		let wsTask = null
		let reconnectTimer = null
		let allowReconnect = true

		const clearReconnectTimer = () => {
			if (!reconnectTimer) return
			// clearTimeout is a no-op in the sandbox
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

	const getDeviceList = () => apiRequest({ url: '/devices' })
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
		computed: createComputed,
		onShow: (fn) => {
			showHook = fn
		},
		onHide: (fn) => {
			hideHook = fn
		},
		getBreakerState,
		getBreakerStateText,
		createWsManager: createWsManagerForSandbox,
		buildWsUrl: buildWsUrlForSandbox,
		getDeviceList,
		getDeviceData,
		sendDeviceControl,
		Date: {
			now: () => now
		},
		window: windowMock,
		setTimeout: (fn, delay) => {
			const timer = { fn, delay }
			timeoutCalls.push(timer)
			return timer
		},
		clearTimeout: (timer) => {
			if (!timer) return
			timer.cleared = true
		},
		uni: uniMock,
		console,
		Promise
	}

	const bindings = vm.runInNewContext(
		`(() => {
			${scriptContent}
			return {
				current,
				loading,
				refreshing,
				showInitialLoading,
				tableData,
				remember,
				selectedCount,
				statusSyncErrorCount,
				buildWsUrl,
				getDeviceKey,
				connectWS,
				closeWS,
				loadBreakerDevices,
				onClickItem,
				handleCheckAll,
				handleCheckSingle,
				performGlobalAction,
				handleGlobalAction
			}
		})()`,
		context,
		{ filename: componentPath }
	)

	return {
		bindings,
		requestLog,
		toastCalls,
		modalCalls,
		timeoutCalls,
		connectSocketCalls,
		socketHandlers,
		runShow: () => showHook(),
		runHide: () => hideHook(),
		advanceTime: (value) => {
			now += value
		}
	}
}

await run('loadBreakerDevices only keeps breaker devices and filters closed state on default tab', async () => {
	const { bindings } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-1', location: 'floor-1' },
				{ gateway: 'G2', building: 'B', room: '102', device_type: 'breaker', name: 'breaker-2', location: 'floor-2' },
				{ gateway: 'G3', building: 'B', room: '103', device_type: 'env_sensor', name: 'sensor-1', location: 'floor-3' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': { data: { breaker_work: 4 } },
		'GET /api/B/102/G2/data?_t=0': { data: { breaker_work: 0 } }
	})

	await bindings.loadBreakerDevices()

	assert.equal(bindings.tableData.value.length, 1)
	assert.equal(bindings.tableData.value[0].gateway, 'G1')
})

await run('loadBreakerDevices limits concurrent runtime requests', async () => {
	let inFlight = 0
	let maxInFlight = 0
	const devices = Array.from({ length: 6 }, (_, index) => ({
		gateway: `G${index + 1}`,
		building: 'B',
		room: `${100 + index}`,
		device_type: 'breaker',
		location: `floor-${index + 1}`
	}))
	const handlers = {
		'GET /api/devices': { data: devices }
	}

	devices.forEach((device) => {
		handlers[`GET /api/${device.building}/${device.room}/${device.gateway}/data?_t=0`] = () => new Promise((resolve) => {
			inFlight += 1
			maxInFlight = Math.max(maxInFlight, inFlight)
			setTimeout(() => {
				inFlight -= 1
				resolve({ data: { breaker_work: 4 } })
			}, 10)
		})
	})

	const { bindings } = loadPage(handlers)

	await bindings.loadBreakerDevices()

	assert.equal(bindings.tableData.value.length, 6)
	assert.equal(maxInFlight <= 4, true)
})

await run('operation page connects websocket on show using the current host', async () => {
	const { runShow, connectSocketCalls } = loadPage({
		'GET /api/devices': { data: [] }
	})

	runShow()

	assert.equal(connectSocketCalls.length, 1)
	assert.equal(connectSocketCalls[0].url, 'wss://mobile.example.com/ws')
})

await run('onHide closes websocket and onShow reconnects fresh', async () => {
	const { runShow, runHide, connectSocketCalls } = loadPage({
		'GET /api/devices': { data: [] }
	})

	runShow()
	assert.equal(connectSocketCalls.length, 1)

	runHide()
	// wsTask cleared by closeWS, so next onShow should create a new connection
	runShow()
	assert.equal(connectSocketCalls.length, 2)
})

await run('switching tab shows opened devices and clears previous selection', async () => {
	const { bindings } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-1', location: 'floor-1' },
				{ gateway: 'G2', building: 'B', room: '102', device_type: 'breaker', name: 'breaker-2', location: 'floor-2' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': { data: { breaker_work: 4 } },
		'GET /api/B/102/G2/data?_t=0': { data: { breaker_work: 0 } }
	})

	await bindings.loadBreakerDevices()
	bindings.handleCheckSingle(0)
	assert.equal(bindings.selectedCount.value, 1)

	bindings.onClickItem({ currentIndex: 1 })

	assert.equal(bindings.tableData.value.length, 1)
	assert.equal(bindings.tableData.value[0].gateway, 'G2')
	assert.equal(bindings.selectedCount.value, 0)
	assert.equal(bindings.remember.value, false)
})

await run('websocket breaker updates refresh the current selection list in real time', async () => {
	const { bindings, socketHandlers } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-1', location: 'floor-1' },
				{ gateway: 'G2', building: 'B', room: '102', device_type: 'breaker', name: 'breaker-2', location: 'floor-2' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': { data: { breaker_work: 5 } },
		'GET /api/B/102/G2/data?_t=0': { data: { breaker_work: 1 } }
	})

	await bindings.loadBreakerDevices()
	bindings.connectWS()

	assert.deepEqual(
		Array.from(bindings.tableData.value.map(item => item.gateway)),
		['G1']
	)

	socketHandlers.message({
		data: JSON.stringify({
			gateway: 'G2',
			type: 'update',
			fields: {
				breaker_work: 5
			}
		})
	})

	assert.deepEqual(
		Array.from(bindings.tableData.value.map(item => item.gateway)),
		['G1', 'G2']
	)
})

await run('ws snapshots arriving before load completes override stale http data', async () => {
	// 妯℃嫙锛欻TTP /data 杩斿洖鏃у€?(G1=5鍚堥椄, G2=1鍒嗛椄)锛屼絾 WS snapshot 鍦ㄥ姞杞芥湡闂存帹閫佷簡鏈€鏂板€?(G2=5鍚堥椄)
	const { bindings, socketHandlers } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-1', location: 'floor-1' },
				{ gateway: 'G2', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-2', location: 'floor-2' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': { data: { breaker_work: 5 } },
		'GET /api/B/101/G2/data?_t=0': { data: { breaker_work: 1 } }
	})

	// 鍏堣繛 WS锛岃 snapshot 鍦?loadBreakerDevices 涔嬪墠鍒拌揪
	bindings.connectWS()

	// WS snapshot 鎺ㄩ€侊細G2 瀹為檯涔熸槸鍚堥椄(5)锛屼絾 HTTP 浼氳繑鍥炴棫鍊?1)
	socketHandlers.message({
		data: JSON.stringify({
			gateway: 'G2',
			type: 'snapshot',
			data: { breaker_work: 5 }
		})
	})

	// snapshot should stay buffered until the initial device load finishes
	assert.equal(bindings.tableData.value.length, 0)


	// HTTP 鍔犺浇瀹屾垚
	await bindings.loadBreakerDevices()
	// default tab should display both closed devices after the snapshot override
	assert.deepEqual(


		Array.from(bindings.tableData.value.map(item => item.gateway)),
		['G1', 'G2']
	)
})

await run('table rows use the composite device key so same gateway devices are not reused as one row', async () => {
	const { bindings } = loadPage()

	assert.equal(componentSource.includes(':key="getDeviceKey(item)"'), true)
	assert.notEqual(
		bindings.getDeviceKey({ gateway: 'G1', building: 'B', room: '101' }),
		bindings.getDeviceKey({ gateway: 'G1', building: 'B', room: '102' })
	)
})

await run('performGlobalAction sends control requests to selected devices and reports partial failure', async () => {
	const { bindings, requestLog } = loadPage({
		'POST /api/B/101/G1/control': { data: { ok: true } },
		'POST /api/B/102/G2/control': { fail: { error: 'offline' } }
	})

	const result = await bindings.performGlobalAction('open', [
		{ gateway: 'G1', building: 'B', room: '101', name: 'breaker-1' },
		{ gateway: 'G2', building: 'B', room: '102', name: 'breaker-2' }
	])

	assert.equal(result.successCount, 1)
	assert.equal(result.failureCount, 1)
	assert.deepEqual(Array.from(result.failedItems), ['breaker-2'])
	assert.deepEqual(
		requestLog.map(item => `${item.method} ${item.url}`),
		['POST /api/B/101/G1/control', 'POST /api/B/102/G2/control']
	)
})

await run('successful action moves device to the opposite selection list without manual refresh', async () => {
	const { bindings, modalCalls } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-1', location: 'floor-1' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': { data: { breaker_work: 4 } },
		'POST /api/B/101/G1/control': { data: { ok: true } }
	})

	await bindings.loadBreakerDevices()
	bindings.handleCheckSingle(0)
	bindings.handleGlobalAction('open')
	assert.equal(modalCalls.length, 1)

	await modalCalls[0].success({ confirm: true })

	assert.equal(bindings.tableData.value.length, 0)

	bindings.onClickItem({ currentIndex: 1 })
	assert.equal(bindings.tableData.value.length, 1)
	assert.equal(bindings.tableData.value[0].gateway, 'G1')
})

await run('pending state prevents one stale refresh from moving device back immediately', async () => {
	const runtimeQueue = [
		{ breaker_work: 4 },
		{ breaker_work: 4 },
		{ breaker_work: 0 }
	]
	const { bindings, modalCalls, timeoutCalls } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-1', location: 'floor-1' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': () => ({
			data: runtimeQueue.shift()
		}),
		'POST /api/B/101/G1/control': { data: { ok: true } }
	})

	await bindings.loadBreakerDevices()
	bindings.handleCheckSingle(0)
	bindings.handleGlobalAction('open')
	await modalCalls[0].success({ confirm: true })

	assert.equal(timeoutCalls.length > 0, true)
	await timeoutCalls[0].fn()

	bindings.onClickItem({ currentIndex: 1 })
	assert.equal(bindings.tableData.value.length, 1)
	assert.equal(bindings.tableData.value[0].gateway, 'G1')
})

await run('silent refresh after action keeps the current checkbox selection', async () => {
	const runtimeQueue = [
		{ breaker_work: 4 },
		{ breaker_work: 4 }
	]
	const { bindings, modalCalls, timeoutCalls } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-1', location: 'floor-1' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': () => ({
			data: runtimeQueue.shift() ?? { breaker_work: 0 }
		}),
		'POST /api/B/101/G1/control': { data: { ok: true } }
	})

	await bindings.loadBreakerDevices()
	bindings.handleCheckSingle(0)
	bindings.handleGlobalAction('open')
	await modalCalls[0].success({ confirm: true })

	bindings.onClickItem({ currentIndex: 1 })
	bindings.handleCheckSingle(0)
	assert.equal(bindings.tableData.value[0].checked, true)
	assert.equal(bindings.selectedCount.value, 1)

	await timeoutCalls[0].fn()

	assert.equal(bindings.tableData.value.length, 1)
	assert.equal(bindings.tableData.value[0].checked, true)
	assert.equal(bindings.selectedCount.value, 1)
	assert.equal(bindings.remember.value, true)
})

await run('silent refresh keeps list visible instead of switching back to initial loading state', async () => {
	const { bindings } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', name: 'breaker-1', location: 'floor-1' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': { data: { breaker_work: 4 } }
	})

	await bindings.loadBreakerDevices()
	assert.equal(bindings.showInitialLoading.value, false)

	const pendingLoad = bindings.loadBreakerDevices({ silent: true })
	assert.equal(bindings.loading.value, false)
	assert.equal(bindings.refreshing.value, true)
	assert.equal(bindings.showInitialLoading.value, false)

	await pendingLoad
	assert.equal(bindings.refreshing.value, false)
})

await run('onHide clears the pending delayed status refresh timer', async () => {
	const { bindings, modalCalls, timeoutCalls, runHide } = loadPage({
		'GET /api/devices': {
			data: [
				{ gateway: 'G1', building: 'B', room: '101', device_type: 'breaker', location: 'floor-1' }
			]
		},
		'GET /api/B/101/G1/data?_t=0': { data: { breaker_work: 4 } },
		'POST /api/B/101/G1/control': { data: { ok: true } }
	})

	await bindings.loadBreakerDevices()
	bindings.handleCheckSingle(0)
	bindings.handleGlobalAction('open')
	await modalCalls[0].success({ confirm: true })

	const refreshTimer = timeoutCalls.find(item => item.delay === 1000)
	assert.equal(Boolean(refreshTimer), true)

	runHide()

	assert.equal(refreshTimer.cleared, true)
})


