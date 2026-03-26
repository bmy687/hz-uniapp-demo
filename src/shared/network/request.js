import { buildRequestUrl } from '../config/network.js'

const DEFAULT_TIMEOUT = 10000

// 判断 HTTP 状态码是否为成功（2xx）
export const isSuccessStatus = (statusCode) => {
	return statusCode >= 200 && statusCode < 300
}

// 统一格式化请求错误对象，确保包含 error 字段
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

/**
 * 封装 uni.request，返回 Promise。
 * promise 上挂载 abort() 方法，可主动取消请求。
 */
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

	// 支持外部主动中止请求
	promise.abort = () => {
		try {
			requestTask?.abort?.()
		} catch (e) {}
	}

	return promise
}
