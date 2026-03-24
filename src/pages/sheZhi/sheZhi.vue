<template>
	<view class="container">
		<view class="content">

			<!-- 第一部分：设置区域 -->
			<view class="card">
				<view class="section-title">
					<text class="icon">🔧</text>
					<text class="title-text">自动分合闸设置</text>
				</view>

				<view class="sub-title">
					<text class="icon link-icon">🔗</text>
					<text>分合闸设置:</text>
				</view>

				<!-- 表单输入网格 -->
				<view class="form-grid">
					<view class="form-item">
						<text class="label">开始日期</text>
						<picker mode="date" :value="formData.startDate"
							@change="bindDateChange($event, 'startDate')">
							<view class="input-box">
								<text v-if="formData.startDate">{{formData.startDate}}</text>
								<text v-else class="placeholder">请选择</text>
								<text class="input-icon">📅</text>
							</view>
						</picker>
					</view>

					<view class="form-item">
						<text class="label">结束日期</text>
						<picker mode="date" :value="formData.endDate" @change="bindDateChange($event, 'endDate')">
							<view class="input-box">
								<text v-if="formData.endDate">{{formData.endDate}}</text>
								<text v-else class="placeholder">请选择</text>
								<text class="input-icon">📅</text>
							</view>
						</picker>
					</view>

					<view class="form-item">
						<text class="label">合闸时间</text>
						<picker mode="time" :value="formData.closeTime"
							@change="bindTimeChange($event, 'closeTime')">
							<view class="input-box">
								<text v-if="formData.closeTime">{{formData.closeTime}}</text>
								<text v-else class="placeholder">请选择</text>
								<text class="input-icon">🕒</text>
							</view>
						</picker>
					</view>

					<view class="form-item">
						<text class="label">分闸时间</text>
						<picker mode="time" :value="formData.openTime" @change="bindTimeChange($event, 'openTime')">
							<view class="input-box">
								<text v-if="formData.openTime">{{formData.openTime}}</text>
								<text v-else class="placeholder">请选择</text>
								<text class="input-icon">🕒</text>
							</view>
						</picker>
					</view>

					<template v-if="timeLevel >= 2">
						<view class="form-item">
							<text class="label">二次合闸</text>
							<picker mode="time" :value="formData.closeTime2"
								@change="bindTimeChange($event, 'closeTime2')">
								<view class="input-box">
									<text v-if="formData.closeTime2">{{formData.closeTime2}}</text>
									<text v-else class="placeholder">请选择</text>
									<text class="input-icon">🕒</text>
								</view>
							</picker>
						</view>

						<view class="form-item">
							<text class="label">二次分闸</text>
							<picker mode="time" :value="formData.openTime2" @change="bindTimeChange($event, 'openTime2')">
								<view class="input-box">
									<text v-if="formData.openTime2">{{formData.openTime2}}</text>
									<text v-else class="placeholder">请选择</text>
									<text class="input-icon">🕒</text>
								</view>
							</picker>
						</view>
					</template>

					<template v-if="timeLevel >= 3">
						<view class="form-item">
							<text class="label">三次合闸</text>
							<picker mode="time" :value="formData.closeTime3"
								@change="bindTimeChange($event, 'closeTime3')">
								<view class="input-box">
									<text v-if="formData.closeTime3">{{formData.closeTime3}}</text>
									<text v-else class="placeholder">请选择</text>
									<text class="input-icon">🕒</text>
								</view>
							</picker>
						</view>

						<view class="form-item">
							<text class="label">三次分闸</text>
							<picker mode="time" :value="formData.openTime3" @change="bindTimeChange($event, 'openTime3')">
								<view class="input-box">
									<text v-if="formData.openTime3">{{formData.openTime3}}</text>
									<text v-else class="placeholder">请选择</text>
									<text class="input-icon">🕒</text>
								</view>
							</picker>
						</view>
					</template>
				</view>

				<!-- 加减层级按钮 -->
				<view class="action-row">
					<text v-if="timeLevel < 3" class="action-icon plus" @click="addLevel">＋</text>
					<text v-if="timeLevel > 1" class="action-icon minus" @click="removeLevel">－</text>
				</view>

				<!-- 按钮组 -->
				<view class="btn-group">
					<button class="btn btn-cancel" @click="resetForm">取消设置</button>
					<button class="btn btn-confirm" @click="submitForm">设置</button>
				</view>
			</view>

			<!-- 第二部分：列表区域 -->
			<view class="card">
				<view class="section-title">
					<text class="icon">🗃️</text>
					<text class="title-text">自动分合闸设置列表</text>
				</view>

				<!-- 全选行 -->
				<view class="list-check-all" @click="handleCheckAll">
					<checkbox :checked="remember" color="#1aa094" style="transform:scale(0.8)" />
					<text class="check-all-text">全选</text>
				</view>

				<!-- 卡片列表 -->
				<view class="list-item" v-for="(item, index) in listData" :key="item.id"
					@click="() => handleCheckSingle(index)">
					<checkbox :checked="item.checked" color="#1aa094" style="transform:scale(0.8)" />
					<view class="list-item-content">
						<view class="list-item-header">
							<text class="list-item-location">📍 {{ item.location }}</text>
							<text class="list-item-badge" :class="item.checked ? 'badge-active' : 'badge-default'">
								{{ item.checked ? '已选' : '未选' }}
							</text>
						</view>
						<view class="list-item-detail">
							<text class="tag tag-close">合闸</text>
							<text class="detail-text">{{ item.closeRange }}</text>
						</view>
						<view class="list-item-detail">
							<text class="tag tag-open">分闸</text>
							<text class="detail-text">{{ item.openRange }}</text>
						</view>
					</view>
				</view>

				<view v-if="listData.length === 0" class="list-empty">
					<text>暂无设置记录</text>
				</view>
			</view>

		</view>
	</view>
</template>

<script setup>
	import { ref } from 'vue';
	const remember = ref(false)
	// 1. 表单数据
	const formData = ref({
		startDate: '',
		endDate: '',
		closeTime: '', // 一次
		openTime: '',
		closeTime2: '', // 二次
		openTime2: '',
		closeTime3: '', // 三次
		openTime3: ''
	});
	
	// 2. 状态控制：当前显示几组时间 (1, 2, 3)
	const timeLevel = ref(1);

	const listData = ref([{
		id: '1',
		location: '笃行楼305',
		closeRange: '2024.10.03-2024.10.04 15:56 19:57',
		openRange: '2024.10.03-2024.10.04 17:55 20:58',
		checked: false 
	}]);

	const bindDateChange = (e, key) => {
		formData.value[key] = e.detail.value;
	};

	const bindTimeChange = (e, key) => {
		formData.value[key] = e.detail.value;
	};
	
	const handleCheckAll = () => {
		remember.value = !remember.value; // 切换全选状态
		// 给 listData 中所有项的 checked 赋值（与全选状态一致）
		listData.value.forEach(item => {
			item.checked = remember.value;
		});
	};
	
	const handleCheckSingle = (index) => {
		// 切换当前行的 checked 状态（取反）
		listData.value[index].checked = !listData.value[index].checked;
		// 同步全选按钮状态：所有行都选中时，全选才勾选
		remember.value = listData.value.every(item => item.checked);
	};
	
	
	// === 新增逻辑：添加层级 ===
	const addLevel = () => {
		if (timeLevel.value < 3) {
			timeLevel.value++;
		}
	};
	
	// === 新增逻辑：减少层级 ===
	const removeLevel = () => {
		if (timeLevel.value > 1) {
			// 清空对应层级的数据，保持数据干净
			if (timeLevel.value === 3) {
				formData.value.closeTime3 = '';
				formData.value.openTime3 = '';
			} else if (timeLevel.value === 2) {
				formData.value.closeTime2 = '';
				formData.value.openTime2 = '';
			}
			timeLevel.value--;
		}
	};

	const resetForm = () => {
		uni.showModal({
			title: "提示",
			content: "是否取消当前设置！",
			success: res => {
				if (res.confirm) {
					formData.value = {
						startDate: '',
						endDate: '',
						closeTime: '',
						openTime: '',
						closeTime2: '',
						openTime2: '',
						closeTime3: '',
						openTime3: ''
					};
					// 重置时恢复到只有一级
					timeLevel.value = 1; 
				}
			}
		})
	};

	const submitForm = () => {
		uni.showToast({
			title: '设置已保存',
			icon: 'success'
		});
	};
</script>

<style lang="scss">
	page {
		background-color: #f5f7fa;
		font-size: 28rpx;
		color: #333;
	}
</style>

<style lang="scss" scoped>
	.container {
		min-height: 100vh;
	}

	.content {
		padding: 20rpx;
	}

	/* 卡片容器 */
	.card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}

	.icon {
		margin-right: 10rpx;
		font-size: 30rpx;
	}

	.section-title {
		font-size: 28rpx;
		font-weight: bold;
		margin-bottom: 24rpx;
		display: flex;
		align-items: center;

		.title-text {
			color: #333;
		}
	}

	.sub-title {
		font-size: 24rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		display: flex;
		align-items: center;
		color: #555;

		.link-icon {
			font-size: 22rpx;
		}
	}

	/* 表单网格 */
	.form-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx 4%;
	}

	.form-item {
		width: 48%;
		display: flex;
		flex-direction: column;

		.label {
			font-size: 24rpx;
			color: #666;
			margin-bottom: 8rpx;
		}

		picker {
			width: 100%;
		}
	}

	.input-box {
		border: 1rpx solid #ddd;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16rpx;
		background-color: #f9f9f9;
		border-radius: 8rpx;
		font-size: 24rpx;
		color: #333;

		.placeholder {
			color: #bbb;
			font-size: 22rpx;
		}

		.input-icon {
			font-size: 24rpx;
			flex-shrink: 0;
			margin-left: 8rpx;
		}
	}

	/* 加减按钮行 */
	.action-row {
		display: flex;
		gap: 30rpx;
		margin-top: 10rpx;
		margin-bottom: 10rpx;
	}

	.action-icon {
		width: 52rpx;
		height: 52rpx;
		line-height: 48rpx;
		text-align: center;
		border-radius: 50%;
		font-size: 32rpx;
		font-weight: bold;
		color: #fff;
		background-color: #26C6DA;
	}

	.action-icon.minus {
		background-color: #FF7043;
	}

	/* 按钮组 */
	.btn-group {
		display: flex;
		gap: 24rpx;
		margin-top: 30rpx;

		.btn {
			flex: 1;
			height: 76rpx;
			line-height: 76rpx;
			font-size: 26rpx;
			border-radius: 10rpx;
			border: none;
			color: #fff;

			&::after {
				border: none;
			}
		}

		.btn-cancel {
			background-color: #B0BEC5;
		}

		.btn-confirm {
			background-color: #26C6DA;
		}
	}

	/* 全选行 */
	.list-check-all {
		display: flex;
		align-items: center;
		padding: 16rpx 0;
		border-bottom: 1rpx solid #f0f0f0;

		.check-all-text {
			font-size: 24rpx;
			color: #666;
			margin-left: 12rpx;
		}
	}

	/* 列表项 */
	.list-item {
		display: flex;
		align-items: flex-start;
		padding: 20rpx 16rpx;
		margin-bottom: 16rpx;
		background: linear-gradient(135deg, #f8fffe 0%, #f0faf8 100%);
		border-radius: 12rpx;
		border-left: 6rpx solid #26C6DA;
		transition: background 0.2s;
	}

	.list-item-content {
		flex: 1;
		margin-left: 12rpx;
	}

	.list-item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12rpx;
	}

	.list-item-location {
		font-size: 26rpx;
		color: #333;
		font-weight: 600;
	}

	.list-item-badge {
		font-size: 20rpx;
		padding: 4rpx 14rpx;
		border-radius: 20rpx;
		flex-shrink: 0;
	}

	.badge-default {
		background-color: #e8e8e8;
		color: #999;
	}

	.badge-active {
		background-color: #e0f7fa;
		color: #00838f;
	}

	.list-item-detail {
		display: flex;
		align-items: center;
		margin-bottom: 8rpx;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.tag {
		font-size: 20rpx;
		padding: 2rpx 12rpx;
		border-radius: 6rpx;
		margin-right: 12rpx;
		flex-shrink: 0;
		font-weight: 500;
	}

	.tag-close {
		background-color: #e8f5e9;
		color: #2e7d32;
	}

	.tag-open {
		background-color: #fbe9e7;
		color: #d84315;
	}

	.detail-text {
		font-size: 22rpx;
		color: #666;
		line-height: 1.6;
	}

	.list-empty {
		text-align: center;
		padding: 60rpx 0;
		color: #999;
		font-size: 26rpx;
	}
</style>