<template>
  <view class="detail">
    <!-- 状态头部 -->
    <view class="status-header" :class="`status-${statusInfo.type}`">
      <view class="status-icon"><CategoryIcon :name="statusInfo.icon" :size="32" /></view>
      <view class="status-title">{{ order.status }}</view>
      <view class="status-sub">{{ statusInfo.sub }}</view>
    </view>

    <!-- 配送地图（配送中状态显示） -->
    <view v-if="showMap && tracking" class="map-card">
      <map
        id="deliveryMap"
        class="delivery-map"
        :longitude="mapCenter.lng"
        :latitude="mapCenter.lat"
        :scale="15"
        :markers="mapMarkers"
        :polyline="mapPolyline"
        :show-location="false"
      ></map>
      <view class="map-distance">
        <text class="distance-label">{{ distanceLabel }}</text>
        <text class="distance-value">{{ distanceText }}</text>
      </view>
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
        <view class="rider-name">{{ rider.name || tracking?.rider?.name || '骑手' }}</view>
        <view class="rider-meta">
          <text v-if="rider.rating" class="rider-rating">⭐ {{ Number(rider.rating).toFixed(1) }}</text>
          <text v-if="tracking?.distance" class="rider-distance"> · {{ distanceText }}</text>
        </view>
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
      <view v-if="order.packingFee > 0" class="summary-row"><text>打包费</text><text>¥{{ order.packingFee.toFixed(2) }}</text></view>
      <view v-if="order.diningType === 2" class="summary-row"><text>配送费</text><text>¥{{ order.deliveryFee.toFixed(2) }}</text></view>
      <view v-else-if="order.diningType === 1" class="summary-row"><text>配送费</text><text style="color: #00C853;">堂食免配送费</text></view>
      <view v-else class="summary-row"><text>配送费</text><text style="color: #00C853;">自取免配送费</text></view>
      <view v-if="order.discount > 0" class="summary-row"><text>优惠</text><text style="color: #00C853;">-¥{{ order.discount.toFixed(2) }}</text></view>
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
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getOrderDetail, getOrderDelivery, cancelOrder, confirmReceive, cancelRefund } from '@/api'
import type { OrderVO } from '@/types/api'
import { message } from '@/utils/message'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import { ORDER_STATUS_MAP, formatDistance } from '@/utils/format'

const rawOrder = ref<OrderVO | null>(null)
// rider 初始化为空对象，避免模板访问 rider.rating / rider.name 时 null 报错
const rider = ref<any>({})
const tracking = ref<any>(null)
const loading = ref(false)
/** 位置刷新定时器 */
let locationTimer: ReturnType<typeof setInterval> | null = null

// 新的配送步骤（7步）：已下单→商家接单→骑手已接单→骑手到店→配送中→已送达→已完成
const deliverySteps = ['已下单', '商家接单', '骑手已接单', '骑手到店', '配送中', '已送达', '已完成']

const statusMap: Record<number, { type: string; icon: string; sub: string }> = {
  0:  { type: 'warning', icon: 'pay',       sub: '请在30分钟内完成支付' },
  1:  { type: 'warning', icon: 'shop',      sub: '商家接单中，请耐心等待' },
  2:  { type: 'warning', icon: 'cooking',   sub: '商家正在备餐中，请耐心等待' },
  3:  { type: 'primary', icon: 'bike',      sub: '骑手已接单，正在赶来' },
  4:  { type: 'warning', icon: 'cooking',   sub: '商家正在备餐中，请耐心等待' },
  5:  { type: 'primary', icon: 'package',   sub: '骑手正在配送中' },
  6:  { type: 'success', icon: 'check',     sub: '订单已送达，期待您的评价' },
  7:  { type: 'success', icon: 'check',     sub: '感谢您的信任，期待再次光临' },
  8:  { type: 'muted',   icon: 'close',     sub: '订单已取消' },
  9:  { type: 'warning', icon: 'refund',    sub: '退款申请处理中，请耐心等待' },
  10: { type: 'muted',   icon: 'refund',    sub: '退款已完成' },
  11: { type: 'primary', icon: 'location',  sub: '骑手已到店，正在取餐' },
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
      packingFee: 0,
      deliveryFee: 0,
      diningType: 2,
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
    status: raw.statusDesc || ORDER_STATUS_MAP[status]?.text || '已完成',
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
      price: it.unitPrice || it.price || 0,
      qty: it.quantity || 0,
      bg: dishBgList[Number(it.dishId || idx) % dishBgList.length],
      imageUrl: it.dishImage && isImageUrl(it.dishImage) ? it.dishImage : ''
    })),
    goodsAmount: raw.totalAmount || raw.goodsAmount || 0,
    packingFee: raw.packingFee || 0,
    deliveryFee: (raw.diningType === 1 || raw.diningType === 3) ? 0 : (raw.deliveryFee || 0),
    diningType: raw.diningType || 2,
    // 优惠金额 = 商家优惠 + 平台优惠 + 优惠券（三者之和）
    discount: (Number(raw.merchantDiscount) || 0)
      + (Number(raw.platformDiscount) || 0)
      + (Number(raw.couponAmount) || 0),
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

const showDeliveryProgress = computed(() => [1, 2, 3, 4, 5, 6, 7, 9, 11].includes(order.value.statusCode))
const activeDeliveryStep = computed(() => {
  const map: Record<number, number> = {
    0: 0, 1: 0, 2: 1, 3: 2, 4: 1, 5: 4, 6: 5, 7: 6, 9: 0, 11: 3,
  }
  return map[order.value.statusCode] ?? 0
})
const deliveryProgress = computed(() => (activeDeliveryStep.value / (deliverySteps.length - 1)) * 100)
const showRider = computed(() => [3, 5, 6, 7, 11].includes(order.value.statusCode))

/** 是否显示地图（骑手已接单、到店、配送中状态） */
const showMap = computed(() => {
  return [3, 5, 11].includes(order.value.statusCode) && tracking.value
})

/** 地图中心点 */
const mapCenter = computed(() => {
  const t = tracking.value
  if (!t) return { lng: 116.397, lat: 39.909 }
  // 配送中以骑手位置为中心，否则以商家和用户中间点为中心
  if (t.riderLng && t.riderLat && order.value.statusCode === 5) {
    return { lng: Number(t.riderLng), lat: Number(t.riderLat) }
  }
  if (t.merchantLng && t.merchantLat) {
    return { lng: Number(t.merchantLng), lat: Number(t.merchantLat) }
  }
  return { lng: 116.397, lat: 39.909 }
})

/** 地图标记点 */
const mapMarkers = computed(() => {
  const markers: any[] = []
  const t = tracking.value
  if (!t) return markers

  // 商家标记
  if (t.merchantLng && t.merchantLat) {
    markers.push({
      id: 1,
      longitude: Number(t.merchantLng),
      latitude: Number(t.merchantLat),
      iconPath: '/static/map/shop.png',
      width: 32,
      height: 32,
      callout: {
        content: t.merchant?.name || '商家',
        color: '#333',
        fontSize: 12,
        borderRadius: 6,
        bgColor: '#fff',
        padding: 6,
        display: 'ALWAYS',
      }
    })
  }

  // 用户收货地址标记
  if (t.userLng && t.userLat) {
    markers.push({
      id: 2,
      longitude: Number(t.userLng),
      latitude: Number(t.userLat),
      iconPath: '/static/map/user.png',
      width: 32,
      height: 32,
      callout: {
        content: '收货地址',
        color: '#333',
        fontSize: 12,
        borderRadius: 6,
        bgColor: '#fff',
        padding: 6,
        display: 'ALWAYS',
      }
    })
  }

  // 骑手标记
  if (t.riderLng && t.riderLat) {
    markers.push({
      id: 3,
      longitude: Number(t.riderLng),
      latitude: Number(t.riderLat),
      iconPath: '/static/map/rider.png',
      width: 36,
      height: 36,
      callout: {
        content: t.rider?.name || '骑手',
        color: '#fff',
        fontSize: 12,
        borderRadius: 6,
        bgColor: '#FF6B35',
        padding: 6,
        display: 'ALWAYS',
      }
    })
  }

  return markers
})

/** 地图路线（骑手到目标点的连线） */
const mapPolyline = computed(() => {
  const t = tracking.value
  if (!t) return []
  const points: any[] = []

  if (t.riderLng && t.riderLat) {
    points.push({ longitude: Number(t.riderLng), latitude: Number(t.riderLat) })
  }

  // 根据配送阶段决定目标点
  const target = t.navigationTarget === 'user'
    ? (t.userLng && t.userLat ? { lng: t.userLng, lat: t.userLat } : null)
    : (t.merchantLng && t.merchantLat ? { lng: t.merchantLng, lat: t.merchantLat } : null)

  if (target) {
    points.push({ longitude: Number(target.lng), latitude: Number(target.lat) })
  }

  if (points.length < 2) return []

  return [{
    points,
    color: '#FF6B35',
    width: 4,
    dottedLine: false,
    arrowLine: true,
  }]
})

/** 距离标签 */
const distanceLabel = computed(() => {
  const t = tracking.value
  if (!t) return ''
  if (t.navigationTarget === 'user') return '距您'
  return '距商家'
})

/** 距离文本 */
const distanceText = computed(() => {
  const t = tracking.value
  if (!t?.distance) return '计算中...'
  return formatDistance(t.distance)
})

const statusActions = computed(() => {
  const code = order.value.statusCode
  if (code === 0) return [
    { text: '取消订单', primary: false },
    { text: '去支付', primary: true }
  ]
  if (code === 1 || code === 2 || code === 4) return [
    { text: '申请退款', primary: false },
    { text: '催单', primary: true }
  ]
  if (code === 3 || code === 11) return [
    { text: '查看配送', primary: false },
    { text: '联系骑手', primary: true }
  ]
  if (code === 5) return [
    { text: '查看配送', primary: false },
    { text: '联系骑手', primary: true }
  ]
  if (code === 6) {
    const isRated = order.value.raw?.isRated === 1
    return isRated
      ? [{ text: '确认收货', primary: true }]
      : [{ text: '评价', primary: false }, { text: '确认收货', primary: true }]
  }
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

onShow(() => {
  // 页面显示时刷新当前订单详情（兜底 WS 漏推送）
  if (rawOrder.value?.id) {
    fetchOrderDetail(rawOrder.value.id)
  }
  uni.$on('orderStatusChanged', onOrderStatusChanged)
})

onHide(() => {
  uni.$off('orderStatusChanged', onOrderStatusChanged)
})

onUnload(() => {
  uni.$off('orderStatusChanged', onOrderStatusChanged)
})

/** WebSocket 推送的订单状态变更回调，刷新当前订单详情 */
function onOrderStatusChanged(_msg: any) {
  if (rawOrder.value?.id) {
    fetchOrderDetail(rawOrder.value.id)
  }
}

onUnmounted(() => {
  stopLocationRefresh()
  uni.$off('orderStatusChanged', onOrderStatusChanged)
})

/**
 * 开始定时刷新骑手位置
 */
function startLocationRefresh(orderId: string | number) {
  stopLocationRefresh()
  // 立即刷新一次
  refreshTracking(orderId)
  // 每15秒刷新一次
  locationTimer = setInterval(() => {
    refreshTracking(orderId)
  }, 15000)
}

/**
 * 停止定时刷新
 */
function stopLocationRefresh() {
  if (locationTimer) {
    clearInterval(locationTimer)
    locationTimer = null
  }
}

/**
 * 刷新配送追踪信息
 */
async function refreshTracking(orderId: string | number) {
  try {
    const delivery = await getOrderDelivery(orderId)
    tracking.value = delivery
    if (delivery?.rider) {
      rider.value = delivery.rider
    }
  } catch {
    // 忽略
  }
}

async function fetchOrderDetail(id: string | number) {
  loading.value = true
  try {
    rawOrder.value = await getOrderDetail(id)
    // 加载骑手信息（骑手已接单后开始展示）
    if ([3, 5, 6, 7, 11].includes(rawOrder.value?.status ?? -1)) {
      startLocationRefresh(id)
    }
  } catch (e: any) {
    message.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function copyOrderNo() {
  uni.setClipboardData({
    data: order.value.orderNo,
    success: () => message.success('已复制')
  })
}

async function callRider() {
  let phone = order.value.raw?.riderPhone || rider.value?.phone || tracking.value?.rider?.phone
  if (!phone) {
    // 主动从配送跟踪接口获取骑手电话
    try {
      uni.showLoading({ title: '获取中' })
      const delivery = await getOrderDelivery(order.value.id)
      uni.hideLoading()
      phone = delivery?.rider?.phone
      if (phone) {
        // 缓存骑手信息
        if (delivery?.rider) {
          rider.value = delivery.rider
        }
        tracking.value = delivery
      }
    } catch (e) {
      uni.hideLoading()
    }
  }
  if (!phone) {
    return message.warning('暂无骑手联系方式')
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
    message.success('已取消')
    stopLocationRefresh()
    if (rawOrder.value) rawOrder.value.status = 8
  } catch (e: any) {
    message.error(e?.message || '取消失败')
  }
}

async function doConfirmReceive() {
  try {
    await confirmReceive(order.value.id)
    message.success('已确认收货')
    stopLocationRefresh()
    if (rawOrder.value) rawOrder.value.status = 7
  } catch (e: any) {
    message.error(e?.message || '确认失败')
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
            message.success('已撤销')
            if (rawOrder.value) rawOrder.value.status = 1
          } catch (e: any) {
            message.error(e?.message || '撤销失败')
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
          message.success('已删除')
          setTimeout(() => uni.navigateBack(), 600)
        }
      }
    })
  } else if (btn.text === '催单') {
    message.success('已催促商家尽快处理')
  } else {
    message.info(btn.text)
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
.status-muted { background: linear-gradient(135deg, #999, #bbb); }

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

/* 配送地图 */
.map-card {
  position: relative;
  margin: 0 16px 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: $shadow;
}

.delivery-map {
  width: 100%;
  height: 220px;
}

.map-distance {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.distance-label {
  font-size: 11px;
  color: $text-muted;
}

.distance-value {
  font-size: 16px;
  font-weight: 700;
  color: $primary;
  margin-top: 2px;
}

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
