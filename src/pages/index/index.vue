<template>
  <view class="container">
    <!-- 顶部基础信息区 -->
    <view class="info-card">
      <view class="title">{{ deviceInfo.name || '设备详情' }}</view>
      <view class="base-info">
        <view class="info-item">
          <text class="label">区域：</text>
          <text class="value">{{ deviceInfo.building || '-' }}</text>
        </view>
        <view class="info-item">
          <text class="label">泵房：</text>
          <text class="value">{{ deviceInfo.room }}</text>
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
              <text class="status-label">当前状态</text>
              <text class="status-value" :style="{ color: breakerStateColor() }">{{ breakerStateText() }}</text>
            </view>
            <view class="status-item">
              <text class="status-label">状态码</text>
              <text class="status-value">{{ deviceData.breaker_work ?? '-' }}</text>
            </view>
            <view class="status-item">
              <text class="status-label">状态说明</text>
              <text class="status-value" :style="{ color: breakerStateColor() }">{{ breakerStatusMap[deviceData.breaker_work] || '-' }}</text>
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
        <text style="font-size: 24rpx; color: #666;">{{ deviceData.updated_at.replace(/[A-Za-z]/g, ' ').trim() }}</text>
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
      <button
        :disabled="breakerState() === 'closed'"
        :style="{ backgroundColor: breakerState() === 'closed' ? '#ccc' : '#2B9939' }"
        class="operate-btn"
        @click="handleOperate('合闸')">合闸</button>
      <button
        :disabled="breakerState() === 'opened'"
        :style="{ backgroundColor: breakerState() === 'opened' ? '#ccc' : '#F44336' }"
        class="operate-btn"
        @click="handleOperate('分闸')">分闸</button>
      <button
        :disabled="breakerState() !== 'abnormal'"
        :style="{ backgroundColor: breakerState() === 'abnormal' ? '#FF9800' : '#ccc' }"
        class="operate-btn"
        @click="handleOperate('复位')">复位</button>
    </view>
    <!-- 非断路器提示 -->
    <view class="no-control-tip" v-else>
      <text>仅采集数据，不支持控制</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { getBreakerState, getBreakerStateText, getBreakerStateColor, breakerStatusMap } from '../../shared/constants/breakerCodes.js'
import { createWsManager } from '../../shared/network/ws.js'
import { getDeviceInfo, getDeviceData, sendDeviceControl } from '../../api/device.js'
const POLL_INTERVAL = 5000

// 从页面参数获取设备信息，提供默认值
const building = ref('')
const room = ref('')
const gateway = ref('')
const deviceType = ref('breaker')

const zt = ref("离线")
const temperature = ref(24)
const deviceInfo = ref({})
const deviceData = ref({})
const envAlertAcknowledged = ref(false)
const envAlertVisible = ref(false)
const ENV_TEMPERATURE_ALERT_THRESHOLD = 58
const ENV_HUMIDITY_ALERT_THRESHOLD = 50

// action 映射：按钮文字 → 后端 action 值
const actionMap = {
	'合闸': 'close',
	'分闸': 'open',
	'复位': 'unlock'
}

// 根据当前设备数据返回状态分类
const breakerState = () => getBreakerState(deviceData.value.breaker_work)
const breakerStateColor = () => getBreakerStateColor(breakerState())
const breakerStateText = () => getBreakerStateText(breakerState())

let pollTimer = null
let skipNextOnShowRefresh = true

const toAlertNumber = (value) => {
	if (value === undefined || value === null || value === '') return Number.NaN
	return Number(value)
}

const getEnvAlertOptions = () => {
	const currentTemperature = toAlertNumber(temperature.value)
	if (!Number.isNaN(currentTemperature) && currentTemperature >= ENV_TEMPERATURE_ALERT_THRESHOLD) {
		return {
			title: '温度告警',
			content: '当前温度≥58°C，请注意降温处理！'
		}
	}

	const currentHumidity = toAlertNumber(deviceData.value.humidity)
	if (!Number.isNaN(currentHumidity) && currentHumidity >= ENV_HUMIDITY_ALERT_THRESHOLD) {
		return {
			title: '湿度告警',
			content: '当前湿度≥60%RH，请注意防潮处理！'
		}
	}

	return null
}

const resetEnvAlertState = () => {
	envAlertAcknowledged.value = false
	envAlertVisible.value = false
}

const showEnvAlert = (title, content) => {
	envAlertVisible.value = true
	uni.showModal({
		title,
		content,
		confirmText: '我已知晓',
		showCancel: false,
		success: (res) => {
			if (res.confirm) {
				envAlertAcknowledged.value = true
			}
		},
		complete: () => {
			envAlertVisible.value = false
		}
	})
}

// 获取设备静态信息
const fetchInfo = async () => {
	try {
		const data = await getDeviceInfo(building.value, room.value, gateway.value)
		deviceInfo.value = data
		deviceType.value = data.device_type || 'breaker'
	} catch (e) {}
}

// 检查告警
const checkAlerts = () => {
	// 断路器异常告警
	if (deviceType.value === 'breaker' && breakerState() === 'abnormal') {
		const code = deviceData.value.breaker_work
		const desc = breakerStatusMap[code] || '未知异常'
		uni.showModal({
			title: '断路器异常告警',
			content: `当前状态：${desc}（状态码${code}），请及时处理！`,
			confirmText: '知道了',
			showCancel: false
		})
		return
	}
	// 温湿度传感器告警
	if (deviceType.value === 'env_sensor') {
		const alertOptions = getEnvAlertOptions()
		if (!alertOptions) {
			resetEnvAlertState()
			return
		}

		if (envAlertAcknowledged.value || envAlertVisible.value) {
			return
		}

		showEnvAlert(alertOptions.title, alertOptions.content)
	}
}

// 获取设备实时数据
const startPolling = () => {
	if (pollTimer) return
	pollTimer = setInterval(() => {
		fetchData()
	}, POLL_INTERVAL)
}

const stopPolling = () => {
	if (!pollTimer) return
	clearInterval(pollTimer)
	pollTimer = null
}

const fetchData = async () => {
	try {
		const data = await getDeviceData(building.value, room.value, gateway.value, { noCache: true })
		deviceData.value = data
		if (data.temperature !== undefined) {
			temperature.value = data.temperature
		}
		checkAlerts()
	} catch (e) {}
}

const wsManager = createWsManager({
	onOpen: () => {
		zt.value = '在线'
		stopPolling()
	},
	onMessage: (res) => {
		try {
			const msg = JSON.parse(res.data)
			if (msg.gateway !== gateway.value) return
			if (msg.type === 'snapshot') {
				if (msg.info) deviceInfo.value = msg.info
				if (msg.data) {
					deviceData.value = msg.data
					if (msg.data.temperature !== undefined) temperature.value = msg.data.temperature
					checkAlerts()
				}
			} else if (msg.type === 'update') {
				if (msg.fields) {
					deviceData.value = { ...deviceData.value, ...msg.fields }
					if (msg.fields.temperature !== undefined) temperature.value = msg.fields.temperature
					checkAlerts()
				}
			}
		} catch (e) {}
	},
	onClose: () => {
		zt.value = '离线'
		startPolling()
	},
	onError: () => {
		zt.value = '离线'
		startPolling()
	}
})
const connectWS = () => wsManager.connect()
const closeWS = () => wsManager.close()

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
})

onShow(() => {
	wsManager.setAllowReconnect(true)
	// onShow 在首次进入时可能先于 onMounted 触发，此时参数尚未解析，跳过。
	if (!gateway.value) return
	if (skipNextOnShowRefresh) {
		skipNextOnShowRefresh = false
		connectWS()
		return
	}
	fetchData()
	connectWS()
})

onHide(() => {
	wsManager.setAllowReconnect(false)
	stopPolling()
	closeWS()
})

onUnmounted(() => {
	wsManager.setAllowReconnect(false)
	stopPolling()
	closeWS()
})

// 拨打电话功能
const callPhone = (phone) => {
	uni.makePhoneCall({
		phoneNumber: phone,
		fail: () => uni.showToast({ title: '拨打失败', icon: 'none' })
	})
}

// 发送控制指令到后端
const sendControl = async (action) => {
	return sendDeviceControl(building.value, room.value, gateway.value, action)
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
				// 延迟1秒后刷新数据，等待设备响应
				setTimeout(() => fetchData(), 1000)
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15rpx 30rpx;
}
.info-card .info-item {
  display: flex;
  align-items: baseline;
  min-width: 0;
  font-size: 24rpx;
}
.info-card .label {
  flex-shrink: 0;
  color: #666;
  margin-right: 8rpx;
}
.info-card .value {
  min-width: 0;
  color: #333;
  font-weight: 500;
  word-break: break-all;
}
.info-card .online {
  color: #2B9939;
}

/* 数据展示容器 */
.data-container {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.data-card {
  background: #fff;
  border-radius: 15rpx;
  padding: 25rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}
.data-card .card-header {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 15rpx;
  border-bottom: 1px solid #f0f0f0;
}

/* 状态网格 */
.status-grid {
  display: flex;
  justify-content: space-between;
}
.status-item {
  flex: 1;
  text-align: center;
  padding: 15rpx;
}
.status-label {
  font-size: 22rpx;
  color: #666;
  display: block;
  margin-left: 5px;
}
.status-value {
  font-size: 24rpx;
  color: #333;
}

/* 参数网格 */
.param-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.param-item {
  background: #f9f9f9;
  border-radius: 10rpx;
  padding: 15rpx;
}
.param-label {
  font-size: 22rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}
.param-value {
  font-size: 22rpx;
  color: #333;
}
.param-value.big {
  font-size: 28rpx;
  font-weight: 600;
  color: #2B9939;
}

/* 联系人 */
.contact-grid {
  display: flex;
  gap: 20rpx;
}
.contact-item {
  flex: 1;
  background: #f9f9f9;
  border-radius: 10rpx;
  padding: 15rpx;
  text-align: center;
}
.contact-label {
  font-size: 22rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}
.contact-name {
  font-size: 24rpx;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}
.contact-phone {
  font-size: 22rpx;
  color: #1E88E5;
  text-decoration: underline;
  cursor: pointer;
}

/* 操作按钮区 */
.operate-bar {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
  padding-bottom: 30rpx;
}
.operate-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 26rpx;
  background: #2B9939;
  color: #fff;
  border-radius: 10rpx;
}
/* 非断路器提示 */
.no-control-tip {
  text-align: center;
  padding: 30rpx 0;
  margin-top: 20rpx;
  color: #999;
  font-size: 26rpx;
}
</style>