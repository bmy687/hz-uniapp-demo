import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const run = async (name, fn) => {
	await fn()
	console.log(`ok - ${name}`)
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const componentPath = path.join(currentDir, 'shouYe.vue')
const componentSource = fs.readFileSync(componentPath, 'utf8')
const scriptMatch = componentSource.match(/<script setup>([\s\S]*?)<\/script>/)

assert.ok(scriptMatch, 'shouYe.vue should contain a <script setup> block')

const scriptContent = scriptMatch[1].replace(/^\s*import\s.+$/gm, '').trim()

const createComputed = (getter) => ({
	get value() {
		return getter()
	}
})

const loadPage = (deviceResponse = []) => {
	let mountedHook = () => {}
	const toastCalls = []
	const navigateCalls = []

	const uniMock = {
		showToast: (options) => {
			toastCalls.push(options)
		},
		navigateTo: (options) => {
			navigateCalls.push(options)
		},
		getSystemInfoSync: () => ({
			statusBarHeight: 24
		})
	}

	const context = {
		ref: (value) => ({ value }),
		computed: createComputed,
		onMounted: (fn) => {
			mountedHook = fn
		},
		getDeviceList: async () => deviceResponse,
		uni: uniMock,
		console,
		Promise,
		encodeURIComponent
	}

	const bindings = vm.runInNewContext(
		`(() => {
			${scriptContent}
			return {
				statusBarHeight,
				deviceList,
				loading,
				keyword,
				selectedType,
				filteredDeviceList,
				hasActiveFilter,
				emptyTipText,
				fetchDevices,
				setTypeFilter,
				handleKeywordInput,
				clearFilters,
				handleDetail
			}
		})()`,
		context,
		{ filename: componentPath }
	)

	return {
		bindings,
		toastCalls,
		navigateCalls,
		runMounted: () => mountedHook()
	}
}

const sampleDevices = [
	{ gateway: 'B1_R101_T01', building: '笃行楼', room: '305', device_type: 'breaker', name: '305配电箱', location: '笃行楼305', admin: '张三', phone: '13800000001' },
	{ gateway: 'B1_R101_T02', building: '笃行楼', room: '306', device_type: 'env_sensor', name: '306环境传感器', location: '笃行楼306', admin: '李四', phone: '13800000002' },
	{ gateway: 'B1_R101_T03', building: '笃行楼', room: '307', device_type: 'meter', name: '307电表', location: '笃行楼307', admin: '王五', phone: '13800000003' }
]

await run('template renders cards from filteredDeviceList', async () => {
	assert.equal(componentSource.includes('v-for="device in filteredDeviceList"'), true)
})

await run('fetchDevices keeps all devices visible by default', async () => {
	const { bindings } = loadPage(sampleDevices)

	await bindings.fetchDevices()

	assert.equal(bindings.deviceList.value.length, 3)
	assert.equal(bindings.filteredDeviceList.value.length, 3)
	assert.equal(bindings.hasActiveFilter.value, false)
})

await run('type filter narrows the list to matching device_type', async () => {
	const { bindings } = loadPage(sampleDevices)

	await bindings.fetchDevices()
	bindings.setTypeFilter('breaker')

	assert.equal(bindings.filteredDeviceList.value.length, 1)
	assert.equal(bindings.filteredDeviceList.value[0].gateway, 'B1_R101_T01')
	assert.equal(bindings.hasActiveFilter.value, true)
})

await run('keyword filter matches room, location and gateway text', async () => {
	const { bindings } = loadPage(sampleDevices)

	await bindings.fetchDevices()
	bindings.handleKeywordInput({ detail: { value: '307' } })

	assert.equal(bindings.filteredDeviceList.value.length, 1)
	assert.equal(bindings.filteredDeviceList.value[0].gateway, 'B1_R101_T03')

	bindings.handleKeywordInput({ detail: { value: 't02' } })
	assert.equal(bindings.filteredDeviceList.value.length, 1)
	assert.equal(bindings.filteredDeviceList.value[0].gateway, 'B1_R101_T02')
})

await run('combined filters update empty tip and clearFilters restores defaults', async () => {
	const { bindings } = loadPage(sampleDevices)

	await bindings.fetchDevices()
	bindings.setTypeFilter('breaker')
	bindings.handleKeywordInput({ detail: { value: '307' } })

	assert.equal(bindings.filteredDeviceList.value.length, 0)
	assert.equal(bindings.emptyTipText.value, '暂无符合筛选条件的设备')

	bindings.clearFilters()

	assert.equal(bindings.selectedType.value, 'all')
	assert.equal(bindings.keyword.value, '')
	assert.equal(bindings.filteredDeviceList.value.length, 3)
})

