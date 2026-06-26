<template>
  <view class="cart">
    <view v-if="!items.length" class="empty">
      <CategoryIcon name="empty-cart" :size="80" class="empty-icon" />
      <text class="empty-text">购物车空空如也</text>
      <view class="empty-btn" @tap="goHome">去逛逛</view>
    </view>
    <view v-else>
      <view class="merchant-bar">
        <CategoryIcon name="shop" :size="18" class="m-icon" />
        <text class="m-name">{{ cartStore.merchantName || '商家' }}</text>
      </view>
      <view class="cart-list">
        <view v-for="item in items" :key="item.id" class="cart-item">
          <view class="item-img-wrap">
            <SmartImage
              :src="item.dishImage"
              bg="linear-gradient(135deg, #FF6B35, #FFC107)"
              icon="meishi"
              :iconSize="28"
              radius="8px"
              mode="aspectFill"
            />
          </view>
          <view class="item-info">
            <view class="item-name">{{ item.dishName }}</view>
            <view class="item-spec">{{ item.specName || '默认' }}</view>
            <view class="item-bottom">
              <text class="item-price">¥{{ item.unitPrice.toFixed(2) }}</text>
              <view class="qty-control">
                <text class="qty-btn" @tap="onDec(item)">−</text>
                <text class="qty-num">{{ item.quantity }}</text>
                <text class="qty-btn" @tap="onInc(item)">+</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="fee-card">
        <view class="fee-row"><text>商品金额</text><text>¥{{ cartStore.totalAmount.toFixed(2) }}</text></view>
        <view class="fee-row"><text>配送费</text><text>¥{{ cartStore.deliveryFee.toFixed(2) }}</text></view>
        <view v-if="cartStore.packingFee > 0" class="fee-row"><text>打包费</text><text>¥{{ cartStore.packingFee.toFixed(2) }}</text></view>
      </view>
    </view>

    <view v-if="items.length" class="footer-bar">
      <view class="total-area">
        <text class="total-label">合计：</text>
        <text class="total-price">¥{{ payable.toFixed(2) }}</text>
      </view>
      <view class="checkout-btn" @tap="goCheckout">去结算({{ totalCount }})</view>
    </view>

    <!-- #ifdef H5 -->
    <GlobalTabbar />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import GlobalTabbar from '@/components/GlobalTabbar/GlobalTabbar.vue'
import { useCartStore } from '@/store/cart'
import { useTabStore } from '@/store/tab'
import type { CartItemVO } from '@/types/api'

const cartStore = useCartStore()
const tabStore = useTabStore()

const items = computed(() => cartStore.items)
const totalCount = computed(() => cartStore.totalCount)
const payable = computed(() => {
  if (cartStore.payAmount > 0) return cartStore.payAmount
  return cartStore.totalAmount + cartStore.deliveryFee + cartStore.packingFee
})

onShow(() => {
  tabStore.setActiveTab('/pages/cart/index')
  cartStore.fetchCart()
})

function onInc(item: CartItemVO) {
  cartStore.changeQty(item.id, item.quantity + 1)
}
function onDec(item: CartItemVO) {
  const quantity = item.quantity - 1
  if (quantity <= 0) {
    cartStore.remove(item.id)
  } else {
    cartStore.changeQty(item.id, quantity)
  }
}
function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
function goCheckout() {
  uni.navigateTo({ url: '/pages/order/checkout' })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

// TabBar高度约 56px + safe-area-inset-bottom
$tabbar-height: 56px;
$tabbar-safe: calc(#{$tabbar-height} + env(safe-area-inset-bottom));

.cart {
  min-height: 100vh;
  background: $bg;
  padding-bottom: $tabbar-safe;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100px 0;
  color: $text-muted;
}

.empty-icon {
  margin-bottom: 16px;
  color: $text-muted;
  opacity: 0.6;
}

.empty-text {
  font-size: 14px;
  margin-bottom: 20px;
}

.empty-btn {
  background: $primary;
  color: #fff;
  padding: 10px 28px;
  border-radius: 22px;
  font-size: 14px;
}

.merchant-bar {
  background: #fff;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid $border;
}

.m-icon {
  margin-right: 8px;
  color: $primary;
}

.m-name {
  font-size: 15px;
  font-weight: 600;
}

.cart-list {
  background: #fff;
  margin-top: 8px;
}

.cart-item {
  display: flex;
  padding: 14px 16px;
  border-bottom: 1px solid $border;
}

.item-img-wrap {
  width: 76px;
  height: 76px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.item-info {
  flex: 1;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
}

.item-spec {
  font-size: 12px;
  color: $text-muted;
  margin-top: 4px;
}

.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-price {
  color: $primary;
  font-size: 16px;
  font-weight: 700;
}

.qty-control {
  display: flex;
  align-items: center;
}

.qty-btn {
  width: 26px;
  height: 26px;
  line-height: 24px;
  text-align: center;
  border: 1px solid $primary;
  color: $primary;
  border-radius: 13px;
  font-size: 14px;
  font-weight: 700;
}

.qty-num {
  min-width: 36px;
  text-align: center;
  font-size: 14px;
}

.fee-card {
  background: #fff;
  margin: 12px 16px;
  border-radius: $radius-md;
  padding: 14px 16px;
  box-shadow: $shadow;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: $text-light;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: $tabbar-safe;
  height: 56px;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-top: 1px solid $border;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  z-index: 99;
}

.total-area {
  flex: 1;
}

.total-label {
  font-size: 13px;
  color: $text-light;
}

.total-price {
  color: $primary;
  font-size: 20px;
  font-weight: 700;
}

.checkout-btn {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  padding: 0 24px;
  height: 42px;
  line-height: 42px;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 600;
}
</style>
