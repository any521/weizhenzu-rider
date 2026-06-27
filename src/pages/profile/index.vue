<template>
  <view class="profile">
    <!-- 顶部黄色头部 -->
    <view class="profile-header">
      <view class="header-top">
        <view class="user-card">
          <view class="user-avatar">
            <image v-if="userStore.avatar" :src="userStore.avatar" class="avatar-img" mode="aspectFill" />
            <CategoryIcon v-else name="avatar" :size="36" color="#fff" />
          </view>
          <view class="user-info">
            <view class="user-name">
              <text>{{ userStore.userInfo?.nickname || '未登录' }}</text>
            </view>
            <view v-if="userStore.userInfo?.email" class="user-email">
              {{ userStore.userInfo.email }}
            </view>
          </view>
        </view>
        <view class="settings-btn" @tap="goSettings">
          <CategoryIcon name="settings" :size="22" />
        </view>
      </view>

      <!-- 手机号绑定状态条 -->
      <view v-if="userStore.isLoggedIn" class="phone-bind-bar" @tap="goBindPhone">
        <view class="bind-left">
          <view class="bind-icon">
            <CategoryIcon name="phone" :size="18" color="#fff" />
          </view>
          <view class="bind-info">
            <text v-if="userStore.phoneBound" class="bind-text">手机号已绑定：{{ userStore.userInfo?.phone || '****' }}</text>
            <text v-else class="bind-text bind-text-warn">未绑定手机号</text>
            <text v-if="!userStore.phoneBound" class="bind-sub">下单前需绑定手机号，点击立即绑定</text>
          </view>
        </view>
        <text class="bind-arrow">›</text>
      </view>
    </view>

    <!-- 我的资产 -->
    <view class="assets-card">
      <view class="assets-title">我的资产</view>
      <view class="assets-list">
        <view v-for="a in assets" :key="a.label" class="assets-item" @tap="a.onTap">
          <view class="assets-value">{{ a.value }}</view>
          <view class="assets-label">{{ a.label }}</view>
        </view>
      </view>
    </view>

    <!-- 我的收藏 -->
    <view class="favorites-card" @tap="onFavorites">
      <view class="favorites-thumbs">
        <template v-if="favoriteMerchants.length > 0">
          <view v-for="(m, idx) in favoriteMerchants.slice(0, 3)" :key="m.id || idx" class="favorites-thumb">
            <SmartImage v-if="m.imageUrl" :src="m.imageUrl" bg="linear-gradient(135deg, #FF6B35, #FFC107)" icon="shop" :iconSize="20" radius="6px" mode="aspectFill" />
            <CategoryIcon v-else name="shop" :size="24" />
          </view>
        </template>
        <view v-else class="favorites-thumb">
          <CategoryIcon name="favorite" :size="24" />
        </view>
      </view>
      <view class="favorites-text">
        <text class="favorites-title">我的收藏</text>
        <text class="favorites-count">收藏了 {{ favoriteCount }} 个商家</text>
      </view>
      <text class="favorites-arrow">›</text>
    </view>

    <!-- 我的功能 -->
    <view class="menu-card">
      <view class="menu-title">我的功能</view>
      <view class="feature-grid">
        <view v-for="f in features" :key="f.text" class="feature-item" @tap="f.onTap">
          <view class="feature-icon" :style="{ background: f.bg }">
            <CategoryIcon :name="f.iconName" :size="22" />
          </view>
          <text class="feature-text">{{ f.text }}</text>
        </view>
      </view>
    </view>

    <!-- 更多推荐 -->
    <view class="menu-card">
      <view class="menu-title">更多推荐</view>
      <view class="recommend-list">
        <view v-for="r in recommends" :key="r.text" class="recommend-item" @tap="r.onTap">
          <view class="recommend-icon" :style="{ background: r.bg }">
            <CategoryIcon :name="r.iconName" :size="20" />
          </view>
          <view class="recommend-info">
            <text class="recommend-title">{{ r.text }}</text>
            <text v-if="r.sub" class="recommend-sub">{{ r.sub }}</text>
          </view>
          <text class="recommend-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- #ifdef H5 -->
    <GlobalTabbar />
    <!-- #endif -->

    <!-- 底部安全区 -->
    <view class="safe-bottom" />
  </view>
</template>

<script setup lang="ts">
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import GlobalTabbar from '@/components/GlobalTabbar/GlobalTabbar.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import { useTabStore } from '@/store/tab'
import { useUserStore } from '@/store/user'
import { onShow } from '@dcloudio/uni-app'
import { ref, computed, onMounted } from 'vue'
import { getFavorites, getMyCoupons } from '@/api'

const tabStore = useTabStore()
const userStore = useUserStore()

const favoriteCount = ref(0)
const favoriteMerchants = ref<any[]>([])
const couponCount = ref(0)
const points = ref(0)

const assets = computed(() => [
  { value: '¥' + Number(userStore.userInfo?.balance || 0).toFixed(2), label: '余额', onTap: () => uni.showToast({ title: '余额功能开发中', icon: 'none' }) },
  { value: couponCount.value, label: '优惠券', onTap: () => uni.switchTab({ url: '/pages/coupon/index' }) },
  { value: points.value, label: '积分', onTap: () => uni.showToast({ title: '积分功能开发中', icon: 'none' }) }
])

async function loadProfileData() {
  try {
    const favPage = await getFavorites({ current: 1, size: 3 })
    favoriteCount.value = favPage.total || 0
    const favList = favPage?.list || []
    favoriteMerchants.value = favList.slice(0, 3)
  } catch (e) {
    console.error('加载收藏失败', e)
    favoriteCount.value = 0
    favoriteMerchants.value = []
  }

  try {
    // 后端返回 PageResult 格式 { list: [], total: number }
    const couponsRes: any = await getMyCoupons()
    let list: any[] = []
    if (couponsRes) {
      if (Array.isArray(couponsRes)) {
        list = couponsRes
      } else if (Array.isArray(couponsRes.list)) {
        list = couponsRes.list
      } else if (Array.isArray(couponsRes.records)) {
        list = couponsRes.records
      }
    }
    // 统计未使用的优惠券（status=1表示可用）
    couponCount.value = list.filter((c: any) => c && c.status === 0).length
  } catch (e) {
    console.error('加载优惠券失败', e)
    couponCount.value = 0
  }

  // 从用户信息获取积分
  points.value = userStore.userInfo?.points || 0
}

onMounted(() => {
  loadProfileData()
})

onShow(() => {
  tabStore.setActiveTab('/pages/profile/index')
  // 刷新用户资料，确保 phoneBound 状态最新
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {})
  }
})

const features = [
  { iconName: 'address', text: '我的地址', bg: 'rgba(255, 195, 0, 0.12)', onTap: () => uni.navigateTo({ url: '/pages/address/list' }) },
  { iconName: 'service', text: '客服中心', bg: 'rgba(0, 200, 83, 0.12)', onTap: () => uni.navigateTo({ url: '/pages/service/index' }) },
  { iconName: 'order', text: '我的评价', bg: 'rgba(255, 195, 0, 0.12)', onTap: () => uni.navigateTo({ url: '/pages/profile/reviews' }) }
]

const recommends = [
  { iconName: 'message', text: '消息中心', sub: '查看订单/优惠/系统消息', bg: 'rgba(255, 75, 51, 0.12)', onTap: () => uni.navigateTo({ url: '/pages/message/index' }) }
]

function goSettings() {
  uni.navigateTo({ url: '/pages/settings/index' })
}

function goBindPhone() {
  uni.navigateTo({ url: '/pages/bind-phone/index' })
}

function onFavorites() {
  uni.navigateTo({ url: '/pages/favorites/index' })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.profile {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 24px;
}

.profile-header {
  background: linear-gradient(180deg, $header-start 0%, $header-end 100%);
  padding-top: calc(var(--status-bar-height, 20px) + 52px);
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 28px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.35);
  overflow: hidden;
  flex-shrink: 0;
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.user-info {
  flex: 1;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: $text;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border-radius: $radius-round;
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text;
}

.user-email {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
}

.phone-bind-bar {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: $radius-md;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bind-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.bind-icon {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bind-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.bind-text {
  font-size: 13px;
  color: #fff;
  font-weight: 500;
}

.bind-text-warn {
  color: #fff;
  font-weight: 700;
}

.bind-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.bind-arrow {
  font-size: 18px;
  color: #fff;
}

.assets-card {
  background: $card;
  margin: -16px 16px 0;
  border-radius: $radius-lg;
  padding: 16px 0 12px;
  box-shadow: $shadow;
  position: relative;
  z-index: 2;
}

.assets-title {
  font-size: 15px;
  font-weight: 700;
  color: $text;
  padding: 0 16px 12px;
}

.assets-list {
  display: flex;
  align-items: center;
  overflow-x: auto;
  padding: 0 8px;
}

.assets-item {
  flex: 1;
  min-width: 64px;
  text-align: center;
  padding: 8px 4px;
}

.assets-value {
  font-size: 18px;
  font-weight: 700;
  color: $text;
}

.assets-label {
  font-size: 11px;
  color: $text-light;
  margin-top: 4px;
}

.favorites-card {
  background: $card;
  margin: 12px 16px 0;
  border-radius: $radius-lg;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: $shadow;
}

.favorites-thumbs {
  display: flex;
  gap: 4px;
}

.favorites-thumb {
  width: 44px;
  height: 44px;
  border-radius: $radius-sm;
  background: $bg;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  overflow: hidden;
}

.favorites-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.favorites-title {
  font-size: 15px;
  font-weight: 700;
  color: $text;
}

.favorites-count {
  font-size: 12px;
  color: $text-muted;
  margin-top: 2px;
}

.favorites-arrow {
  font-size: 18px;
  color: $text-muted;
}

.menu-card {
  background: $card;
  margin: 12px 16px 0;
  border-radius: $radius-lg;
  padding: 14px 0;
  box-shadow: $shadow;
}

.menu-title {
  font-size: 15px;
  font-weight: 700;
  color: $text;
  padding: 0 16px 12px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 0 8px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 4px;
}

.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: $radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $primary-dark;
}

.feature-text {
  font-size: 12px;
  color: $text-light;
}

.recommend-list {
  padding: 0 16px;
}

.recommend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid $border;
}

.recommend-item:last-child {
  border-bottom: none;
}

.recommend-icon {
  width: 40px;
  height: 40px;
  border-radius: $radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text;
  flex-shrink: 0;
}

.recommend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.recommend-title {
  font-size: 14px;
  color: $text;
}

.recommend-sub {
  font-size: 12px;
  color: $text-muted;
  margin-top: 2px;
}

.recommend-arrow {
  font-size: 16px;
  color: $text-muted;
}

.safe-bottom {
  height: calc($tabbar-height + 16px);
}
</style>
