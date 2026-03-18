<template>
	<view class="container">
		<!-- 1. 顶部标题 -->
		<view class="page-header" :style="{ paddingTop: statusBarHeight + 'px' }">
			<text class="header-title">慧电智控管理平台</text>
		</view>

		<!-- 2. 设备卡片列表 -->
		<view v-for="device in deviceList" :key="device.gateway" @click="handleDetail(device)" class="card">
			<view class="card-main">
				<view class="left-content">
					<!-- 左侧图标 -->
					<view class="left-icon-area">
						<uni-icons :type="deviceIcon(device.device_type)" size="50" color="#09C6D0"></uni-icons>
					</view>

					<!-- 中间文字信息 -->
					<view class="info-area">
						<view class="info-row">
							<text class="label">设备名称：</text>
							<text class="value">{{ device.name || '未命名' }}</text>
						</view>
						<view class="info-row">
							<text class="label">设备位置：</text>
							<text class="value">{{ device.location || '-' }}</text>
						</view>
						<view class="info-row">
							<text class="label">网关编号：</text>
							<text class="value">{{ device.gateway }}</text>
						</view>
						<view class="info-row">
							<text class="label">设备类型：</text>
							<text class="value">{{ deviceTypeName(device.device_type) }}</text>
						</view>

						<!-- 联系人信息 -->
						<view class="contact-row">
							<view class="contact-item">
								<text class="label">管理员：</text>
								<text class="value">{{ device.admin || '-' }}</text>
							</view>
							<view class="contact-item">
								<text class="label">联系方式：</text>
								<text class="value">{{ device.phone || '-' }}</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 网关状态 + 右箭头 -->
				<view class="gateway-area">
					<view class="wifi-group">
						<text class="gateway-text">网关状态</text>
						<image src="/static/image/wifi.png" mode="aspectFit" class="wifi-icon"></image>
					</view>
					<uni-icons type="right" size="24" color="#999" class="arrow-icon"></uni-icons>
				</view>
			</view>
		</view>

		<!-- 无数据提示 -->
		<view v-if="!loading && deviceList.length === 0" class="empty-tip">
			<text>暂无设备数据</text>
		</view>
	</view>
</template>

<script setup>
	import { ref, onMounted } from 'vue';

	const BASE_URL = '/api'
	const statusBarHeight = ref(20);
	const deviceList = ref([]);
	const loading = ref(false);

	// 设备类型中文名
	const deviceTypeName = (type) => {
		const map = {
			breaker: '智能断路器',
			env_sensor: '温湿度传感器',
			meter: '智能电表'
		}
		return map[type] || type
	}

	// 设备类型图标
	const deviceIcon = (type) => {
		const map = {
			breaker: 'home-filled',
			env_sensor: 'cloud-filled',
			meter: 'bar-chart'
		}
		return map[type] || 'home-filled'
	}

	// 获取所有设备列表
	const fetchDevices = () => {
		loading.value = true
		uni.request({
			url: `${BASE_URL}/devices`,
			method: 'GET',
			success: (res) => {
				if (res.statusCode === 200 && Array.isArray(res.data)) {
					deviceList.value = res.data
				}
			},
			fail: (err) => {
				console.error('获取设备列表失败', err)
				uni.showToast({ title: '获取设备列表失败', icon: 'none' })
			},
			complete: () => {
				loading.value = false
			}
		})
	}

	// 点击卡片跳转详情
	const handleDetail = (device) => {
		uni.navigateTo({
			url: `/pages/index/index?building=${encodeURIComponent(device.building)}&room=${encodeURIComponent(device.room)}&gateway=${encodeURIComponent(device.gateway)}`
		})
	}

	onMounted(() => {
		try {
			const systemInfo = uni.getSystemInfoSync() || {};
			statusBarHeight.value = systemInfo.statusBarHeight || 20;
		} catch (e) {
			console.error('获取状态栏高度失败：', e);
		}
		fetchDevices()
	});
</script>

<style lang="scss" scoped>
	/* 全局背景 */
	.container {
		min-height: 100vh;
		background-color: #F5F5F5;
		padding-bottom: 120rpx; /* 为底部导航栏留出空间 */
	}

	/* 1. 头部样式 */
	.page-header {
		padding: 35rpx 0;
		text-align: center;
		background-color: white;
	}
	.header-title {
		font-size: 26rpx;
		color: #334455;
	}

	/* 2. 卡片样式 */
	.card {
		margin: 0 20rpx;
		background-color: #ffffff;
		border-radius: 12rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
		padding: 30rpx 20rpx;
		margin-top: 20rpx;
	}

	/* 核心修改：卡片主内容一行布局 */
	.card-main {
		display: flex;
		flex-direction: row;
		align-items: center; /* 垂直居中对齐 */
		justify-content: space-between; /* 左右两端分布 */
		position: relative;
	}

	/* 左侧图标+信息区域 */
	.left-content {
		display: flex;
		flex-direction: row;
		align-items: flex-start; /* 内容顶部对齐 */
		flex: 1; /* 占满剩余空间 */
	}

	/* 左侧图标区域 */
	.left-icon-area {
		width: 80rpx;
		margin-right: 20rpx;
		display: flex;
		justify-content: center;
		padding-top: 85rpx;
	}

	/* 中间信息区域 */
	.info-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		font-size: 26rpx;
		color: #333;
	}

	.info-row {
		margin-bottom: 12rpx;
		line-height: 1.4;
	}

	.label {
		color: #666;
	}

	.value {
		color: #2c3e50;
	}

	/* 联系人行（两列布局） */
	.contact-row {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin-bottom: 12rpx;
		font-size: 24rpx; /* 字体稍小以适应两列 */
	}
	
	.contact-item {
		&:last-child {
			margin-left: 10rpx;
		}
	}
	
	/* 核心修改：网关状态+右箭头区域 */
	.gateway-area {
		display: flex;
		align-items: center; /* 垂直居中 */
		gap: 15rpx; /* 图标与箭头间距 */
		position: absolute;
		right: 0;
		top: 30rpx;
	}

	/* WiFi图标+文字组（垂直布局，文字在上） */
	.wifi-group {
		display: flex;
		flex-direction: column;
		align-items: center; /* 水平居中 */
		gap: 8rpx; /* 文字与图标间距 */
		border: 1px solid #09C6D0;
		border-radius: 10rpx;
		padding: 10rpx;
	}

	.gateway-text {
		font-size: 22rpx;
		color: #666;
	}

	.wifi-icon {
		width: 60rpx; /* 控制WiFi图标大小 */
		height: 60rpx;
	}

	/* 右箭头样式（可根据需求调整大小和颜色） */
	.arrow-icon {
		font-size: 28rpx;
		color: #ccc;
	}

	/* 空数据提示 */
	.empty-tip {
		text-align: center;
		padding: 100rpx 0;
		color: #999;
		font-size: 28rpx;
	}
</style>