<template>
  <view class="cart">
    <!-- 空状态 -->
    <view v-if="cartStore.isEmpty" class="empty">
      <CategoryIcon name="empty-cart" :size="80" class="empty-icon" />
      <text class="empty-text">购物车空空如也</text>
      <view class="empty-btn" @tap="goHome">去逛逛</view>
    </view>

    <!-- 多商家分组列表 -->
    <view v-else class="group-list">
      <view
        v-for="group in cartStore.groups"
        :key="group.merchantId"
        class="merchant-group"
      >
        <!-- 商家信息栏 -->
        <view class="merchant-header">
          <view class="merchant-info">
            <image
              v-if="group.merchantLogo"
              :src="group.merchantLogo"
              class="merchant-logo"
              mode="aspectFill"
            />
            <view v-else class="merchant-logo merchant-logo--default">
              <CategoryIcon name="shop" :size="20" />
            </view>
            <text class="merchant-name">{{ group.merchantName || '商家' }}</text>
          </view>
        </view>

        <!-- 菜品列表（swipe-cell 左滑删除） -->
        <view class="items-wrap">
          <van-swipe-cell v-for="item in group.items" :key="item.id">
            <view class="cart-item">
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
                  <text class="item-price">¥{{ Number(item.unitPrice).toFixed(2) }}</text>
                  <van-stepper
                    :model-value="item.quantity"
                    :min="0"
                    :max="99"
                    button-size="24"
                    input-width="36px"
                    theme="round"
                    @change="(val: number) => onQtyChange(item, val)"
                  />
                </view>
              </view>
            </view>
            <template #right>
              <view class="swipe-delete" @tap="onDelete(item)">
                <van-icon name="delete-o" size="20" color="#fff" />
                <text class="swipe-delete-text">删除</text>
              </view>
            </template>
          </van-swipe-cell>
        </view>

        <!-- 金额明细 -->
        <view class="fee-card">
          <view class="fee-row">
            <text class="fee-label">商品总额</text>
            <text class="fee-value">¥{{ Number(group.totalAmount || 0).toFixed(2) }}</text>
          </view>
          <view v-if="cartStore.diningType !== 3" class="fee-row">
            <text class="fee-label">配送费</text>
            <text class="fee-value">¥{{ Number(group.deliveryFee || 0).toFixed(2) }}</text>
          </view>
          <view v-else class="fee-row">
            <text class="fee-label">配送费</text>
            <text class="fee-value" style="color: #00C853;">自取免配送费</text>
          </view>
          <view v-if="Number(group.packingFee || 0) > 0" class="fee-row">
            <text class="fee-label">打包费</text>
            <text class="fee-value">¥{{ Number(group.packingFee || 0).toFixed(2) }}</text>
          </view>
          <view class="fee-divider"></view>
          <view class="fee-row fee-row--total">
            <text class="fee-label">合计</text>
            <text class="fee-total">¥{{ groupPayable(group).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 该商家结算栏 -->
        <view class="group-footer">
          <view class="group-total-area">
            <text class="group-total-label">共{{ groupItemsCount(group) }}件，合计：</text>
            <text class="group-total-price">¥{{ groupPayable(group).toFixed(2) }}</text>
          </view>
          <view v-if="group.reachMinAmount !== false" class="checkout-btn" @tap="goCheckout(group)">
            去结算
          </view>
          <view v-else class="checkout-btn checkout-btn--disabled">
            还差¥{{ groupDiff(group).toFixed(2) }}起送
          </view>
        </view>
      </view>

      <!-- 底部安全间距 -->
      <view class="bottom-safe"></view>
    </view>

    <!-- #ifdef H5 -->
    <GlobalTabbar />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { SwipeCell as VanSwipeCell, Stepper as VanStepper, Icon as VanIcon } from 'vant'
import 'vant/es/swipe-cell/style'
import 'vant/es/stepper/style'
import 'vant/es/icon/style'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import GlobalTabbar from '@/components/GlobalTabbar/GlobalTabbar.vue'
import { useCartStore } from '@/store/cart'
import { useTabStore } from '@/store/tab'
import type { CartItemVO, CartGroupVO } from '@/types/api'

const cartStore = useCartStore()
const tabStore = useTabStore()

onShow(() => {
  tabStore.setActiveTab('/pages/cart/index')
  cartStore.fetchCart()
})

/** 计算分组的商品件数 */
function groupItemsCount(group: CartGroupVO): number {
  return group.items.reduce((s, i) => s + i.quantity, 0)
}

/** 计算分组应付金额 */
function groupPayable(group: CartGroupVO): number {
  if (Number(group.payAmount || 0) > 0) return Number(group.payAmount)
  const deliveryFee = cartStore.diningType === 3 ? 0 : Number(group.deliveryFee || 0)
  return Number(group.totalAmount || 0) + deliveryFee + Number(group.packingFee || 0)
}

/** 计算距离起送价的差额 */
function groupDiff(group: CartGroupVO): number {
  const min = Number(group.minOrderAmount || 0)
  const total = Number(group.totalAmount || 0)
  return Math.max(0, min - total)
}

/** 数量变化 */
function onQtyChange(item: CartItemVO, val: number) {
  const qty = Number(val) || 0
  if (qty <= 0) {
    cartStore.remove(item.id)
  } else {
    cartStore.changeQty(item.id, qty)
  }
}

/** 删除菜品 */
function onDelete(item: CartItemVO) {
  uni.showModal({
    title: '提示',
    content: `确定移除「${item.dishName}」吗？`,
    confirmColor: '#FF4B33',
    success: (res) => {
      if (res.confirm) {
        cartStore.remove(item.id)
      }
    },
  })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

/** 跳转到该商家的结算页 */
function goCheckout(group: CartGroupVO) {
  if (group.reachMinAmount === false) return
  uni.navigateTo({
    url: `/pages/order/checkout?merchantId=${group.merchantId}&diningType=${cartStore.diningType}`,
  })
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
  padding-top: calc(var(--status-bar-height, 20px) + 44px + 20px);
  padding-bottom: $tabbar-safe;
}

/* ---------- 空状态 ---------- */
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

/* ---------- 分组列表容器 ---------- */
.group-list {
  padding-bottom: 8px;
}

/* ---------- 商家分组卡片 ---------- */
.merchant-group {
  background: #fff;
  margin: 12px 12px 0;
  border-radius: $radius-md;
  box-shadow: $shadow;
  overflow: hidden;
}

/* 商家信息头部 */
.merchant-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid $border;
}

.merchant-info {
  display: flex;
  align-items: center;
}

.merchant-logo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
}

.merchant-logo--default {
  background: linear-gradient(135deg, rgba(255, 75, 51, 0.1), rgba(255, 107, 107, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  color: $primary;
}

.merchant-name {
  font-size: 15px;
  font-weight: 600;
  color: $text;
}

/* ---------- 菜品列表 ---------- */
.items-wrap {
  background: #fff;
}

.cart-item {
  display: flex;
  padding: 14px 16px;
  background: #fff;
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
  color: $text;
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
  flex-wrap: nowrap;
  gap: 8px;
}

.item-price {
  color: $primary;
  font-size: 16px;
  font-weight: 700;
}

/* 左滑删除按钮 */
.swipe-delete {
  width: 80px;
  height: 100%;
  background: $danger;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.swipe-delete-text {
  color: #fff;
  font-size: 12px;
}

/* ---------- 金额明细 ---------- */
.fee-card {
  background: #fff;
  padding: 12px 16px;
  border-top: 1px dashed $border;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 13px;
}

.fee-label {
  color: $text-light;
}

.fee-value {
  color: $text-light;
}

.fee-divider {
  height: 1px;
  background: $border;
  margin: 6px 0;
}

.fee-row--total {
  padding-top: 8px;
}

.fee-total {
  color: $primary;
  font-size: 18px;
  font-weight: 700;
}

/* ---------- 分组结算栏 ---------- */
.group-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid $border;
}

.group-total-area {
  flex: 1;
  display: flex;
  align-items: baseline;
}

.group-total-label {
  font-size: 12px;
  color: $text-muted;
}

.group-total-price {
  color: $primary;
  font-size: 18px;
  font-weight: 700;
}

.checkout-btn {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  padding: 0 22px;
  height: 38px;
  line-height: 38px;
  border-radius: 19px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  flex-shrink: 0;
}

.checkout-btn--disabled {
  background: linear-gradient(135deg, #ccc, #ddd);
  font-size: 12px;
}

/* 底部安全间距 */
.bottom-safe {
  height: 20px;
}

/* ---------- Vant 组件样式覆盖 ---------- */
:deep(.van-stepper) {
  background: transparent;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
}

:deep(.van-stepper__minus),
:deep(.van-stepper__plus) {
  width: 28px;
  height: 28px;
  border: 1px solid $primary;
  border-radius: 50%;
  color: $primary;
  background: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  margin: 0;
}

:deep(.van-stepper__minus--disabled) {
  border-color: #ddd;
  color: #ccc;
  background: #f7f7f7;
}

:deep(.van-stepper__input) {
  width: 36px;
  height: 28px;
  font-size: 14px;
  color: $text;
  background: transparent;
  flex-shrink: 0;
  margin: 0 4px;
}
</style>
