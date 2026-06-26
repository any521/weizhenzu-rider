<template>
  <view class="detail">
    <!-- 状态头部 -->
    <view class="status-header" :class="`status-${statusInfo.type}`">
      <view class="status-icon"><CategoryIcon :name="statusInfo.icon" :size="32" /></view>
      <view class="status-title">{{ order.status }}</view>
      <view class="status-sub">{{ statusInfo.sub }}</view>
    </view>

    <!-- 配送进度条（配送相关状态显示） -->
    <view v-if="showDeliveryProgress" class="progress-card">
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: deliveryProgress + '%' }"></view>
      </view>
      <view class="progress-steps">
        <view
          v-for="(step, idx) in deliverySteps"
          :key="idx"
          :class="['step', idx <= activeDeliveryStep && 'active']"
        >
          <view class="step-dot">
            <CategoryIcon v-if="idx <= activeDeliveryStep" name="check" :size="10" />
          </view>
          <text class="step-label">{{ step }}</text>
        </view>
      </view>
    </view>

    <!-- 骑手信息卡 -->
    <view v-if="showRider" class="rider-card">
      <view class="rider-avatar">
        <CategoryIcon name="avatar" :size="36" />
      </view>
      <view class="rider-info">
        <view class="rider-name">{{ rider.name }}</view>
        <view class="rider-meta">{{ rider.level }} · 配送中</view>
      </view>
      <view class="rider-actions">
        <view class="rider-btn" @tap="callRider">
          <CategoryIcon name="service" :size="18" />
          <text>联系骑手</text>
        </view>
        <view v-if="order.statusCode === 5" class="rider-btn primary" @tap="goDelivery">查看配送</view>
      </view>
    </view>

    <!-- 配送/到达时间 -->
    <view v-if="order.deliveryTime" class="delivery-time-card">
      <view class="delivery-time">{{ order.deliveryTime }}</view>
      <view v-if="order.riderName" class="delivery-time-sub">骑手{{ order.riderName }} · 配送用时 {{ order.deliveryDuration }} 分钟</view>
    </view>

    <view class="order-section">
      <view class="section-head"><text>订单信息</text></view>
      <view class="merchant-row">
        <view class="merchant-icon-sm-wrap">
          <SmartImage
            :src="merchantLogoUrl"
            bg="linear-gradient(135deg, #FF6B35, #FFC107)"
            icon="shop"
            :iconSize="16"
            radius="6px"
            mode="aspectFill"
          />
        </view>
        <text class="merchant-name-sm">{{ order.merchant.name }}</text>
      </view>
      <view v-for="(it, idx) in order.items" :key="idx" class="item-row">
        <view class="item-img-wrap">
          <SmartImage
            :src="it.imageUrl"
            :bg="it.bg"
            icon="meishi"
            :iconSize="22"
            radius="6px"
            mode="aspectFill"
          />
        </view>
        <view class="item-info">
          <view class="item-name">{{ it.name }}</view>
          <view class="item-spec">{{ it.spec }}</view>
        </view>
        <view class="item-price">¥{{ it.price.toFixed(2) }} × {{ it.qty }}</view>
      </view>
      <view class="summary-row"><text>商品金额</text><text>¥{{ order.goodsAmount.toFixed(2) }}</text></view>
      <view class="summary-row"><text>配送费</text><text>¥{{ order.deliveryFee.toFixed(2) }}</text></view>
      <view class="summary-row"><text>满减优惠</text><text style="color: $success;">-¥{{ order.discount.toFixed(2) }}</text></view>
      <view class="summary-row total">
        <text>实付</text>
        <text class="price">¥{{ order.payable.toFixed(2) }}</text>
      </view>
    </view>

    <view class="order-section">
      <view class="section-head"><text>配送信息</text></view>
      <view class="info-line">
        <text>订单编号</text>
        <view class="info-right">
          <text>{{ order.orderNo }}</text>
          <text class="copy-btn" @tap="copyOrderNo">复制</text>
        </view>
      </view>
      <view class="info-line"><text>下单时间</text><text>{{ order.orderTime }}</text></view>
      <view class="info-line"><text>配送地址</text><text>{{ order.address }}</text></view>
      <view class="info-line"><text>收货人</text><text>{{ order.contact }}</text></view>
      <view class="info-line"><text>支付方式</text><text>{{ order.payType }}</text></view>
    </view>

    <view class="action-btns">
      <template v-for="btn in statusActions" :key="btn.text">
        <text :class="['btn', btn.primary ? 'btn-primary' : 'btn-secondary']" @tap="onAction(btn)">{{ btn.text }}</text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderDetail, getOrderDelivery, cancelOrder, confirmReceive, cancelRefund } from '@/api'
import type { OrderVO } from '@/types/api'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'

const rawOrder = ref<OrderVO | null>(null)
const rider = ref<any>(null)
const loading = ref(false)

const deliverySteps = ['已下单', '商家接单', '骑手取餐', '配送中', '已送达']

const statusMap: Record<number, { type: string; icon: string; sub: string }> = {
  0: { type: 'warning', icon: 'pay', sub: '请在30分钟内完成支付' },
  1: { type: 'warning', icon: 'shop', sub: '商家接单中，请耐心等待' },
  5: { type: 'primary', icon: 'package', sub: '骑手正在配送中' },
  6: { type: 'success', icon: 'check', sub: '订单已送达，期待您的评价' },
  7: { type: 'success', icon: 'check', sub: '感谢您的信任，期待再次光临' },
  9: { type: 'warning', icon: 'refund', sub: '退款申请处理中，请耐心等待' }
}

const payTypeMap: Record<number, string> = {
  1: '支付宝',
  2: '微信支付',
  3: '余额支付'
}

function isImageUrl(url?: string): boolean {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')
}

const merchantLogoUrl = computed(() => {
  const raw = rawOrder.value
  if (!raw?.merchantLogo) return ''
  return isImageUrl(raw.merchantLogo) ? raw.merchantLogo : ''
})

const order = computed(() => {
  const raw = rawOrder.value
  if (!raw) {
    return {
      id: '',
      status: '已完成',
      statusCode: 7,
      deliveryTime: '',
      riderName: '',
      deliveryDuration: 0,
      merchant: { name: '', icon: '' },
      items: [] as any[],
      goodsAmount: 0,
      deliveryFee: 0,
      discount: 0,
      payable: 0,
      orderNo: '',
      orderTime: '',
      address: '',
      contact: '',
      payType: ''
    }
  }
  const status = raw.status ?? 7
  const dishBgList = [
    'linear-gradient(135deg, #FF6B35, #FFC107)',
    'linear-gradient(135deg, #4CAF50, #8BC34A)',
    'linear-gradient(135deg, #E91E63, #FF8A65)',
    'linear-gradient(135deg, #2196F3, #03A9F4)',
    'linear-gradient(135deg, #9C27B0, #BA68C8)'
  ]
  return {
    id: raw.id,
    status: raw.statusDesc || (status === 0 ? '待付款' : status === 1 ? '待接单' : status === 5 ? '配送中' : status === 6 ? '已送达' : '已完成'),
    statusCode: status,
    deliveryTime: status === 6 || status === 7 ? `${raw.receiveTime || ''} 已送达` : raw.expectedTime || '',
    riderName: raw.riderName || '',
    deliveryDuration: 0,
    merchant: {
      name: raw.merchantName || '未知商家',
      icon: (raw.merchantName || '店').charAt(0)
    },
    items: (raw.items || []).map((it, idx) => ({
      name: it.dishName || '商品',
      spec: it.specName || '',
      price: it.price || 0,
      qty: it.quantity || 0,
      bg: dishBgList[(it.dishId || idx) % dishBgList.length],
      imageUrl: it.dishImage && isImageUrl(it.dishImage) ? it.dishImage : ''
    })),
    goodsAmount: raw.goodsAmount || 0,
    deliveryFee: raw.deliveryFee || 0,
    discount: raw.discountAmount || 0,
    payable: raw.payAmount || 0,
    orderNo: raw.orderNo || '',
    orderTime: raw.createdAt || '',
    address: raw.address ? `${[raw.address.province, raw.address.city, raw.address.district].filter(Boolean).join(' ')} ${raw.address.detail}` : '',
    contact: raw.address ? `${raw.address.contactName || ''} ${raw.address.contactPhone || ''}` : '',
    payType: raw.payStatus === 1 ? (payTypeMap[raw.payType || 0] || '在线支付') : '未支付',
    raw
  }
})

const statusInfo = computed(() => {
  return statusMap[order.value.statusCode] || { type: 'success', icon: 'check', sub: '订单已完成' }
})

const showDeliveryProgress = computed(() => [1, 5, 6, 7, 9].includes(order.value.statusCode))
const activeDeliveryStep = computed(() => {
  const map: Record<number, number> = { 1: 1, 5: 3, 6: 4, 7: 4, 9: 0 }
  return map[order.value.statusCode] ?? 0
})
const deliveryProgress = computed(() => (activeDeliveryStep.value / (deliverySteps.length - 1)) * 100)
const showRider = computed(() => [5, 6, 7].includes(order.value.statusCode))

const statusActions = computed(() => {
  const code = order.value.statusCode
  if (code === 0) return [
    { text: '取消订单', primary: false },
    { text: '去支付', primary: true }
  ]
  if (code === 1) return [
    { text: '申请退款', primary: false },
    { text: '催单', primary: true }
  ]
  if (code === 5) return [
    { text: '查看配送', primary: false },
    { text: '联系骑手', primary: true }
  ]
  if (code === 6) return [
    { text: '评价', primary: false },
    { text: '确认收货', primary: true }
  ]
  if (code === 7) {
    const isRated = order.value.raw?.isRated === 1
    return isRated
      ? [{ text: '再来一单', primary: true }]
      : [{ text: '再来一单', primary: false }, { text: '评价', primary: true }]
  }
  if (code === 8) return [
    { text: '删除订单', primary: false },
    { text: '再来一单', primary: true }
  ]
  if (code === 9) return [
    { text: '撤销申请', primary: false },
    { text: '查看进度', primary: true }
  ]
  if (code === 10) return [
    { text: '删除订单', primary: false },
    { text: '再来一单', primary: true }
  ]
  return [
    { text: '再来一单', primary: false }
  ]
})

onLoad((q: any) => {
  const id = q?.id
  if (id) {
    fetchOrderDetail(id)
  }
})

async function fetchOrderDetail(id: string | number) {
  loading.value = true
  try {
    rawOrder.value = await getOrderDetail(id)
    // 加载骑手信息（由 getOrderDelivery 接口返回）
    if ([5, 6, 7].includes(rawOrder.value?.status ?? -1)) {
      try {
        const delivery = await getOrderDelivery(id)
        if (delivery?.rider) {
          rider.value = delivery.rider
        }
      } catch {
        // 忽略骑手信息加载失败
      }
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function copyOrderNo() {
  uni.setClipboardData({
    data: order.value.orderNo,
    success: () => uni.showToast({ title: '已复制', icon: 'success' })
  })
}

function callRider() {
  const phone = order.value.raw?.riderPhone || rider.value?.virtualPhone
  if (!phone) {
    return uni.showToast({ title: '暂无骑手联系方式', icon: 'none' })
  }
  uni.showModal({
    title: '联系骑手',
    content: `拨打 ${phone}`,
    confirmText: '拨打',
    success: (r) => {
      if (r.confirm) uni.makePhoneCall({ phoneNumber: phone })
    }
  })
}

function goDelivery() {
  uni.navigateTo({ url: `/pages/order/delivery?id=${order.value.id}` })
}

async function doCancelOrder() {
  try {
    await cancelOrder(order.value.id, '用户主动取消')
    uni.showToast({ title: '已取消', icon: 'success' })
    if (rawOrder.value) rawOrder.value.status = 8
  } catch (e: any) {
    uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
  }
}

async function doConfirmReceive() {
  try {
    await confirmReceive(order.value.id)
    uni.showToast({ title: '已确认收货', icon: 'success' })
    if (rawOrder.value) rawOrder.value.status = 7
  } catch (e: any) {
    uni.showToast({ title: e?.message || '确认失败', icon: 'none' })
  }
}

function onAction(btn: { text: string; primary: boolean }) {
  if (btn.text === '去支付') {
    uni.navigateTo({ url: `/pages/order/payment?id=${order.value.id}&amount=${order.value.payable}` })
  } else if (btn.text === '申请退款') {
    uni.navigateTo({ url: `/pages/order/refund?id=${order.value.id}&amount=${order.value.payable}` })
  } else if (btn.text === '查看进度') {
    uni.navigateTo({ url: `/pages/refund/detail?id=${order.value.id}` })
  } else if (btn.text === '撤销申请') {
    uni.showModal({
      title: '提示',
      content: '确定撤销退款申请？',
      success: async (r) => {
        if (r.confirm) {
          try {
            await cancelRefund(order.value.id)
            uni.showToast({ title: '已撤销', icon: 'success' })
            if (rawOrder.value) rawOrder.value.status = 1
          } catch (e: any) {
            uni.showToast({ title: e?.message || '撤销失败', icon: 'none' })
          }
        }
      }
    })
  } else if (btn.text === '查看配送') {
    goDelivery()
  } else if (btn.text === '联系骑手') {
    callRider()
  } else if (btn.text === '评价') {
    uni.navigateTo({ url: `/pages/order/rating?id=${order.value.id}&merchantId=${order.value.raw?.merchantId}` })
  } else if (btn.text === '再来一单') {
    uni.switchTab({ url: '/pages/index/index' })
  } else if (btn.text === '取消订单') {
    uni.showModal({
      title: '提示',
      content: '确定取消该订单？',
      success: (r) => {
        if (r.confirm) doCancelOrder()
      }
    })
  } else if (btn.text === '确认收货') {
    doConfirmReceive()
  } else if (btn.text === '删除订单') {
    uni.showModal({
      title: '提示',
      content: '确定删除该订单？',
      success: (r) => {
        if (r.confirm) {
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 600)
        }
      }
    })
  } else {
    uni.showToast({ title: btn.text, icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.detail {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 40px;
  padding-top: var(--window-top);
}

.status-header {
  padding: 24px 16px 32px;
  text-align: center;
  color: #fff;
}

.status-warning { background: linear-gradient(135deg, $warning, #FFB74D); }
.status-primary { background: linear-gradient(135deg, $primary, $primary-light); }
.status-success { background: linear-gradient(180deg, #fff 0%, $bg 100%); color: $text; }

.status-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36px;
}

.status-success .status-icon {
  background: linear-gradient(135deg, $primary, $secondary);
  box-shadow: 0 8px 24px rgba(255, 107, 53, 0.3);
}

.status-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.status-success .status-title { color: $text; }

.status-sub {
  font-size: 13px;
  opacity: 0.9;
}

.status-success .status-sub { color: $text-muted; }

.progress-card {
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 12px;
  padding: 20px 16px;
  box-shadow: $shadow;
}

.progress-track {
  height: 6px;
  background: $border;
  border-radius: 3px;
  margin-bottom: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary, $secondary);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.step-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: $border;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.step.active .step-dot {
  background: $primary;
}

.step-label {
  font-size: 11px;
  color: $text-muted;
}

.step.active .step-label {
  color: $primary;
  font-weight: 600;
}

.rider-card {
  background: #fff;
  margin: 0 16px 12px;
  border-radius: $radius-lg;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: $shadow;
}

.rider-avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: $bg;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $primary;
}

.rider-info {
  flex: 1;
}

.rider-name {
  font-size: 16px;
  font-weight: 700;
  color: $text;
}

.rider-meta {
  font-size: 12px;
  color: $text-muted;
  margin-top: 4px;
}

.rider-actions {
  display: flex;
  gap: 10px;
}

.rider-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: rgba($primary, 0.08);
  color: $primary;
  padding: 8px 14px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.rider-btn.primary {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
}

.delivery-time-card {
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: $shadow;
}

.delivery-time {
  font-size: 18px;
  font-weight: 700;
  color: $primary;
}

.delivery-time-sub {
  font-size: 12px;
  color: $text-muted;
  margin-top: 4px;
}

.order-section {
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: $shadow;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.merchant-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.merchant-icon-sm-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.merchant-name-sm {
  font-size: 14px;
  font-weight: 600;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid $border;
}

.item-row:last-child {
  border-bottom: none;
}

.item-img-wrap {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  flex-shrink: 0;
  overflow: hidden;
}

.item-img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 13px;
}

.item-spec {
  font-size: 11px;
  color: $text-muted;
}

.item-price {
  font-size: 12px;
  color: $text-light;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  color: $text-light;
}

.summary-row.total {
  border-top: 1px solid $border;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 16px;
  font-weight: 700;
  color: $text;
}

.summary-row.total .price {
  color: $primary;
  font-size: 20px;
}

.info-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: $text-muted;
  padding: 4px 0;
}

.info-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-btn {
  color: $primary;
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid $primary;
  border-radius: 10px;
}

.action-btns {
  display: flex;
  gap: 8px;
  padding: 0 16px;
  margin: 16px 0;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 600;
}

.btn-primary {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
}

.btn-secondary {
  background: #fff;
  color: $primary;
  border: 1px solid $primary;
}
</style>
