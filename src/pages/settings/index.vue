<template>
  <view class="settings">
    <!-- 顶部标题栏 -->
    <view class="navbar">
      <view class="back-btn" @tap="goBack">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </view>
      <text class="navbar-title">设置</text>
      <view class="navbar-right" />
    </view>

    <!-- 设置列表 -->
    <view class="settings-body">
      <view class="group">
        <view class="cell" @tap="goProfile">
          <text class="cell-text">个人资料</text>
          <view class="cell-right">
            <text class="cell-sub">编辑</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="group">
        <view class="cell" @tap="openAgreement('用户协议')">
          <text class="cell-text">用户协议</text>
          <view class="cell-right">
            <text class="cell-arrow">›</text>
          </view>
        </view>
        <view class="cell" @tap="openAgreement('隐私政策')">
          <text class="cell-text">隐私政策</text>
          <view class="cell-right">
            <text class="cell-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="group">
        <view class="cell">
          <text class="cell-text">订单通知</text>
          <switch :checked="notify.order" @change="e => toggleNotify('order', e)" color="#FF6B35" />
        </view>
        <view class="cell">
          <text class="cell-text">优惠活动</text>
          <switch :checked="notify.promo" @change="e => toggleNotify('promo', e)" color="#FF6B35" />
        </view>
        <view class="cell">
          <text class="cell-text">系统消息</text>
          <switch :checked="notify.system" @change="e => toggleNotify('system', e)" color="#FF6B35" />
        </view>
      </view>

      <view class="group">
        <view class="cell" @tap="onClearCache">
          <text class="cell-text">清除缓存</text>
          <view class="cell-right">
            <text class="cell-sub">{{ cacheSize }}</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
        <view class="cell" @tap="onAbout">
          <text class="cell-text">关于我们</text>
          <view class="cell-right">
            <text class="cell-sub">v1.0.0</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="logout-btn" @tap="onLogout">退出登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const notify = reactive({ order: true, promo: true, system: true })
const cacheSize = ref('0KB')

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0KB'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function refreshCacheSize() {
  try {
    const info = uni.getStorageInfoSync()
    cacheSize.value = formatSize(info.currentSize * 1024)
  } catch (e) {
    cacheSize.value = '0KB'
  }
}

onMounted(() => {
  refreshCacheSize()
})

function goBack() {
  uni.navigateBack()
}

function goProfile() {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

function openAgreement(title: string) {
  uni.showModal({ title, content: `此处为《${title}》内容示例，实际应由运营配置。`, showCancel: false })
}

function toggleNotify(key: keyof typeof notify, e: any) {
  notify[key] = !!e.detail.value
}

function onClearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '确定清除本地缓存吗？',
    success: (res) => {
      if (res.confirm) {
        // 保留登录态相关 storage
        const keepKeys = ['wzz_token', 'wzz_refresh_token', 'wzz_user_info']
        try {
          const info = uni.getStorageInfoSync()
          info.keys.forEach((k: string) => {
            if (!keepKeys.includes(k)) {
              uni.removeStorageSync(k)
            }
          })
        } catch (e) {
          // ignore
        }
        refreshCacheSize()
        uni.showToast({ title: '清除缓存成功', icon: 'success' })
      }
    }
  })
}

function onAbout() {
  uni.showModal({
    title: '关于我们',
    content: '味真足外卖 v1.0.0\n为您提供美味到家的外卖服务。',
    showCancel: false
  })
}

function onLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出登录', icon: 'none' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/login/login' })
        }, 600)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.settings {
  min-height: 100vh;
  background: $bg;
}

.navbar {
  height: calc(var(--status-bar-height, 20px) + 44px);
  padding-top: var(--status-bar-height, 20px);
  background: $card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text;
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 700;
  color: $text;
}

.navbar-right {
  width: 44px;
}

.settings-body {
  padding: 12px 0 24px;
}

.group {
  background: $card;
  margin: 0 0 12px;
  padding: 0 16px;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid $border;
}

.cell:last-child {
  border-bottom: none;
}

.cell-text {
  font-size: 15px;
  color: $text;
}

.cell-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cell-sub {
  font-size: 13px;
  color: $text-muted;
}

.cell-arrow {
  font-size: 16px;
  color: $text-muted;
}

.logout-btn {
  margin: 24px 16px;
  height: 48px;
  line-height: 48px;
  text-align: center;
  background: #fff;
  color: $danger;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: $shadow;
}
</style>
