import { buildRequestUrl } from '../config/network.js'

const DEFAULT_TIMEOUT = 10000

export const isSuccessStatus = (statusCode) => {
	return statusCode >= 200 && statusCode < 300
}

const normalizeRequestError = (payload, fallbackError) => {
	if (payload && typeof payload === 'object') {
		return {
			...payload,
			error: payload.error || payload.message || payload.errMsg || fallbackError
		}
	}

	return {
		error: fallbackError,
		detail: payload
	}
}

export const request = ({ url, method = 'GET', data, header, timeout = DEFAULT_TIMEOUT }) => {
	let requestTask = null

	const promise = new Promise((resolve, reject) => {
		requestTask = uni.request({
			url: buildRequestUrl(url),
			method,
			data,
			header,
			timeout,
			success: (res) => {
				if (isSuccessStatus(res.statusCode)) {
					resolve(res.data)
				} else {
					reject(normalizeRequestError(res.data || res, `请求失败(${res.statusCode})`))
				}
			},
			fail: (err) => reject(normalizeRequestError(err, err?.errMsg || '网络请求失败'))
		})
	})

	promise.abort = () => {
		try {
			requestTask?.abort?.()
		} catch (e) {}
	}

	return promise
}
