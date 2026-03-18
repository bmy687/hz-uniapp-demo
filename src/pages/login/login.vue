<template>
	<view class="login-container">
		<!-- 顶部Logo和标题 -->
		<view class="login-header">
			<view class="logo">
				<image src="/static/image/shan.png" mode="widthFix"></image>
			</view>
			<view class="title">慧电智控管理系统</view>
			<view class="subtitle">请使用账号密码登录</view>
		</view>

		<!-- 登录表单 -->
		<view class="login-form">
			<!-- 账号输入 -->
			<view class="form-item">
				<uni-icons type="person" size="32rpx" color="#666" class="input-icon"></uni-icons>
				<input type="text" v-model="username" placeholder="请输入账号" class="input"
					@input="handleInput">
			</view>
			<view v-if="showError && !username.trim()" class="error-tip">账号不能为空</view>

			<!-- 密码输入 -->
			<view class="form-item">
				<uni-icons type="locked" size="32rpx" color="#666" class="input-icon"></uni-icons>
				<input :type="showPwd ? 'text' : 'password'" v-model="password" placeholder="请输入密码" class="input"
					@input="handleInput">
				<uni-icons :type="showPwd ? 'eye-filled' : 'eye-slash-filled'" size="28rpx" color="#999"
					class="toggle-icon" @click="showPwd = !showPwd"></uni-icons>
			</view>
			<view v-if="showError && !password.trim()" class="error-tip">密码不能为空</view>

			<!-- 记住密码和忘记密码（核心修复部分） -->
			<view class="form-footer">
				<view class="remember-wrap">
					<!-- 用label包裹整个区域，点击文字也能触发复选框切换 -->
					<label class="remember-label" @click="remember = !remember">
						<!-- 复选框与remember变量双向绑定 -->
						<checkbox 
							style="transform:scale(0.7); margin-right: 10rpx;" 
							:checked="remember"
						/>
						<span style="font-size: 24rpx;color: #2B9939;">记住密码</span>
					</label>
				</view>
				<text class="forget-text" @click="handleForget">忘记密码？</text>
			</view>

			<!-- 登录按钮 -->
			<button class="login-btn" @click="handleLogin">登录</button>
		</view>

		<!-- 底部版权信息 -->
		<view class="login-footer">
			<text class="copyright">© 2025 慧电智控管理系统 版权所有</text>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted, onUpdated } from 'vue'

// 表单数据
const username = ref('')
const password = ref('')
const showPwd = ref(false)
const remember = ref(false) 
const showError = ref(false)

// 输入时清除错误提示
const handleInput = () => {
	showError.value = false
}

// 忘记密码点击事件
const handleForget = () => {
	uni.showToast({
		title: '忘记密码请联系管理员',
		icon: 'none'
	})
}

// 登录处理 showError.value = true ; return
const handleLogin = () => {
	// 表单验证   
	if(!username.value.trim() || !password.value.trim()){
		showError.value = true
		return
	}

	// 模拟登录请求
	uni.showToast({
		title: '登录中...',
		icon: 'loading',
		duration: 1000
	})

	// 实际项目中替换为真实接口请求
	setTimeout(() => {
		// 记住密码逻辑：选中则保存，未选中则清除
		if (remember.value) {
			uni.setStorageSync('savedUsername', username.value) // 存储键名更清晰
			uni.setStorageSync('savedPassword', password.value)
		} else {
			uni.removeStorageSync('savedUsername')
			uni.removeStorageSync('savedPassword')
		}

		// 登录成功跳转
		uni.showToast({
			title: '登录成功',
			icon: 'success'
		})
		setTimeout(() => {
			uni.switchTab({
				url: '/pages/shouYe/shouYe'
			})
		}, 1000)
	}, 1000)
}

// 页面加载时读取保存的密码（核心修复：优先读取存储，再同步复选框状态）
onMounted(() => {
	const savedUser = uni.getStorageSync('savedUsername')
	const savedPwd = uni.getStorageSync('savedPassword')
	// 若有保存的账号密码，自动填充并勾选复选框
	if (savedUser && savedPwd) {
		username.value = savedUser
		password.value = savedPwd
		remember.value = true // 同步复选框选中状态
	}
})
</script>

<style lang="scss" scoped>
.login-container {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: #f5f7fa;
	padding: 0 50rpx;
	box-sizing: border-box;
}

// 头部样式
.login-header {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 150rpx;
	margin-bottom: 100rpx;

	.logo {
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
		background-color: #eaf7ea;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 30rpx;
		image {
			width: 80rpx;
			height: 80rpx;
			object-fit: contain;
		}
	}

	.title {
		font-size: 36rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 15rpx;
	}

	.subtitle {
		font-size: 26rpx;
		color: #999;
	}
}

// 表单样式
.login-form {
	flex: 1;
}

.form-item {
	display: flex;
	align-items: center;
	background-color: #fff;
	border-radius: 10rpx;
	padding: 0 30rpx;
	height: 90rpx;
	margin-bottom: 20rpx;
	border: 1px solid #f0f0f0;
	box-sizing: border-box;

	.input-icon {
		margin-right: 20rpx;
	}

	.input {
		flex: 1;
		height: 100%;
		font-size: 28rpx;
		color: #333;
	}

	.toggle-icon {
		cursor: pointer;
	}
}

.error-tip {
	color: #ff4d4f;
	font-size: 24rpx;
	margin: -10rpx 0 20rpx 20rpx;
}

// 表单底部
.form-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin: 10rpx 0 50rpx;

	.remember-wrap {
		display: flex;
		align-items: center;
	}

	.remember-label {
		display: flex;
		align-items: center;
		cursor: pointer; // 提示可点击
	}

	.forget-text {
		font-size: 24rpx;
		color: #2B9939;
		cursor: pointer;
	}
}

// 登录按钮
.login-btn {
	width: 100%;
	height: 90rpx;
	line-height: 90rpx;
	background-color: #2B9939;
	color: #fff;
	font-size: 30rpx;
	border-radius: 10rpx;
	margin-bottom: 40rpx;
}

// 底部版权
.login-footer {
	padding: 30rpx 0;
	text-align: center;

	.copyright {
		font-size: 22rpx;
		color: #999;
	}
}
</style>