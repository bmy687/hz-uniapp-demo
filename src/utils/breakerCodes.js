// 断路器 breaker_work 状态码分组
export const closedCodes = new Set([4, 5, 6, 11, 14, 16])
export const openedCodes = new Set([0, 1, 2, 10, 13, 15])
export const abnormalCodes = new Set([7, 8, 9])

// 状态码 → 中文描述
export const breakerStatusMap = {
	0: '手动合闸', 1: '命令合闸', 2: '漏电合闸', 3: '保留',
	4: '手动分闸', 5: '命令分闸', 6: '自动分闸', 7: '命令锁死(需解锁)',
	8: '漏电锁死(需解锁)', 9: '机械故障', 10: '定时合闸', 11: '定时分闸',
	12: '保留', 13: '干接点合闸', 14: '干接点分闸', 15: '手动模式合闸', 16: '手动模式分闸'
}

export const normalizeBreakerCode = (code) => {
	if (code === undefined || code === null || code === '') return null
	const normalized = Number(code)
	return Number.isNaN(normalized) ? code : normalized
}

export const getBreakerState = (code) => {
	const normalizedCode = normalizeBreakerCode(code)
	if (normalizedCode === null) return 'unknown'
	if (closedCodes.has(normalizedCode)) return 'closed'
	if (openedCodes.has(normalizedCode)) return 'opened'
	if (abnormalCodes.has(normalizedCode)) return 'abnormal'
	return 'unknown'
}

export const getBreakerStateText = (state) => {
	if (state === 'closed') return '合闸'
	if (state === 'opened') return '分闸'
	if (state === 'abnormal') return '异常'
	return '未知'
}

export const getBreakerStateColor = (state) => {
	if (state === 'closed') return '#2B9939'
	if (state === 'opened') return '#FF9800'
	if (state === 'abnormal') return '#F44336'
	return '#999'
}
