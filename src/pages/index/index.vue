<template>
  <view class="container">
    <!-- 顶部基础信息区 -->
    <view class="info-card">
      <view class="title">{{ deviceInfo.name || '设备详情' }}</view>
      <view class="base-info">
        <view class="info-item">
          <text class="label">位置：</text>
          <text class="value">{{ deviceInfo.location || '-' }}</text>
        </view>
        <view class="info-item">
          <text class="label">房间：</text>
          <text class="value">{{ deviceInfo.building }} - {{ deviceInfo.room }}</text>
        </view>
        <view class="info-item">
          <text class="label">网关：</text>
          <text class="value">{{ deviceInfo.gateway }}</text>
        </view>
        <view class="info-item">
          <text class="label">网关状态：</text>
          <text :style="zt === '离线' ? 'color:red' :''" class="value online">{{zt}}</text>
        </view>
      </view>
    </view>

    <!-- 核心数据展示区 -->
    <view class="data-container">

      <!-- 断路器数据 -->
      <template v-if="deviceType === 'breaker'">
        <!-- 设备状态 -->
        <view class="data-card">
          <view class="card-header">设备状态</view>
          <view class="status-grid">
            <view class="status-item">
              <text class="status-label">工作状态码</text>
              <text class="status-value">{{ deviceData.breaker_work ?? '-' }}</text>
            </view>
            <view class="status-item">
              <text class="status-label">状态说明</text>
              <text class="status-value">{{ breakerStatusMap[deviceData.breaker_work] || '-' }}</text>
            </view>
          </view>
        </view>

        <!-- 电力参数 -->
        <view class="data-card">
          <view class="card-header">电力参数</view>
          <view class="param-grid">
            <view class="param-item">
              <text class="param-label">A相电压(V)</text>
              <text class="param-value big">{{ deviceData.voltage_a ?? '-' }}</text>
            </view>
            <view class="param-item">
              <text class="param-label">A相电流(A)</text>
              <text class="param-value big">{{ deviceData.current_a ?? '-' }}</text>
            </view>
            <view class="param-item">
              <text class="param-label">有功功率(W)</text>
              <text class="param-value big">{{ deviceData.power_a ?? '-' }}</text>
            </view>
            <view class="param-item">
              <text class="param-label">频率(Hz)</text>
              <text class="param-value big">{{ deviceData.frequency ?? '-' }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 温湿度传感器数据 -->
      <template v-else-if="deviceType === 'env_sensor'">
        <view class="data-card">
          <view class="card-header">环境数据</view>
          <view class="param-grid">
            <view class="param-item">
              <text class="param-label">温度(°C)</text>
              <text :style="{color: temperature >= 58 ? 'red' : '#2B9939'}" class="param-value big">{{ deviceData.temperature ?? '-' }}</text>
            </view>
            <view class="param-item">
              <text class="param-label">湿度(%RH)</text>
              <text class="param-value big">{{ deviceData.humidity ?? '-' }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 电表数据 -->
      <template v-else-if="deviceType === 'meter'">
        <view class="data-card">
          <view class="card-header">电表数据</view>
          <view class="param-grid">
            <view class="param-item">
              <text class="param-label">累计用电量(kWh)</text>
              <text class="param-value big">{{ deviceData.meter ?? '-' }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 更新时间 -->
      <view class="data-card" v-if="deviceData.updated_at">
        <view class="card-header">数据更新时间</view>
        <text style="font-size: 24rpx; color: #666;">{{ deviceData.updated_at }}</text>
      </view>

      <!-- 联系人信息 -->
      <view class="data-card">
        <view class="card-header">联系人</view>
        <view class="contact-grid">
          <view class="contact-item">
            <text class="contact-label">管理员</text>
            <text class="contact-name">{{ deviceInfo.admin || '-' }}</text>
            <text v-if="deviceInfo.phone" class="contact-phone" @click="callPhone(deviceInfo.phone)">{{ deviceInfo.phone }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作按钮区（仅断路器显示） -->
    <view class="operate-bar" v-if="deviceType === 'breaker'">
      <button style="background-color: #AAAAAA;" class="operate-btn" @click="handleOperate('合闸')">合闸</button>
      <button style="background-color: red;" class="operate-btn" @click="handleOperate('分闸')">分闸</button>
      <button style="background-color: #AAAAAA;" class="operate-btn reset" @click="handleOperate('复位')">复位</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const BASE_URL = '/api'

// 从页面参数获取设备信息，提供默认值
const building = ref('')
const room = ref('')
const gateway = ref('')
const deviceType = ref('breaker')

const zt = ref("离线")
const temperature = ref(24)
const loading = ref(false)
const deviceInfo = ref({})
const deviceData = ref({})

// action 映射：按钮文字 → 后端 action 值
const actionMap = {
	'合闸': 'close',
	'分闸': 'open',
	'复位': 'unlock'
}

// breaker_work 状态码对照
const breakerStatusMap = {
	0: '手动合闸', 1: '命令合闸', 2: '漏电合闸', 3: '保留',
	4: '手动分闸', 5: '命令分闸', 6: '自动分闸', 7: '命令锁死',
	8: '漏电锁死', 9: '机械故障', 10: '定时合闸', 11: '定时分闸',
	12: '保留', 13: '干接点合闸', 14: '干接点分闸', 15: '手动模式合闸', 16: '手动模式分闸'
}

let wsTask = null

// 获取设备静态信息
const fetchInfo = () => {
	uni.request({
		url: `${BASE_URL}/${building.value}/${room.value}/${gateway.value}/info`,
		success: (res) => {
			if (res.statusCode === 200) {
				deviceInfo.value = res.data
				deviceType.value = res.data.device_type || 'breaker'
			}
		}
	})
}

// 获取设备实时数据
const fetchData = () => {
	uni.request({
		url: `${BASE_URL}/${building.value}/${room.value}/${gateway.value}/data`,
		success: (res) => {
			if (res.statusCode === 200) {
				deviceData.value = res.data
				if (res.data.temperature !== undefined) {
					temperature.value = res.data.temperature
				}
			}
		}
	})
}

// WebSocket 实时更新
const connectWS = () => {
	const host = '192.168.192.104:8080'
	wsTask = uni.connectSocket({
		url: `ws://${host}/ws`,
		success: () => {}
	})
	uni.onSocketOpen(() => {
		zt.value = '在线'
	})
	uni.onSocketMessage((res) => {
		try {
			const msg = JSON.parse(res.data)
			if (msg.gateway !== gateway.value) return
			if (msg.type === 'snapshot') {
				if (msg.info) deviceInfo.value = msg.info
				if (msg.data) {
					deviceData.value = msg.data
					if (msg.data.temperature !== undefined) temperature.value = msg.data.temperature
				}
			} else if (msg.type === 'update') {
				if (msg.fields) {
					deviceData.value = { ...deviceData.value, ...msg.fields }
					if (msg.fields.temperature !== undefined) temperature.value = msg.fields.temperature
				}
			}
		} catch (e) {}
	})
	uni.onSocketClose(() => {
		zt.value = '离线'
	})
	uni.onSocketError(() => {
		zt.value = '离线'
	})
}

onMounted(() => {
	// 从页面参数获取设备标识
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const options = currentPage.$page?.options || currentPage.options || {}
	building.value = decodeURIComponent(options.building || '笃行楼')
	room.value = decodeURIComponent(options.room || '307')
	gateway.value = decodeURIComponent(options.gateway || 'B1_R101_T01')

	fetchInfo()
	fetchData()
	connectWS()

	if (temperature.value >= 58) {
		uni.showModal({
			title: '温度告警',
			content: '当前温度≥58°C，是否执行分闸操作?',
			confirmText: '立即分闸',
			cancelText: '仅检查散热',
			success: res => {
				if (res.confirm) {
					handleOperate('分闸')
				} else {
					uni.showToast({ title: '请及时检查散热系统', icon: 'none' })
				}
			}
		})
	}
})

onUnmounted(() => {
	uni.closeSocket()
})

// 拨打电话功能
const callPhone = (phone) => {
	uni.makePhoneCall({
		phoneNumber: phone,
		fail: () => uni.showToast({ title: '拨打失败', icon: 'none' })
	})
}

// 发送控制指令到后端
const sendControl = (action) => {
	return new Promise((resolve, reject) => {
		loading.value = true
		uni.request({
			url: `${BASE_URL}/${building.value}/${room.value}/${gateway.value}/control`,
			method: 'POST',
			header: { 'Content-Type': 'application/json' },
			data: { action },
			success: (res) => {
				if (res.statusCode === 200) {
					resolve(res.data)
				} else {
					reject(res.data)
				}
			},
			fail: (err) => {
				reject(err)
			},
			complete: () => {
				loading.value = false
			}
		})
	})
}

// 操作按钮逻辑
const handleOperate = (type) => {
	const action = actionMap[type]
	if (!action) return

	uni.showModal({
		title: '操作确认',
		content: `确定要执行「${type}」操作吗？`,
		success: async (res) => {
			if (!res.confirm) return
			try {
				await sendControl(action)
				uni.showToast({ title: `${type}指令已发送`, icon: 'success' })
			} catch (err) {
				const msg = (err && err.error) ? err.error : '指令发送失败，请检查网络'
				uni.showToast({ title: msg, icon: 'none' })
			}
		}
	})
}
</script>

<style lang="scss" scoped>
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

/* 基础信息卡片 */
.info-card {
  background: #fff;
  border-radius: 15rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}
.info-card .title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  text-align: center;
}
.info-card .base-info {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx 30rpx;
}
.info-card .info-item {
  display: flex;
  align-items: center;
  font-size: 24rpx;
}
.info-card .label {
  color: #666;
  margin-right: 8rpx;
}
.info-card .value {
  color: #333;
  font-weight: 500;
}
.info-card .online {
  color: #2B9939;
}

/* 数据展示容器 */
.data-container {
  display: flex;
