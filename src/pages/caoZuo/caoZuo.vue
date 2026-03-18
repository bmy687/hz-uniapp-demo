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
				<!-- ================= 一键合闸按钮 ================= -->
				<!-- 逻辑：当 current===0 (分闸选择) 时，它是非激活状态(灰色) -->
				<view class="op-btn" :style="{ backgroundColor: current === 0 ? '#A8A8A8' : '#429426' }"
					@click="handleGlobalAction('close')">

					<!-- 图标：current===0 用灰色图标，否则用高亮图标 -->
					<image class="button-icon"
						:src="current === 0 ? '/static/image/he.png' : '/static/image/he-active.png'" mode="aspectFit">
					</image>

					<!-- 文字颜色：current===0 用深灰 #213547，否则用白色 -->
					<text class="button-text" :style="{ color: current === 0 ? '#213547' : '#ffffff' }">
						一键合闸
					</text>
				</view>

				<!-- ================= 一键分闸按钮 ================= -->
				<!-- 逻辑：当 current===0 (分闸选择) 时，它是激活状态(可以用醒目颜色)，否则变灰 -->
				<view class="op-btn" :style="{ backgroundColor: current === 0 ? '#ff0000' : '#A8A8A8' }"
					@click="handleGlobalAction('open')">

					<!-- 图标 -->
					<image class="button-icon"
						:src="current === 0 ? '/static/image/fen.png' : '/static/image/fen-active.png'"
						mode="aspectFit"></image>

					<!-- 文字颜色 -->
					<text class="button-text" :style="{ color: current === 0 ? '#ffffff' : '#213547' }">
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
				<!-- 列表内容 -->
				<view v-show="tableData.length > 0">
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
						<view class="table-row" v-for="(item, index) in tableData" :key="index">
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

				<!-- 空状态 -->
				<view v-show="tableData.length === 0" class="empty-box">
					<view class="empty-tip">暂无可选项</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue';

	// --- 1. 分段器逻辑 ---
	// 索引 0: 分闸选择 (对应操作：一键分闸高亮，合闸按钮灰)
	// 索引 1: 合闸选择 (对应操作：一键合闸高亮，分闸按钮灰)
	const items = ref(['分闸选择', '合闸选择']);
	const current = ref(0);

	const onClickItem = (e) => {
		if (current.value !== e.currentIndex) {
			current.value = e.currentIndex;
			// 切换 Tab 时重置选中状态
			remember.value = false;
			resetTableData(current.value);
		}
	};

	// --- 2. 表格数据逻辑 ---
	// 模拟数据源
	const allData = [{
			location: '笃行楼305',
			name: '笃行楼305',
			status: '合闸',
			type: 0
		}, // type 0 归属分闸选择列表
		{
			location: '笃行楼304',
			name: '笃行楼304',
			status: '分闸',
			type: 1
		}, // type 1 归属合闸选择列表
		{
			location: '笃行楼303',
			name: '笃行楼303',
			status: '合闸',
			type: 0
		}
	];

	const tableData = ref([]);
	const remember = ref(false);

	// 初始化数据
	const resetTableData = (typeIndex) => {
		// 实际开发中这里应该是调API，这里仅做前端模拟筛选
		// current=0(分闸选择) -> 显示状态为"合闸"的设备(为了去分闸)
		// current=1(合闸选择) -> 显示状态为"分闸"的设备(为了去合闸)
		// 这里简单模拟，假设 allData 里的 type 字段对应 current
		const filtered = allData.filter(item => item.type === typeIndex);
		tableData.value = filtered.map(item => ({
			...item,
			checked: false
		}));
	};

	// 页面加载时初始化
	resetTableData(0);

	const selectedCount = computed(() => tableData.value.filter(item => item.checked).length);

	const handleCheckAll = () => {
		remember.value = !remember.value;
		tableData.value.forEach(item => item.checked = remember.value);
	};

	const handleCheckSingle = (index) => {
		tableData.value[index].checked = !tableData.value[index].checked;
		remember.value = tableData.value.every(item => item.checked);
	};

	const getStatusColor = (status) => {
		return status === '合闸' ? '#1aa094' : '#ff0000';
	}

	// --- 3. 按钮操作逻辑 ---
	const handleGlobalAction = (actionType) => {
		// actionType: 'close'(合闸) | 'open'(分闸)

		// 如果是 合闸操作 且 当前在 分闸选择页面(current=0)，则按钮是禁用的(灰色的)，不执行
		if (actionType === 'close' && current.value === 0) {
			return;
		}
		// 如果是 分闸操作 且 当前在 合闸选择页面(current=1)，则按钮是禁用的，不执行
		if (actionType === 'open' && current.value === 1) {
			return;
		}

		const selectedItems = tableData.value.filter(item => item.checked);
		if (selectedItems.length === 0) return uni.showToast({
			title: '请选择电箱',
			icon: 'none'
		});

		uni.showModal({
			title: '注意！',
			content: `确定要进行${actionType === 'close' ? '合闸' : '分闸'}操作吗`,
			confirmText: '确定',
			cancelText: '取消',
			success: (res) => {
				if (res.confirm) {
					// 执行分闸逻辑（调用后端接口）
					uni.showToast({
						title: `正在${actionType === 'close' ? '合闸' : '分闸'} ${selectedItems.length} 个设备`,
						icon: 'none'
					});
				}
			}
		})
	};
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
