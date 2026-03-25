const env = import.meta.env || {}

const DEV_PROXY_PORT = '5174'
const DEFAULT_HTTP_BASE_URL = 'http://192.168.192.10:8080'
const DEFAULT_WS_URL = 'ws://192.168.192.10:8080/ws'

const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '')

const ensureLeadingSlash = (value = '') => {
	return value.startsWith('/') ? value : `/${value}`
}

const isAbsoluteUrl = (value = '') => /^(https?|wss?):\/\//i.test(value)

const isH5DevProxy = () => {
	return typeof window !== 'undefined' && window.location?.port === DEV_PROXY_PORT
}

const getConfiguredHttpBaseUrl = () => {
	const envBaseUrl = typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL.trim() : ''
	return trimTrailingSlash(envBaseUrl || DEFAULT_HTTP_BASE_URL)
}

const getConfiguredWsUrl = () => {
	const envWsUrl = typeof env.VITE_WS_URL === 'string' ? env.VITE_WS_URL.trim() : ''
	if (envWsUrl) return envWsUrl

	const httpBaseUrl = getConfiguredHttpBaseUrl()
	if (!/^https?:\/\//i.test(httpBaseUrl)) return DEFAULT_WS_URL

	return `${httpBaseUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')}/ws`
}

export const getHttpBaseUrl = () => {
	return isH5DevProxy() ? '/api' : getConfiguredHttpBaseUrl()
}

export const buildRequestUrl = (path = '') => {
	if (isAbsoluteUrl(path)) return path

	const normalizedPath = ensureLeadingSlash(path)
	const baseUrl = getHttpBaseUrl()

	return baseUrl === '/api'
		? `${baseUrl}${normalizedPath}`
		: `${trimTrailingSlash(baseUrl)}${normalizedPath}`
}

export const getWsUrl = () => {
	if (isH5DevProxy() && typeof window !== 'undefined' && window.location?.host) {
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
		return `${protocol}://${window.location.host}/ws`
	}

	return getConfiguredWsUrl()
}
