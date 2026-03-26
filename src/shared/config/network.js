const env = import.meta.env || {}

// H5 开发代理端口，与 vite.config 中的 proxy 配置对应
const DEV_PROXY_PORT = '5174'
// 默认后端地址（未配置环境变量时使用）
const DEFAULT_HTTP_BASE_URL = 'http://192.168.192.10:8080'
const DEFAULT_WS_URL = 'ws://192.168.192.10:8080/ws'

// 移除末尾斜杠
const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '')

// 确保路径以 / 开头
const ensureLeadingSlash = (value = '') => {
	return value.startsWith('/') ? value : `/${value}`
}

// 判断是否为绝对 URL（http/https/ws/wss）
const isAbsoluteUrl = (value = '') => /^(https?|wss?):\/\//i.test(value)

// 判断当前是否运行在 H5 开发代理模式下
const isH5DevProxy = () => {
	return typeof window !== 'undefined' && window.location?.port === DEV_PROXY_PORT
}

// 从环境变量读取 HTTP base URL，回退到默认值
const getConfiguredHttpBaseUrl = () => {
	const envBaseUrl = typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL.trim() : ''
	return trimTrailingSlash(envBaseUrl || DEFAULT_HTTP_BASE_URL)
}

// 从环境变量读取 WS URL；未配置时由 HTTP base URL 推导
const getConfiguredWsUrl = () => {
	const envWsUrl = typeof env.VITE_WS_URL === 'string' ? env.VITE_WS_URL.trim() : ''
	if (envWsUrl) return envWsUrl

	const httpBaseUrl = getConfiguredHttpBaseUrl()
	if (!/^https?:\/\//i.test(httpBaseUrl)) return DEFAULT_WS_URL

	return `${httpBaseUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')}/ws`
}

// H5 开发代理时使用 /api 前缀，否则使用完整 base URL
export const getHttpBaseUrl = () => {
	return isH5DevProxy() ? '/api' : getConfiguredHttpBaseUrl()
}

// 拼接完整请求 URL；绝对 URL 直接返回
export const buildRequestUrl = (path = '') => {
	if (isAbsoluteUrl(path)) return path

	const normalizedPath = ensureLeadingSlash(path)
	const baseUrl = getHttpBaseUrl()

	return baseUrl === '/api'
		? `${baseUrl}${normalizedPath}`
		: `${trimTrailingSlash(baseUrl)}${normalizedPath}`
}

// 获取 WebSocket 连接地址；开发代理时使用当前页面 host
export const getWsUrl = () => {
	if (isH5DevProxy() && typeof window !== 'undefined' && window.location?.host) {
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
		return `${protocol}://${window.location.host}/ws`
	}

	return getConfiguredWsUrl()
}
