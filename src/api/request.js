const BASE_URL = '/api'

export const request = ({ url, method = 'GET', data, header }) => {
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${BASE_URL}${url}`,
			method,
			data,
			header,
			success: (res) => {
				if (res.statusCode === 200) {
					resolve(res.data)
				} else {
					reject(res.data || res)
				}
			},
			fail: (err) => reject(err)
		})
	})
}
