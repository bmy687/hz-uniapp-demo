<template>
  <view class="user-center">
    <!-- 顶部用户信息区 -->
    <view class="user-header">
      <view class="avatar-wrap">
        <image 
          class="avatar" 
          src="/static/image/tx.png" 
          mode="widthFix"
        ></image>
      </view>
      <view class="user-info">
        <view class="username">{{ username || '管理员' }}</view>
        <view class="user-role">系统管理员</view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="func-list">
      <view class="func-item" @click="handleModifyPwd">
        <view class="func-icon">
          <uni-icons type="locked" size="36rpx" color="#09C6D0"></uni-icons>
        </view>
        <view class="func-text">修改密码</view>
        <uni-icons type="right" size="28rpx" color="#999"></uni-icons>
      </view>
      
      <view class="func-item" @click="handleAbout">
        <view class="func-icon">
          <uni-icons type="info" size="36rpx" color="#09C6D0"></uni-icons>
        </view>
        <view class="func-text">关于系统</view>
        <uni-icons type="right" size="28rpx" color="#999"></uni-icons>
      </view>
      
      <view class="func-item" @click="handleHelp">
        <view class="func-icon">
          <uni-icons type="help" size="36rpx" color="#09C6D0"></uni-icons>
        </view>
        <view class="func-text">使用帮助</view>
        <uni-icons type="right" size="28rpx" color="#999"></uni-icons>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <button class="logout-btn" @click="handleLogout">退出登录</button>

    <!-- 底部版本信息 -->
    <view class="version-info">
      <text>版本号 v1.0.0</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 用户名（从存储中读取）
const username = ref('')

// 页面加载时获取用户信息
onMounted(() => {
  // 从存储中读取登录时保存的用户名
  const savedUser = uni.getStorageSync('savedUser')
  if (savedUser) {
    username.value = savedUser
  }
})

// 修改密码
const handleModifyPwd = () => {
  uni.showToast({
    title: '修改密码功能开发中',
    icon: 'none'
  })
}

// 关于系统
const handleAbout = () => {
  uni.showModal({
    title: '关于系统',
    content: '配电箱管理系统 v1.0.0\n用于实时监控和管理配电箱运行状态',
    showCancel: false
  })
}

// 使用帮助
const handleHelp = () => {
  uni.showToast({
    title: '使用帮助文档已发送至管理员邮箱',
    icon: 'none'
  })
}

// 退出登录（核心功能）
const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出当前登录吗？',
    success:res => {
      if (res.confirm) {
        // 1. 清除存储的用户信息
        uni.removeStorageSync('savedUser')
        uni.removeStorageSync('savedPwd')
        
        // 2. 显示退出提示
        uni.showToast({
          title: '您好，已成功退出',
          icon: 'none',
          duration: 3000
        })
        
        // 3. 跳转到登录页（关闭当前页面栈，避免返回）
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/login/login' // 替换为你的登录页路径
          })
        }, 3000)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.user-center {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 60rpx;
}

// 顶部用户信息
.user-header {
  background-color: #09C6D0;
  padding: 60rpx 50rpx 40rpx;
  display: flex;
  align-items: center;

  .avatar-wrap {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    padding: 10rpx;
    margin-right: 30rpx;

    .avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
  }

  .user-info {
    .username {
      font-size: 36rpx;
      color: #fff;
      font-weight: 600;
      margin-bottom: 10rpx;
    }

    .user-role {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

// 功能列表
.func-list {
  margin: 30rpx;
  background-color: #fff;
  border-radius: 15rpx;
  overflow: hidden;

  .func-item {
    display: flex;
    align-items: center;
    padding: 0 30rpx;
    height: 100rpx;
    border-bottom: 1px solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .func-icon {
      margin-right: 25rpx;
      width: 40rpx;
      text-align: center;
    }

    .func-text {
      font-size: 30rpx;
      color: #333;
      flex: 1;
    }
  }
}

// 退出登录按钮
.logout-btn {
  width: calc(100% - 60rpx);
  height: 90rpx;
  line-height: 90rpx;
  background-color: #fff;
  color: #ff4d4f;
  border: 1px solid #ff4d4f;
  font-size: 30rpx;
  border-radius: 10rpx;
  margin: 50rpx 30rpx 0;
}

// 版本信息
.version-info {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  margin-top: 60rpx;
}
</style>