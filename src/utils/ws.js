const DEFAULT_RECONNECT_DELAY = 3000
const FALLBACK_WS_URL = 'ws://192.168.192.10:8080/ws'

export const buildWsUrl = () => {
	if (typeof window !== 'undefined' && window.location?.host) {
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
		return `${protocol}://${window.location.host}/ws`
	}
	return FALLBACK_WS_URL
}

/**
 * 创建可自动重连的 WebSocket 管理器。
 * @param {Object} options
 * @param {Function} options.onOpen    - 连接成功回调
 * @param {Function} options.onMessage - 收到消息回调 (res)
 * @param {Function} options.onClose   - 连接关闭回调
 * @param {Function} options.onError   - 连接错误回调
 * @param {number}   [options.reconnectDelay=3000]
 * @returns {{ connect, close, isConnected }}
 */
export const createWsManager = ({
	onOpen,
	onMessage,
	onClose,
	onError,
	reconnectDelay = DEFAULT_RECONNECT_DELAY
} = {}) => {
	let wsTask = null
	let reconnectTimer = null
	let allowReconnect = true

	const clearReconnectTimer = () => {
		if (!reconnectTimer) return
		clearTimeout(reconnectTimer)
		reconnectTimer = null
	}

	const scheduleReconnect = () => {
		if (!allowReconnect || reconnectTimer) return
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null
			connect()
		}, reconnectDelay)
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
		const task = uni.connectSocket({
			url: buildWsUrl(),
			success: () => {}
		})
		wsTask = task
		task.onOpen(() => {
			clearReconnectTimer()
			onOpen?.()
		})
		task.onMessage((res) => {
			onMessage?.(res)
		})
		task.onClose(() => {
			wsTask = null
			onClose?.()
			scheduleReconnect()
		})
		task.onError(() => {
			wsTask = null
			onError?.()
			scheduleReconnect()
		})
	}

	const setAllowReconnect = (value) => {
		allowReconnect = value
	}

	const isConnected = () => wsTask !== null

	return { connect, close, isConnected, setAllowReconnect }
}
