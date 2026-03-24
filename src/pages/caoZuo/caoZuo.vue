<template>
	<view class="page-container">
		<!-- 1. 一键分合闸操作区域 -->
		<view class="operation-section">
			<view class="section-header">
				<image class="section-icon" src="/static/tabbar/caoZuo-two.png" mode="aspectFit"
					style="width: 40rpx; height: 35rpx;"></image>
				<text class="section-title">一键分合闸操作</text>
			</view>

			<view class="operation-buttons">
				<view class="op-btn"
					:style="{ backgroundColor: isActionDisabled('close') ? '#A8A8A8' : '#429426', opacity: operating ? 0.7 : 1 }"
					@click="handleGlobalAction('close')">
					<image class="button-icon"
						:src="isActionDisabled('close') ? '/static/image/he.png' : '/static/image/he-active.png'" mode="aspectFit">
					</image>
					<text class="button-text" :style="{ color: isActionDisabled('close') ? '#213547' : '#ffffff' }">
						一键合闸
					</text>
				</view>

				<view class="op-btn"
					:style="{ backgroundColor: isActionDisabled('open') ? '#A8A8A8' : '#ff0000', opacity: operating ? 0.7 : 1 }"
					@click="handleGlobalAction('open')">
					<image class="button-icon"
						:src="isActionDisabled('open') ? '/static/image/fen-active.png' : '/static/image/fen.png'"
						mode="aspectFit"></image>
					<text class="button-text" :style="{ color: isActionDisabled('open') ? '#213547' : '#ffffff' }">
						一键分闸
					</text>
				</view>
			</view>
		</view>

		<!-- 2. 电箱分合闸状态列表 -->
		<view class="status-section">
			<view class="section-header">
				<image class="section-icon" src="/static/image/dian.png" mode="aspectFit"
					style="width: 40rpx; height: 40rpx;"></image>
				<text class="section-title">电箱分合闸状态列表</text>
			</view>

			<!-- 状态选择标签 -->
			<view class="status-tabs">
				<uni-segmented-control :current="current" :values="items" @clickItem="onClickItem" styleType="button"
					activeColor="#24D8C9" inActiveColor="#ffffff"></uni-segmented-control>
			</view>

			<view class="content-box">
				<view v-if="showInitialLoading" class="empty-box">
					<view class="empty-tip">加载中...</view>
				</view>
				<view v-else-if="tableData.length > 0">
					<!-- 表格头部 -->
					<view class="table-header">
						<view class="table-cell checkbox-cell">
							<checkbox-group @change="handleCheckAll">
								<checkbox :checked="remember" color="#1aa094" style="transform:scale(0.8)" />
							</checkbox-group>
						</view>
						<view class="table-cell">位置</view>
						<view class="table-cell">名称</view>
						<view class="table-cell">状态</view>
					</view>

					<!-- 表格内容 -->
					<view class="table-body">
						<view class="table-row" v-for="(item, index) in tableData" :key="getDeviceKey(item)">
							<view class="table-cell checkbox-cell">
								<checkbox-group @change="handleCheckSingle(index)">
									<checkbox :checked="item.checked" color="#1aa094" style="transform:scale(0.8)" />
								</checkbox-group>
							</view>
							<view class="table-cell">{{ item.location }}</view>
							<view class="table-cell">{{ item.name }}</view>
							<view class="table-cell" :style="{color: getStatusColor(item.status)}">
								{{ item.status }}
							</view>
						</view>
					</view>

					<!-- 底部提示 -->
					<view class="footer-tip">
						已选中 {{ selectedCount }} 个设备
					</view>
				</view>

				<view v-else class="empty-box">
					<view class="empty-tip">暂无可操作设备</view>
				</view>

				<view v-if="!showInitialLoading && statusSyncErrorCount > 0" class="footer-tip">
					另有 {{ statusSyncErrorCount }} 个设备状态获取失败
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { ref, computed } from 'vue';
	import { onShow, onHide } from '@dcloudio/uni-app';
	import { getBreakerState, getBreakerStateText } from '../../utils/breakerCodes.js';
	import { createWsManager } from '../../utils/ws.js';
	import { getDeviceList, getDeviceData, sendDeviceControl } from '../../api/device.js';
	const items = ref(['分闸选择', '合闸选择']);
	const current = ref(0);
	const loading = ref(false);
	const refreshing = ref(false);
	const operating = ref(false);
	const remember = ref(false);
	const tableData = ref([]);
	const allBreakerDevices = ref([]);
	const statusSyncErrorCount = ref(0);

	const actionTextMap = {
		close: '合闸',
		open: '分闸'
	};
	let statusRefreshTimer = null;
	const pendingStateMap = ref({});
	// WS snapshots 可能在 loadBreakerDevices 完成前到达，先缓存，加载完后统一刷新。
	const wsStateBuffer = {};

	const getTargetStateByTab = (tabIndex) => {
		return tabIndex === 0 ? 'closed' : 'opened';
	};

	const getTargetStateByAction = (actionType) => {
		return actionType === 'close' ? 'closed' : 'opened';
	};

	const buildLocation = (device) => {
		if (device.location) return device.location;
		const parts = [device.building, device.room].filter(Boolean);
		return parts.length > 0 ? parts.join(' - ') : '-';
	};

	const getDeviceKey = (device) => {
		return `${device.building || ''}::${device.room || ''}::${device.gateway || ''}`;
	};

	const setPendingState = (devices, targetState) => {
		if (!devices || devices.length === 0) return;
		const expireAt = Date.now() + 8000;
		const nextPendingStateMap = { ...pendingStateMap.value };
		devices.forEach(device => {
			nextPendingStateMap[getDeviceKey(device)] = {
				targetState,
				expireAt
			};
		});
		pendingStateMap.value = nextPendingStateMap;
	};

	const clearPendingState = (deviceKeys) => {
		if (!deviceKeys || deviceKeys.length === 0) return;
		const nextPendingStateMap = { ...pendingStateMap.value };
		deviceKeys.forEach(deviceKey => {
			delete nextPendingStateMap[deviceKey];
		});
		pendingStateMap.value = nextPendingStateMap;
	};

	const pruneExpiredPendingState = () => {
		const now = Date.now();
		const nextPendingStateMap = { ...pendingStateMap.value };
		let changed = false;
		Object.keys(nextPendingStateMap).forEach(deviceKey => {
			if (nextPendingStateMap[deviceKey].expireAt <= now) {
				delete nextPendingStateMap[deviceKey];
				changed = true;
			}
		});
		if (changed) {
			pendingStateMap.value = nextPendingStateMap;
		}
	};

	const resolveStateWithPending = (device, actualState) => {
		const pendingState = pendingStateMap.value[getDeviceKey(device)];
		if (!pendingState) return actualState;

		if (pendingState.targetState === actualState) {
			clearPendingState([getDeviceKey(device)]);
			return actualState;
		}

		if (pendingState.expireAt <= Date.now()) {
			clearPendingState([getDeviceKey(device)]);
			return actualState;
		}

		return pendingState.targetState;
	};

	const syncTableData = ({ preserveChecked = false } = {}) => {
		// “分闸选择”页展示当前已合闸的设备，“合闸选择”页展示当前已分闸的设备。
		const targetState = getTargetStateByTab(current.value);
		// 鍚庡彴闈欓粯鍒锋柊鏃朵繚鐣欏綋鍓嶅凡鍕鹃€夌殑璁惧锛岄伩鍏嶇敤鎴峰垰鍕鹃€夊氨琚噸缃€?
		const checkedDeviceKeys = preserveChecked ? new Set(
			tableData.value
				.filter(item => item.checked)
				.map(getDeviceKey)
		) : new Set();
		tableData.value = allBreakerDevices.value
			.filter(item => item.state === targetState)
			.map(item => ({
				...item,
				checked: preserveChecked && checkedDeviceKeys.has(getDeviceKey(item))
			}));
		remember.value = tableData.value.length > 0 && tableData.value.every(item => item.checked);
	};

	const showInitialLoading = computed(() => {
		return loading.value && tableData.value.length === 0;
	});

	const fetchBreakerList = async () => {
		const devices = await getDeviceList();
		if (!Array.isArray(devices)) return [];
		return devices.filter(device => device.device_type === 'breaker');
	};

	const fetchBreakerRuntime = async (device) => {
		const runtimeData = await getDeviceData(device.building, device.room, device.gateway);
		const state = resolveStateWithPending(device, getBreakerState(runtimeData?.breaker_work));
		return {
			...device,
			location: buildLocation(device),
			name: device.name || device.gateway || '-',
			state,
			status: getBreakerStateText(state),
			checked: false
		};
	};

	const applyRuntimeStateToDevice = (device, breakerWork) => {
		const state = resolveStateWithPending(device, getBreakerState(breakerWork));
		return {
			...device,
			state,
			status: getBreakerStateText(state)
		};
	};

	const syncDeviceStateFromSocket = (gateway, breakerWork) => {
		if (breakerWork === undefined || breakerWork === null) return;
		// 设备列表还没加载完时先缓存，加载完后统一刷新。
		if (allBreakerDevices.value.length === 0) {
			wsStateBuffer[gateway] = breakerWork;
			return;
		}
		let changed = false;
		allBreakerDevices.value = allBreakerDevices.value.map(device => {
			if (device.gateway !== gateway) return device;
			changed = true;
			return applyRuntimeStateToDevice(device, breakerWork);
		});
		if (changed) {
			syncTableData({ preserveChecked: true });
		}
	};

	const flushWsStateBuffer = () => {
		const gateways = Object.keys(wsStateBuffer);
		if (gateways.length === 0) return;
		let changed = false;
		allBreakerDevices.value = allBreakerDevices.value.map(device => {
			const bufferedWork = wsStateBuffer[device.gateway];
			if (bufferedWork === undefined) return device;
			changed = true;
			return applyRuntimeStateToDevice(device, bufferedWork);
		});
		gateways.forEach(g => delete wsStateBuffer[g]);
		if (changed) {
			syncTableData({ preserveChecked: false });
		}
	};

	const loadBreakerDevices = async ({ silent = false, keepSelection = false } = {}) => {
		if (loading.value || refreshing.value) return;
		if (silent) {
			refreshing.value = true;
		} else {
			loading.value = true;
		}
		statusSyncErrorCount.value = 0;
		pruneExpiredPendingState();
		try {
			// 先拉设备清单，再逐个补实时状态；没有批量状态接口时这是最小兼容方案。
			const breakers = await fetchBreakerList();
			const results = await Promise.allSettled(breakers.map(fetchBreakerRuntime));
			allBreakerDevices.value = results
				.filter(result => result.status === 'fulfilled')
				.map(result => result.value);
			statusSyncErrorCount.value = results.filter(result => result.status === 'rejected').length;
			// WS snapshot 可能在 HTTP 请求期间已到达，用实时值覆盖可能过期的 /data 结果。
			flushWsStateBuffer();
			syncTableData({ preserveChecked: keepSelection });
		} catch (err) {
			allBreakerDevices.value = [];
			syncTableData();
			uni.showToast({
				title: '获取设备列表失败',
				icon: 'none'
			});
		} finally {
			if (silent) {
				refreshing.value = false;
			} else {
				loading.value = false;
			}
		}
	};

	const applySuccessfulActionResult = (actionType, successfulItems) => {
		if (!successfulItems || successfulItems.length === 0) return;
		const targetState = getTargetStateByAction(actionType);
		const nextStatus = getBreakerStateText(targetState);
		const successfulKeys = new Set(successfulItems.map(getDeviceKey));

		setPendingState(successfulItems, targetState);
		allBreakerDevices.value = allBreakerDevices.value.map(item => {
			if (!successfulKeys.has(getDeviceKey(item))) return item;
			return {
				...item,
				state: targetState,
				status: nextStatus,
				checked: false
			};
		});
		syncTableData();
	};

	const wsManager = createWsManager({
		onMessage: (res) => {
			try {
				const message = JSON.parse(res.data);
				if (!message.gateway) return;
				if (message.type === 'snapshot' && message.data?.breaker_work !== undefined) {
					syncDeviceStateFromSocket(message.gateway, message.data.breaker_work);
					return;
				}
				if (message.type === 'update' && message.fields?.breaker_work !== undefined) {
					syncDeviceStateFromSocket(message.gateway, message.fields.breaker_work);
				}
			} catch (err) {}
		}
	});
	const connectWS = () => wsManager.connect();
	const closeWS = () => wsManager.close();

	const scheduleStatusRefresh = () => {
		if (statusRefreshTimer) {
			clearTimeout(statusRefreshTimer);
		}
		// 控制接口返回后设备状态落库会有短暂延迟，延后再拉一次做最终对齐。
		statusRefreshTimer = setTimeout(async () => {
			statusRefreshTimer = null;
			await loadBreakerDevices({
				silent: true,
				keepSelection: true
			});
			if (Object.keys(pendingStateMap.value).length > 0) {
				scheduleStatusRefresh();
			}
		}, 1000);
	};

	const selectedCount = computed(() => tableData.value.filter(item => item.checked).length);

	const onClickItem = (e) => {
		if (current.value !== e.currentIndex) {
			current.value = e.currentIndex;
			syncTableData();
		}
	};

	const handleCheckAll = () => {
		if (loading.value || operating.value || tableData.value.length === 0) return;
		const nextChecked = !remember.value;
		remember.value = nextChecked;
		tableData.value = tableData.value.map(item => ({
			...item,
			checked: nextChecked
		}));
	};

	const handleCheckSingle = (index) => {
		if (loading.value || operating.value || !tableData.value[index]) return;
		tableData.value = tableData.value.map((item, itemIndex) => {
			if (itemIndex !== index) return item;
			return {
				...item,
				checked: !item.checked
			};
		});
		remember.value = tableData.value.length > 0 && tableData.value.every(item => item.checked);
	};

	const getStatusColor = (status) => {
		if (status === '合闸') return '#1aa094';
		if (status === '分闸') return '#ff0000';
		return '#FF9800';
	};

	const isActionDisabled = (actionType) => {
		if (loading.value || operating.value) return true;
		if (actionType === 'close') return current.value !== 1;
		if (actionType === 'open') return current.value !== 0;
		return true;
	};

	const sendControl = (device, action) => {
		return sendDeviceControl(device.building, device.room, device.gateway, action);
	};

	const performGlobalAction = async (actionType, selectedItems) => {
		// 当前项目只有单设备控制接口，因此批量操作通过前端并发下发并汇总结果。
		const results = await Promise.allSettled(
			selectedItems.map(item => sendControl(item, actionType))
		);
		const successfulItems = [];
		const failedItems = [];
		results.forEach((result, i) => {
			if (result.status === 'fulfilled') {
				successfulItems.push(selectedItems[i]);
			} else {
				failedItems.push(selectedItems[i].name || selectedItems[i].gateway || '未知设备');
			}
		});
		return {
			successCount: successfulItems.length,
			failureCount: failedItems.length,
			failedItems,
			successfulItems
		};
	};

	const handleGlobalAction = (actionType) => {
		if (isActionDisabled(actionType)) return;

		const selectedItems = tableData.value.filter(item => item.checked);
		if (selectedItems.length === 0) {
			uni.showToast({
				title: '请选择电箱',
				icon: 'none'
			});
			return;
		}

		uni.showModal({
			title: '注意！',
			content: `确定要进行${actionTextMap[actionType]}操作吗？`,
			confirmText: '确定',
			cancelText: '取消',
			success: async (res) => {
				if (!res.confirm) return;
				operating.value = true;
				try {
					const result = await performGlobalAction(actionType, selectedItems);
					applySuccessfulActionResult(actionType, result.successfulItems);
					scheduleStatusRefresh();
					if (result.failureCount === 0) {
						uni.showToast({
							title: `已${actionTextMap[actionType]} ${result.successCount} 个设备`,
							icon: 'success'
						});
						return;
					}

					uni.showModal({
						title: '操作完成',
						content: `成功 ${result.successCount} 个，失败 ${result.failureCount} 个`,
						showCancel: false
					});
				} finally {
					operating.value = false;
				}
			}
		});
	};

	onShow(() => {
		connectWS();
		// tab 页返回时重新同步一次，避免列表状态停留在旧快照。
		loadBreakerDevices({ silent: tableData.value.length > 0 });
	});

	onHide(() => {
		closeWS();
	});
</script>

<style lang="scss" scoped>
	.page-container {
		min-height: 100vh;
		background-color: #f5f7fa;
		padding: 20rpx;
	}

	/* 头部通用 */
	.section-header {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;

		.section-title {
			font-size: 26rpx;
			font-weight: bold;
			color: #333;
			margin-left: 10rpx;
		}
	}

	/* 1. 操作区域 */
	.operation-section {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}

	.operation-buttons {
		display: flex;
		justify-content: space-between;
		margin-top: 20rpx;
	}

	.op-btn {
		flex: 1;
		height: 100rpx;
		border-radius: 12rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin: 0 12rpx;
		transition: all 0.2s;
		/* 边框稍微浅一点 */
		border: 1px solid rgba(0, 0, 0, 0.05);
		padding: 10rpx;

		.button-icon {
			width: 52rpx;
			height: 52rpx;
			margin-bottom: 12rpx;
		}

		.button-text {
			font-size: 26rpx;
		}
	}

	/* 2. 状态列表区域 */
	.status-section {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		min-height: 400rpx;
	}

	.status-tabs {
		margin-bottom: 30rpx;
	}

	/* 表格样式 */
	.table-header {
		display: flex;
		background-color: #f2f4f6;
		padding: 20rpx 0;
		border-radius: 8rpx 8rpx 0 0;
		font-size: 26rpx;
		color: #666;
		font-weight: bold;
	}

	.table-row {
		display: flex;
		padding: 24rpx 0;
		border-bottom: 1px solid #f0f0f0;
		align-items: center;
		font-size: 26rpx;
		color: #333;
	}

	.table-cell {
		flex: 1;
		text-align: center;

		&.checkbox-cell {
			flex: 0.6;
			display: flex;
			justify-content: center;
			align-items: center;
		}
	}

	.empty-box {
		padding-top: 60rpx;
		text-align: center;
	}

	.empty-tip {
		color: #999;
		font-size: 26rpx;
	}

	.footer-tip {
		text-align: right;
		font-size: 24rpx;
		color: #999;
		margin-top: 24rpx;
	}
</style>
