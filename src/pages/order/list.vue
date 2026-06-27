<template>
  <view class="orders-page">
    <view class="orders-header">
      <text class="orders-header-title">我的订单</text>
    </view>

    <view class="orders-tabs">
      <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
        <view class="tabs-wrap">
          <view
            v-for="(tab, idx) in tabs"
            :key="idx"
            :class="['orders-tab', activeIdx === idx && 'active']"
            @tap="switchTab(idx)"
          >
            <text class="orders-tab-text">{{ tab }}</text>
            <view class="orders-tab-line"></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="orders-body" :style="{ height: bodyHeight + 'px' }">
      <view v-if="loading" class="orders-loading">
        <view class="orders-loading-spinner"></view>
        <text class="orders-loading-text">努力加载中...</text>
      </view>

      <template v-else>
        <view v-if="filteredOrders.length > 0" class="orders-list">
          <view
            v-for="order in filteredOrders"
            :key="order.id"
            class="orders-card"
          >
            <view class="orders-card-header">
              <view class="orders-merchant">
                <view class="orders-merchant-img-wrap">
                  <SmartImage
                    :src="order.merchantLogo"
                    :bg="order.merchantBg"
                    icon="shop"
                    :iconSize="18"
                    radius="4px"
                    mode="aspectFill"
                  />
                </view>
                <text class="orders-merchant-name">{{ order.merchantName }}</text>
                <text class="orders-merchant-arrow">></text>
              </view>
              <text :class="['orders-status', `orders-status-${order.statusType}`]">{{ order.statusText }}</text>
            </view>

            <view class="orders-card-body" @tap="goDetail(order.id)">
              <view class="orders-dish-img-wrap">
                <SmartImage
                  :src="order.dishImage"
                  :bg="order.merchantBg"
                  :icon="order.icon || 'package'"
                  :iconSize="28"
                  radius="8px"
                  mode="aspectFill"
                />
              </view>
              <view class="orders-dish-info">
                <text class="orders-dish-name">{{ order.dishName }}</text>
                <text class="orders-dish-spec">{{ order.spec }}</text>
                <view class="orders-dish-bottom">
                  <text class="orders-dish-count">共 {{ order.count }} 件</text>
                  <view class="orders-fee-info">
                    <text v-if="order.diningType !== 3 && order.deliveryFee > 0" class="orders-delivery-fee">含配送费¥{{ Number(order.deliveryFee).toFixed(2) }}</text>
                    <text v-else-if="order.diningType === 3" class="orders-delivery-fee orders-free">自取免配送费</text>
                    <text class="orders-dish-price">
                      <text class="orders-dish-price-symbol">¥</text>
                      <text class="orders-dish-price-num">{{ order.amount }}</text>
                    </text>
                  </view>
                </view>
              </view>
            </view>

            <view class="orders-card-footer">
              <text class="orders-time">{{ order.time }}</text>
              <view class="orders-actions">
                <view
                  v-for="(btn, bIdx) in order.btns"
                  :key="bIdx"
                  :class="['orders-action-btn', btn.type === 'primary' && 'primary', btn.type === 'secondary' && 'secondary']"
                  @tap="onBtnClick(order, btn)"
                >
                  <text>{{ btn.text }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="orders-empty">
          <view class="orders-empty-icon">
            <CategoryIcon name="ticket-empty" :size="72" />
          </view>
          <text class="orders-empty-title">暂无相关订单</text>
          <text class="orders-empty-subtitle">去看看有什么好店吧</text>
        </view>
      </template>

      <view style="height: 20px;"></view>
    </scroll-view>

    <!-- #ifdef H5 -->
    <GlobalTabbar />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useTabStore } from '@/store/tab'
import { getOrderPage, getOrderDelivery, cancelOrder} from '@/api'
import type { OrderVO } from '@/types/api'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import GlobalTabbar from '@/components/GlobalTabbar/GlobalTabbar.vue'
import { ORDER_STATUS_MAP, orderStatusText, orderStatusType } from '@/utils/format'

const tabStore = useTabStore()
const tabs = ref(['待付款', '待接单', '配送中', '已完成', '待评价', '退款/售后', '全部'])
// 配送中tab覆盖2/3/11/5状态（备餐中、骑手已接单、骑手已到店、配送中）；4(WAITING_RIDER)已废弃不再作为独立状态
const tabStatusMap: (number | number[] | undefined)[] = [0, 1, [2, 3, 11, 5], 7, 6, [9, 10], undefined]
const activeIdx = ref(0)
const loading = ref(false)
const bodyHeight = ref(600)
const rawOrders = ref<OrderVO[]>([])

onLoad(() => {
  uni.getSystemInfo({
    success: (res: any) => {
      bodyHeight.value = res.windowHeight - 44 - 48
    }
  })
})

onShow(() => {
  tabStore.setActiveTab('/pages/order/list')
  fetchOrders()
  // 订阅订单状态变更（WebSocket 推送）
  uni.$on('orderStatusChanged', onOrderStatusChanged)
})

onHide(() => {
  uni.$off('orderStatusChanged', onOrderStatusChanged)
})

onUnload(() => {
  uni.$off('orderStatusChanged', onOrderStatusChanged)
})

onUnmounted(() => {
  uni.$off('orderStatusChanged', onOrderStatusChanged)
})

/** WebSocket 推送的订单状态变更回调，刷新列表 */
function onOrderStatusChanged(_msg: any) {
  fetchOrders()
}

const statusTextMap = ORDER_STATUS_MAP
const statusTypeMap: Record<number, string> = {}
Object.keys(ORDER_STATUS_MAP).forEach(k => {
  statusTypeMap[Number(k)] = ORDER_STATUS_MAP[Number(k)].type
})

// 状态对应的图标
const statusIconMap: Record<number, string> = {}
Object.keys(ORDER_STATUS_MAP).forEach(k => {
  statusIconMap[Number(k)] = ORDER_STATUS_MAP[Number(k)].icon
})

const merchantBgList = [
  'linear-gradient(135deg, #FF6B35, #FFC107)',
  'linear-gradient(135deg, #4CAF50, #8BC34A)',
  'linear-gradient(135deg, #E91E63, #FF8A65)',
  'linear-gradient(135deg, #2196F3, #03A9F4)',
  'linear-gradient(135deg, #9C27B0, #BA68C8)',
  'linear-gradient(135deg, #FF5722, #FF8A65)',
  'linear-gradient(135deg, #FFC107, #FFD54F)'
]

function merchantBg(id?: number) {
  if (!id) return merchantBgList[0]
  return merchantBgList[id % merchantBgList.length]
}

function buildDisplayOrder(order: OrderVO) {
  const firstItem = order.items?.[0]
  const itemNames = order.items?.map(it => it.dishName).filter(Boolean).join(' + ') || '商品'
  const spec = [firstItem?.specName].filter(Boolean).join(' / ') || ''
  const count = order.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0
  const status = order.status ?? 7
  const statusInfo = ORDER_STATUS_MAP[status] || { text: '已完成', type: 'default', icon: 'check' }
  const statusText = order.statusDesc || statusInfo.text
  const statusType = statusInfo.type
  const icon = (status === 9 || status === 10) ? 'refund' : statusInfo.icon

  // 获取商家logo和商品图片URL
  const merchantLogo = isImageUrl(order.merchantLogo) ? order.merchantLogo : ''
  const dishImage = firstItem?.dishImage && isImageUrl(firstItem.dishImage) ? firstItem.dishImage : ''

  const btns: { text: string; type: string }[] = []
  if (status === 0) {
    btns.push({ text: '取消订单', type: 'default' })
    btns.push({ text: '去支付', type: 'primary' })
  } else if (status === 1 || status === 2 || status === 4) {
    // 待接单/备餐中/等待骑手：可申请退款、催单
    btns.push({ text: '申请退款', type: 'default' })
    btns.push({ text: '催单', type: 'primary' })
  } else if (status === 3 || status === 11) {
    // 骑手已接单/骑手已到店：可联系骑手
    btns.push({ text: '查看配送', type: 'default' })
    btns.push({ text: '联系骑手', type: 'primary' })
  } else if (status === 5) {
    btns.push({ text: '查看配送', type: 'default' })
    btns.push({ text: '联系骑手', type: 'primary' })
  } else if (status === 6 || status === 7) {
    // 已评价后不再显示"去评价"按钮
    const isRated = order.isRated === 1
    if (status === 6) {
      if (!isRated) btns.push({ text: '去评价', type: 'primary' })
    } else {
      btns.push({ text: '再来一单', type: 'default' })
      if (!isRated) btns.push({ text: '去评价', type: 'primary' })
    }
  } else if (status === 8) {
    btns.push({ text: '删除订单', type: 'default' })
    btns.push({ text: '再来一单', type: 'primary' })
  } else if (status === 9) {
    btns.push({ text: '撤销申请', type: 'default' })
    btns.push({ text: '查看进度', type: 'primary' })
  } else if (status === 10) {
    btns.push({ text: '删除订单', type: 'default' })
    btns.push({ text: '再来一单', type: 'primary' })
  }

  return {
    id: order.id,
    merchantName: order.merchantName || '未知商家',
    merchantLogo,
    merchantBg: merchantBg(order.merchantId),
    statusText,
    statusType,
    dishName: itemNames,
    dishImage,
    spec,
    count,
    amount: order.payAmount?.toFixed(2) || '0.00',
    goodsAmount: order.totalAmount?.toFixed(2) || '0.00',
    deliveryFee: order.diningType === 3 ? 0 : (order.deliveryFee || 0),
    diningType: order.diningType || 2,
    time: order.createdAt || '',
    icon,
    btns,
    raw: order
  }
}

/** 判断是否是有效的图片URL */
function isImageUrl(url?: string): boolean {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')
}

const displayOrders = computed(() => rawOrders.value.map(buildDisplayOrder))

const filteredOrders = computed(() => {
  const tabVal = tabStatusMap[activeIdx.value]
  if (tabVal === undefined) return displayOrders.value
  if (Array.isArray(tabVal)) {
    return displayOrders.value.filter(o => tabVal.includes(o.raw.status ?? 7))
  }
  if (tabVal === 9) {
    return displayOrders.value.filter(o => o.raw.status === 9 || o.raw.status === 10)
  }
  return displayOrders.value.filter(o => o.raw.status === tabVal)
})

async function fetchOrders() {
  if (loading.value) return
  loading.value = true
  try {
    const tabVal = tabStatusMap[activeIdx.value]
    const params: { status?: number; current: number; size: number } = { current: 1, size: 20 }
    // 只有单一数字状态才传给后端过滤，数组/undefined（全部）不传status
    if (typeof tabVal === 'number' && tabVal !== 9) params.status = tabVal
    const res = await getOrderPage(params)
    rawOrders.value = res.list || []
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchTab(idx: number) {
  if (activeIdx.value === idx || loading.value) return
  activeIdx.value = idx
  fetchOrders()
}

function goDetail(id: string | number) {
  uni.navigateTo({ url: `/pages/order/detail?id=${id}` })
}

function callRider(phone: string) {
  uni.showModal({
    title: '联系骑手',
    content: `拨打 ${phone}`,
    confirmText: '拨打',
    success: (r) => {
      if (r.confirm) {
        uni.makePhoneCall({ phoneNumber: phone })
      }
    }
  })
}

async function onBtnClick(order: any, btn: any) {
  const id = order.id
  if (btn.text === '再来一单') {
    uni.showToast({ title: '已加入购物车', icon: 'none' })
  } else if (btn.text === '取消订单') {
    uni.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？取消后不可恢复。',
      confirmText: '确定取消',
      confirmColor: '#FF6B35',
      success: async (r) => {
        if (r.confirm) {
          try {
            uni.showLoading({ title: '取消中...' })
            await cancelOrder(id, '用户主动取消')
            uni.hideLoading()
            uni.showToast({ title: '订单已取消', icon: 'success' })
            // 刷新订单列表
            await fetchOrders()
          } catch (e: any) {
            uni.hideLoading()
            uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
          }
        }
      }
    })
  } else if (btn.text === '去支付') {
    uni.navigateTo({ url: `/pages/order/payment?id=${id}&amount=${order.raw.payAmount}&deliveryFee=${order.raw.deliveryFee || 0}&totalAmount=${order.raw.totalAmount || 0}` })
  } else if (btn.text === '申请退款') {
    uni.navigateTo({ url: `/pages/order/refund?id=${id}&amount=${order.raw.payAmount}` })
  } else if (btn.text === '查看进度') {
    uni.navigateTo({ url: `/pages/refund/detail?id=${id}` })
  } else if (btn.text === '查看配送') {
    uni.navigateTo({ url: `/pages/order/delivery?id=${id}` })
  } else if (btn.text === '联系骑手') {
    if (order.raw.riderPhone) {
      callRider(order.raw.riderPhone)
    } else {
      // 从配送跟踪接口获取骑手电话
      try {
        uni.showLoading({ title: '获取中' })
        const delivery = await getOrderDelivery(order.id)
        uni.hideLoading()
        const phone = delivery?.rider?.phone
        if (phone) {
          callRider(phone)
        } else {
          uni.showToast({ title: '暂无骑手联系方式', icon: 'none' })
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '获取骑手信息失败', icon: 'none' })
      }
    }
  } else if (btn.text === '去评价') {
    uni.navigateTo({ url: `/pages/order/rating?id=${id}&merchantId=${order.raw.merchantId}` })
  } else if (btn.text === '撤销申请') {
    uni.showToast({ title: '请在退款详情页操作', icon: 'none' })
  } else if (btn.text === '催单') {
    uni.showToast({ title: '已催促商家尽快处理', icon: 'none' })
  } else {
    uni.showToast({ title: btn.text, icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.orders-page {
  min-height: 100vh;
  background: $bg;
}

.orders-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, $header-start, $header-end);
}

.orders-header-title {
  font-size: 17px;
  font-weight: 700;
  color: $text;
}

.orders-tabs {
  background: $card;
  border-bottom: 1px solid $border;
}

.tabs-scroll {
  white-space: nowrap;
}

.tabs-wrap {
  display: inline-flex;
  padding: 0 12px;
}

.orders-tab {
  position: relative;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.orders-tab-text {
  font-size: 14px;
  color: $text-light;
  transition: color 0.2s;
  white-space: nowrap;
}

.orders-tab-line {
  position: absolute;
  bottom: 6px;
  width: 0;
  height: 3px;
  border-radius: 2px;
  background: $primary;
  transition: width 0.2s;
}

.orders-tab.active .orders-tab-text {
  color: $text;
  font-weight: 700;
}

.orders-tab.active .orders-tab-line {
  width: 24px;
}

.orders-body {
  background: $bg;
}

.orders-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
}

.orders-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba($primary, 0.25);
  border-top-color: $primary;
  border-radius: 50%;
  animation: orders-spin 0.8s linear infinite;
}

@keyframes orders-spin {
  to {
    transform: rotate(360deg);
  }
}

.orders-loading-text {
  margin-top: 12px;
  font-size: 13px;
  color: $text-muted;
}

.orders-shops {
  display: none;
}

.orders-shops-title {
  display: none;
}

.orders-shops-scroll {
  display: none;
}

.orders-shops-list {
  display: none;
}

.orders-shop-card {
  display: none;
}

.orders-shop-img {
  display: none;
}

.orders-shop-name {
  display: none;
}

.orders-shop-count {
  display: none;
}

.orders-list {
  padding-top: 12px;
}

.orders-card {
  margin: 0 16px 12px;
  background: $card;
  border-radius: $radius-lg;
  box-shadow: $shadow;
  overflow: hidden;
}

.orders-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}

.orders-merchant {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.orders-merchant-img-wrap {
  width: 28px;
  height: 28px;
  border-radius: $radius-sm;
  margin-right: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.orders-merchant-name {
  font-size: 15px;
  font-weight: 600;
  color: $text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orders-merchant-arrow {
  font-size: 13px;
  color: $text-muted;
  margin-left: 4px;
}

.orders-status {
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 8px;
}

.orders-status-default {
  color: $text-muted;
}

.orders-status-warning {
  color: $warning;
}

.orders-status-danger {
  color: $danger;
}

.orders-card-body {
  display: flex;
  padding: 0 16px 14px;
}

.orders-dish-img-wrap {
  width: 72px;
  height: 72px;
  border-radius: $radius-md;
  margin-right: 12px;
  flex-shrink: 0;
  overflow: hidden;
}

.orders-dish-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.orders-dish-name {
  font-size: 14px;
  font-weight: 500;
  color: $text;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.orders-dish-spec {
  font-size: 12px;
  color: $text-muted;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orders-dish-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 8px;
}

.orders-dish-count {
  font-size: 12px;
  color: $text-muted;
}

.orders-dish-price {
  color: $text;
}

.orders-dish-price-symbol {
  font-size: 12px;
  font-weight: 600;
}

.orders-dish-price-num {
  font-size: 18px;
  font-weight: 700;
}

.orders-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid $border;
}

.orders-time {
  font-size: 12px;
  color: $text-muted;
}

.orders-actions {
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.orders-action-btn {
  padding: 6px 14px;
  border-radius: 16px;
  border: 1px solid $border;
  background: $card;
}

.orders-action-btn text {
  font-size: 13px;
  color: $text-light;
}

.orders-action-btn.primary {
  background: $primary;
  border-color: $primary;
}

.orders-action-btn.primary text {
  color: $text;
  font-weight: 600;
}

.orders-action-btn.secondary {
  background: $secondary;
  border-color: $secondary;
}

.orders-action-btn.secondary text {
  color: #fff;
}

.orders-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120px;
}

.orders-empty-icon {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $primary;
  box-shadow: $shadow;
  margin-bottom: 24px;
}

.orders-empty-title {
  font-size: 15px;
  color: $text-light;
  margin-bottom: 8px;
}

.orders-empty-subtitle {
  font-size: 13px;
  color: $text-muted;
}
</style>
