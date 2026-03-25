import { request } from '../shared/network/request.js'

const DEVICE_LIST_CACHE_TTL = 30000

let deviceListCache = {
	data: null,
	expireAt: 0,
	promise: null
}

const cloneDeviceList = (devices) => {
	if (!Array.isArray(devices)) return devices
	return devices.map(device => ({ ...device }))
}

const buildDataUrl = (building, room, gateway, noCache) => {
	const baseUrl = `/${building}/${room}/${gateway}/data`
	return noCache ? `${baseUrl}?_t=${Date.now()}` : baseUrl
}

// 获取设备列表，短时间内复用内存结果，避免多个页面重复拉同一份静态数据
export const getDeviceList = async ({ forceRefresh = false } = {}) => {
	const now = Date.now()
	if (!forceRefresh && Array.isArray(deviceListCache.data) && deviceListCache.expireAt > now) {
		return cloneDeviceList(deviceListCache.data)
	}

	if (!forceRefresh && deviceListCache.promise) {
		const devices = await deviceListCache.promise
		return cloneDeviceList(devices)
	}

	const pendingRequest = request({ url: '/devices' })
	deviceListCache.promise = pendingRequest

	try {
		const devices = await pendingRequest
		if (Array.isArray(devices)) {
			deviceListCache.data = devices
			deviceListCache.expireAt = Date.now() + DEVICE_LIST_CACHE_TTL
		}
		return cloneDeviceList(devices)
	} finally {
		deviceListCache.promise = null
	}
}

export const clearDeviceListCache = () => {
	deviceListCache = {
		data: null,
		expireAt: 0,
		promise: null
	}
}

// 获取设备静态信息
export const getDeviceInfo = (building, room, gateway) => {
	return request({ url: `/${building}/${room}/${gateway}/info` })
}

// 获取设备实时数据，只有明确需要绕过缓存时才附加时间戳
export const getDeviceData = (building, room, gateway, { noCache = false } = {}) => {
	return request({ url: buildDataUrl(building, room, gateway, noCache) })
}

// 发送控制指令
export const sendDeviceControl = (building, room, gateway, action) => {
	return request({
		url: `/${building}/${room}/${gateway}/control`,
		method: 'POST',
		header: { 'Content-Type': 'application/json' },
		data: { action }
	})
}