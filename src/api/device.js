import { request } from './request.js'

// 获取设备列表
export const getDeviceList = () => {
	return request({ url: '/devices' })
}

// 获取设备静态信息
export const getDeviceInfo = (building, room, gateway) => {
	return request({ url: `/${building}/${room}/${gateway}/info` })
}

// 获取设备实时数据（带缓存破坏）
export const getDeviceData = (building, room, gateway) => {
	return request({ url: `/${building}/${room}/${gateway}/data?_t=${Date.now()}` })
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
