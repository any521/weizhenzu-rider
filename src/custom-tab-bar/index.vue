<template>
  <view class="custom-tab-bar">
    <view class="tab-main">
      <view
        v-for="tab in leftTabs"
        :key="tab.pagePath"
        class="tab-item"
        :class="{ active: tabStore.activeTab === tab.pagePath }"
        @tap="switchTab(tab)"
      >
        <view class="tab-icon">
          <CategoryIcon :name="tab.iconName" :size="24" />
        </view>
        <text class="tab-text">{{ tab.text }}</text>
      </view>

      <!-- 中间购物车按钮（凸起） -->
      <view class="tab-center" :class="{ active: tabStore.activeTab === centerTab.pagePath }" @tap="switchTab(centerTab)">
        <view class="center-btn">
          <view class="center-icon">
            <CategoryIcon name="cart" :size="26" />
            <view v-if="cartStore.totalCount > 0" class="cart-badge">
              {{ cartStore.totalCount > 99 ? '99+' : cartStore.totalCount }}
            </view>
          </view>
          <text class="center-text">购物车</text>
        </view>
      </view>

      <view
        v-for="tab in rightTabs"
        :key="tab.pagePath"
        class="tab-item"
        :class="{ active: tabStore.activeTab === tab.pagePath }"
        @tap="switchTab(tab)"
      >
        <view class="tab-icon">
          <CategoryIcon :name="tab.iconName" :size="24" />
        </view>
        <text class="tab-text">{{ tab.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import { useTabStore } from '@/store/tab'
import { useCartStore } from '@/store/cart'

const tabStore = useTabStore()
const cartStore = useCartStore()

const leftTabs = [
  { pagePath: '/pages/index/index', text: '外卖', iconName: 'home' },
  { pagePath: '/pages/coupon/index', text: '神券', iconName: 'ticket' }
]

const centerTab = { pagePath: '/pages/cart/index', text: '购物车', iconName: 'cart' }

const rightTabs = [
  { pagePath: '/pages/order/list', text: '订单', iconName: 'order' },
  { pagePath: '/pages/profile/index', text: '我的', iconName: 'profile' }
]

function switchTab(tab: any) {
  if (tabStore.activeTab === tab.pagePath) return
  tabStore.setActiveTab(tab.pagePath)
  uni.switchTab({ url: tab.pagePath })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.custom-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1px solid $border;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
  z-index: 999;
}

.tab-main {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  position: relative;
}

.tab-item {
  width: 0;
  flex: 1;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: $text-muted;
  transition: color 0.2s ease;
}

.tab-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-text {
  font-size: 10px;
  line-height: 1.2;
}

.tab-item.active {
  color: $primary;
}

.tab-item.active .tab-icon {
  color: $primary;
  transform: scale(1.08);
}

.tab-center {
  width: 80px;
  height: 70px;
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
}

.center-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(180deg, $header-start 0%, $header-end 100%);
  box-shadow: 0 4px 14px rgba(229, 57, 53, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 3px solid #fff;
  position: relative;
  transition: transform 0.2s ease;
}

.tab-center.active .center-btn {
  transform: scale(1.05);
}

.center-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.cart-badge {
  position: absolute;
  top: -10px;
  right: -12px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #ff3b30;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
  box-sizing: border-box;
  line-height: 1;
}

.center-text {
  font-size: 9px;
  font-weight: 600;
  margin-top: 1px;
  line-height: 1;
}
</style>
