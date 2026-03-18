<template>
	<view class="container">
		<!-- 内容区域 -->
		<view class="content">

			<!-- 第一部分：设置区域 -->
			<view class="section">
				<view class="section-title">
					<text class="icon">🔧</text>
					<text class="title-text" style="font-size: 26rpx;">自动分合闸设置</text>
				</view>

				<view class="sub-section">
					<view class="sub-title">
						<text class="icon link-icon">🔗</text>
						<text style="font-size: 24rpx;">分合闸设置:</text>
					</view>

					<!-- 表单输入网格 -->
					<view class="form-grid">
						<!-- === 固定显示：日期部分 === -->
						<view class="form-item">
							<text class="label">开始日期:</text>
							<picker mode="date" :value="formData.startDate"
								@change="bindDateChange($event, 'startDate')">
								<view class="input-box">
									<text v-if="formData.startDate">{{formData.startDate}}</text>
									<text v-else class="placeholder"></text>
									<text class="input-icon">📅</text>
								</view>
							</picker>
						</view>

						<view class="form-item">
							<text class="label">结束日期:</text>
							<picker mode="date" :value="formData.endDate" @change="bindDateChange($event, 'endDate')">
								<view class="input-box">
									<text v-if="formData.endDate">{{formData.endDate}}</text>
									<text v-else class="placeholder"></text>
									<text class="input-icon">📅</text>
								</view>
							</picker>
						</view>

						<!-- === 第一组：固定显示 === -->
						<view class="form-item">
							<text class="label">合闸时间:</text>
							<picker mode="time" :value="formData.closeTime"
								@change="bindTimeChange($event, 'closeTime')">
								<view class="input-box">
									<text v-if="formData.closeTime">{{formData.closeTime}}</text>
									<text v-else class="placeholder"></text>
									<text class="input-icon">🕒</text>
								</view>
							</picker>
						</view>

						<view class="form-item">
							<text class="label">分闸时间:</text>
							<picker mode="time" :value="formData.openTime" @change="bindTimeChange($event, 'openTime')">
								<view class="input-box">
									<text v-if="formData.openTime">{{formData.openTime}}</text>
									<text v-else class="placeholder"></text>
									<text class="input-icon">🕒</text>
								</view>
							</picker>
						</view>
						
						<!-- === 第二组：动态显示 (timeLevel >= 2) === -->
						<template v-if="timeLevel >= 2">
							<view class="form-item">
								<text class="label">二次合闸:</text>
								<picker mode="time" :value="formData.closeTime2"
									@change="bindTimeChange($event, 'closeTime2')">
									<view class="input-box">
										<text v-if="formData.closeTime2">{{formData.closeTime2}}</text>
										<text v-else class="placeholder"></text>
										<text class="input-icon">🕒</text>
									</view>
								</picker>
							</view>
						
							<view class="form-item">
								<text class="label">二次分闸:</text>
								<picker mode="time" :value="formData.openTime2" @change="bindTimeChange($event, 'openTime2')">
									<view class="input-box">
										<text v-if="formData.openTime2">{{formData.openTime2}}</text>
										<text v-else class="placeholder"></text>
										<text class="input-icon">🕒</text>
									</view>
								</picker>
							</view>
						</template>
						
						<!-- === 第三组：动态显示 (timeLevel >= 3) === -->
						<template v-if="timeLevel >= 3">
							<view class="form-item">
								<text class="label">三次合闸:</text>
								<picker mode="time" :value="formData.closeTime3"
									@change="bindTimeChange($event, 'closeTime3')">
									<view class="input-box">
										<text v-if="formData.closeTime3">{{formData.closeTime3}}</text>
										<text v-else class="placeholder"></text>
										<text class="input-icon">🕒</text>
									</view>
								</picker>
							</view>
						
							<view class="form-item">
								<text class="label">三次分闸:</text>
								<picker mode="time" :value="formData.openTime3" @change="bindTimeChange($event, 'openTime3')">
									<view class="input-box">
										<text v-if="formData.openTime3">{{formData.openTime3}}</text>
										<text v-else class="placeholder"></text>
										<text class="input-icon">🕒</text>
									</view>
								</picker>
							</view>
						</template>

					</view>

					<!-- 操作图标行 (Flex布局，对应左右两列) -->
					<view class="action-row">
						<!-- 左侧区域：放置加号 -->
						<view class="action-col left">
							<!-- 只有当层级小于3时才显示加号 -->
							<text v-if="timeLevel < 3" class="action-icon plus" @click="addLevel">＋</text>
						</view>
						
						<!-- 右侧区域：放置减号 -->
						<view class="action-col right">
							<!-- 只有当层级大于1时才显示减号 -->
							<text v-if="timeLevel > 1" class="action-icon minus" @click="removeLevel">－</text>
						</view>
					</view>

					<!-- 按钮组 -->
					<view class="btn-group">
						<button class="btn btn-cancel" @click="resetForm">取消设置</button>
						<button class="btn btn-confirm" @click="submitForm">设置</button>
					</view>
				</view>
			</view>

			<!-- 第二部分：列表区域 (保持不变) -->
			<view class="section list-section">
				<view class="section-title">
					<text class="icon">🗃️</text> 
					<text class="title-text">自动分合闸设置列表</text>
				</view>

				<view class="table">
					<!-- 表格头部全选框 -->
					<view class="table-row header-row">
						<view class="table-cell check-col">
							<!-- 去掉多余的 checkbox-group，直接用 checkbox -->
							<checkbox :checked="remember" @click="handleCheckAll" color="#1aa094" style="transform:scale(0.7)" />
						</view>
						<view class="table-cell loc-col">位置</view>
						<view class="table-cell date-col">自动分合闸起止日期及时间</view>
					</view>
				
					<!-- 表格内容：循环 listData（正确的数据数组） -->
					<view class="table-row body-row" v-for="(item, index) in listData" :key="item.id">
						<view class="table-cell check-col">
							<!-- 去掉多余的 checkbox-group，直接用 checkbox -->
							<checkbox :checked="item.checked"
								@click="() => handleCheckSingle(index)" 
								color="#1aa094"
								style="transform:scale(0.7)"
								/>
						</view>
						<view class="table-cell loc-col">
							{{ item.location }}
						</view>
						<view class="table-cell date-col text-left">
							<view>合闸: {{ item.closeRange }}</view>
							<view>分闸: {{ item.openRange }}</view>
						</view>
					</view>
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
		console.log("单选")
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
		console.log('提交的数据:', formData.value);
		console.log('当前启用的组数:', timeLevel.value);
	};
</script>

<style lang="scss">
	/* 全局样式 */
	page {
		background-color: #ffffff;
		font-size: 28rpx;
		color: #333;
	}

	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.content {
		padding: 20rpx;
	}

	.icon {
		color: #26C6DA;
		margin-right: 10rpx;
		font-size: 32rpx;
	}
	
	.link-icon {
		font-size: 24rpx;
	}

	.section {
		margin-bottom: 40rpx;
	}

	.section-title {
		font-size: 30rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		display: flex;
		align-items: center;
		
		.title-text {
			color: #333;
		}
	}
	
	.sub-section {
		padding-left: 10rpx;
	}
	
	.sub-title {
		font-weight: bold;
		margin-bottom: 20rpx;
		display: flex;
		align-items: center;
	}

	/* 表单网格布局 */
	.form-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.form-item {
		width: 48%;
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 20rpx;
		
		.label {
			white-space: nowrap;
			margin-right: 10rpx;
			font-size: 24rpx;
			color: #555;
			min-width: 110rpx; /* 保证对齐 */
			text-align: right;
		}
		
		picker {
			flex: 1;
		}
	}

	.input-box {
		border: 1rpx solid #ccc;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 10rpx;
		background-color: #fff;
		border-radius: 4rpx;
		font-size: 24rpx;
		
		.placeholder {
			width: 10rpx;
		}
		
		.input-icon {
			color: #26C6DA;
			font-size: 24rpx;
		}
	}

	/* === 新增：操作图标行样式 === */
	.action-row {
		display: flex;
		justify-content: space-between;
	}
	
	.action-icon {
		color: #26C6DA;
		font-size: 35rpx;
		font-weight: bold;
	}
	
	.action-icon.minus {
		/* 视觉上让减号粗一点或者长一点，模拟截图 */
		font-weight: 900; 
		transform: scaleX(1.5); /* 拉长减号 */
	}

	/* 按钮组 */
	.btn-group {
		display: flex;
		justify-content: space-between;
		padding: 0 40rpx;
		margin-top: 20rpx;
		
		.btn {
			width: 40%;
			height: 75rpx;
			line-height: 80rpx;
			background-color: #26C6DA;
			color: #fff;
			font-size: 24rpx;
			border-radius: 10rpx;
			border: none;
			
			&::after {
				border: none;
			}
		}
	}

	/* 表格样式 */
	.table {
		border-top: 1rpx solid #ddd;
		border-left: 1rpx solid #ddd;
		margin-top: 10rpx;
	}

	.table-row {
		display: flex;
	}

	.header-row {
		background-color: #cccccc;
		font-weight: bold;
		color: #666;
		
		.table-cell {
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	.body-row {
		background-color: #fff;
		
		.table-cell {
			display: flex;
			align-items: center;
			justify-content: center;
			color: #666;
		}
	}

	.table-cell {
		border-right: 1rpx solid #ddd;
		border-bottom: 1rpx solid #ddd;
		padding: 15rpx 5rpx;
		font-size: 24rpx;
		min-height: 60rpx;
	}

	.check-col { width: 10%; }
	.loc-col { width: 25%; }
	.date-col { width: 70%; }
	
	.text-left {
		flex-direction: column !important;
		line-height: 1.7;
		font-size: 21rpx;
	}

</style>