<template>
  <view class="map-page">
    <!-- 顶部导航栏 -->
    <view class="map-header">
      <view class="back-btn" @tap="goBack">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </view>
      <view class="header-info">
        <text class="header-title">配送地图</text>
        <text class="header-sub">订单号 {{ orderNo || '加载中' }}</text>
      </view>
      <view class="header-right" />
    </view>

    <!-- 地图区域 -->
    <!-- #ifdef H5 -->
    <view id="amap-container" class="map-container"></view>
    <!-- #endif -->
    <!-- #ifndef H5 -->
    <map
      id="deliveryMap"
      class="map-container"
      :longitude="centerLng"
      :latitude="centerLat"
      :scale="15"
      :markers="mapMarkers"
      :show-location="false"
      :enable-zoom="true"
      :enable-scroll="true"
    ></map>
    <!-- #endif -->

    <!-- 配送进度浮层 -->
    <view class="progress-badge">
      <view class="badge-icon">
        <CategoryIcon name="package" :size="20" />
      </view>
      <view class="badge-text">
        <text class="badge-title">{{ progressText }}</text>
        <text v-if="distanceText" class="badge-sub">{{ distanceText }}</text>
      </view>
    </view>

    <!-- 底部骑手信息卡片 -->
    <view class="rider-panel">
      <view class="rider-info">
        <view class="rider-avatar">
          <CategoryIcon name="avatar" :size="32" />
        </view>
        <view class="rider-text">
          <view class="rider-name">{{ rider.name || '骑手信息加载中' }}</view>
          <view class="rider-desc">
            {{ [rider.level, '正在配送'].filter(Boolean).join(' · ') }}
          </view>
        </view>
      </view>
      <view class="rider-actions">
        <view class="rider-btn" @tap="callRider">
          <CategoryIcon name="service" :size="18" />
          <text>联系骑手</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import { getOrderDelivery } from '@/api'
import { loadAMap, calculateDistance, formatDistance as fmtDist } from '@/utils/amap'
import { message } from '@/utils/message'
import type { WSMessage } from '@/utils/websocket'

// ==================== 状态 ====================
const orderId = ref<string | number>('')
const orderNo = ref('')
const loading = ref(false)

// 骑手信息
const rider = ref({ name: '', level: '', phone: '', virtualPhone: '', avatar: '' })

// 三点位置（经纬度）
const merchantLoc = ref<{ lng: number; lat: number; name: string; address: string }>({
  lng: 0, lat: 0, name: '商家', address: ''
})
const userLoc = ref<{ lng: number; lat: number; address: string }>({
  lng: 0, lat: 0, address: ''
})
const riderLoc = ref<{ lng: number; lat: number }>({ lng: 0, lat: 0 })

// 骑手与目的地距离（米）
const distance = ref(0)
// 当前导航目标：merchant=去商家取餐，user=送往用户地址
const navigationTarget = ref<'merchant' | 'user'>('user')
// 配送任务状态
const deliveryStatus = ref<number>(0)

// 地图中心点（非H5用）
const centerLng = ref(116.397428)
const centerLat = ref(39.90923)

// 轮询定时器
let pollTimer: ReturnType<typeof setInterval> | null = null

// H5 AMap 相关
let amapInstance: any = null
let amapRiderMarker: any = null
let amapMerchantMarker: any = null
let amapUserMarker: any = null

// ==================== 计算属性 ====================
const progressText = computed(() => {
  if (distance.value <= 0) {
    return '等待骑手位置更新'
  }
  if (navigationTarget.value === 'merchant') {
    return '骑手正在赶往商家'
  }
  return '骑手正在配送中'
})

/** 根据距离格式化显示 */
const distanceText = computed(() => {
  if (distance.value <= 0) return ''
  const target = navigationTarget.value === 'merchant' ? '商家' : '您'
  return `骑手距${target}约 ${fmtDist(distance.value)}`
})

// 非H5端 markers
const mapMarkers = computed(() => {
  const markers: any[] = []
  let id = 1

  if (merchantLoc.value.lng && merchantLoc.value.lat) {
    markers.push({
      id: id++,
      longitude: merchantLoc.value.lng,
      latitude: merchantLoc.value.lat,
      width: 32,
      height: 32,
      callout: {
        content: merchantLoc.value.name || '商家',
        color: '#333',
        fontSize: 12,
        borderRadius: 6,
        bgColor: '#fff',
        padding: 6,
        display: 'ALWAYS'
      }
    })
  }

  if (userLoc.value.lng && userLoc.value.lat) {
    markers.push({
      id: id++,
      longitude: userLoc.value.lng,
      latitude: userLoc.value.lat,
      width: 32,
      height: 32,
      callout: {
        content: '我的位置',
        color: '#333',
        fontSize: 12,
        borderRadius: 6,
        bgColor: '#fff',
        padding: 6,
        display: 'ALWAYS'
      }
    })
  }

  if (riderLoc.value.lng && riderLoc.value.lat) {
    markers.push({
      id: id++,
      longitude: riderLoc.value.lng,
      latitude: riderLoc.value.lat,
      width: 36,
      height: 36,
      callout: {
        content: '骑手',
        color: '#FF4B33',
        fontSize: 12,
        borderRadius: 6,
        bgColor: '#fff',
        padding: 6,
        display: 'ALWAYS'
      }
    })
  }

  return markers
})

// ==================== 生命周期 ====================
onLoad((q: any) => {
  if (q?.id) {
    orderId.value = q.id
  }
  if (q?.orderNo) {
    orderNo.value = q.orderNo
  }
  fetchDelivery()
  setupWSListener()
  startPolling()

  // #ifdef H5
  nextTick(() => {
    initAMap()
  })
  // #endif
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  uni.$off('riderLocation', onRiderLocationMsg)
  // #ifdef H5
  if (amapInstance) {
    try { amapInstance.destroy() } catch (e) { /* ignore */ }
    amapInstance = null
  }
  // #endif
})

// ==================== WS 监听 ====================
function onRiderLocationMsg(msg: WSMessage) {
  // 只处理当前订单的位置更新
  if (msg.orderId && String(msg.orderId) !== String(orderId.value)) {
    return
  }
  const lng = msg.longitude ?? msg.lng
  const lat = msg.latitude ?? msg.lat
  if (typeof lng === 'number' && typeof lat === 'number') {
    updateRiderLocation(lng, lat)
  }
}

function setupWSListener() {
  uni.$on('riderLocation', onRiderLocationMsg)
}

// ==================== 数据获取 ====================
async function fetchDelivery() {
  if (!orderId.value) return
  loading.value = true
  try {
    const delivery = (await getOrderDelivery(orderId.value)) as any
    applyDeliveryData(delivery)
  } catch (e) {
    console.error('加载配送信息失败', e)
  } finally {
    loading.value = false
  }
}

function applyDeliveryData(delivery: any) {
  if (!delivery) return

  // 订单号
  if (delivery.orderNo) {
    orderNo.value = delivery.orderNo
  }

  // 骑手信息
  if (delivery.rider) {
    rider.value = {
      name: delivery.rider.name || '',
      level: delivery.rider.rating ? `评分 ${delivery.rider.rating}` : '',
      phone: delivery.rider.phone || '',
      virtualPhone: delivery.rider.phone || '',
      avatar: delivery.rider.avatar || ''
    }
  }

  // 商家位置（兼容多种字段命名）
  const mLng = delivery.merchantLongitude ?? delivery.merchantLng ?? delivery.merchant?.longitude ?? delivery.merchant?.lng
  const mLat = delivery.merchantLatitude ?? delivery.merchantLat ?? delivery.merchant?.latitude ?? delivery.merchant?.lat
  if (typeof mLng === 'number' && typeof mLat === 'number') {
    merchantLoc.value = {
      lng: mLng,
      lat: mLat,
      name: delivery.merchant?.name || '商家',
      address: delivery.merchant?.address || delivery.merchantAddress || ''
    }
  }

  // 用户位置（从address或userInfo或顶层字段取）
  let uLng: number | undefined, uLat: number | undefined, userAddr = ''
  if (delivery.address) {
    uLng = delivery.address.longitude
    uLat = delivery.address.latitude
    userAddr = [delivery.address.province, delivery.address.city, delivery.address.district, delivery.address.detail].filter(Boolean).join(' ')
  }
  if (delivery.userInfo) {
    uLng = uLng ?? delivery.userInfo.lng
    uLat = uLat ?? delivery.userInfo.lat
    userAddr = userAddr || delivery.userInfo.address || ''
  }
  uLng = uLng ?? delivery.userLng
  uLat = uLat ?? delivery.userLat
  if (typeof uLng === 'number' && typeof uLat === 'number') {
    userLoc.value = { lng: uLng, lat: uLat, address: userAddr }
  }

  // 导航目标和距离
  if (delivery.navigationTarget) {
    navigationTarget.value = delivery.navigationTarget
  } else {
    // 根据配送状态推断：<3取餐前→去商家，>=3取餐后→去用户
    const ts = delivery.deliveryTaskStatus ?? delivery.taskStatus
    deliveryStatus.value = typeof ts === 'number' ? ts : 0
    navigationTarget.value = (ts != null && ts < 3) ? 'merchant' : 'user'
  }
  // 优先使用后端计算的距离
  const distToMerchant = delivery.distanceToMerchant
  const distToUser = delivery.distanceToUser ?? delivery.distance
  if (navigationTarget.value === 'merchant' && typeof distToMerchant === 'number') {
    distance.value = distToMerchant
  } else if (typeof distToUser === 'number') {
    distance.value = distToUser
  } else if (typeof delivery.distance === 'number') {
    distance.value = delivery.distance
  }

  // 骑手位置（兼容多种字段命名）
  const rLng = delivery.riderLongitude ?? delivery.riderLng ?? delivery.rider?.longitude
  const rLat = delivery.riderLatitude ?? delivery.riderLat ?? delivery.rider?.latitude
  if (typeof rLng === 'number' && typeof rLat === 'number') {
    updateRiderLocation(rLng, rLat)
  }

  // #ifdef H5
  if (amapInstance) {
    renderAMapMarkers()
  }
  // #endif
}

// ==================== 位置更新 ====================
function updateRiderLocation(lng: number, lat: number) {
  riderLoc.value = { lng, lat }

  // 根据当前导航目标计算距离
  if (navigationTarget.value === 'merchant' && merchantLoc.value.lng && merchantLoc.value.lat) {
    distance.value = calculateDistance(lng, lat, merchantLoc.value.lng, merchantLoc.value.lat)
  } else if (userLoc.value.lng && userLoc.value.lat) {
    distance.value = calculateDistance(lng, lat, userLoc.value.lng, userLoc.value.lat)
  }

  // #ifdef H5
  if (amapInstance && amapRiderMarker) {
    amapRiderMarker.setPosition([lng, lat])
    fitMapView()
  }
  // #endif

  // #ifndef H5
  // 更新中心点为骑手位置
  centerLng.value = lng
  centerLat.value = lat
  // #endif
}

// ==================== 轮询兜底 ====================
function startPolling() {
  pollTimer = setInterval(() => {
    if (orderId.value) {
      fetchDelivery()
    }
  }, 30000)
}

// ==================== 高德地图（H5） ====================
// #ifdef H5
async function initAMap() {
  try {
    const AMap = await loadAMap()
    // uni-app H5 下 <view id="amap-container"> 渲染为 <uni-view> 自定义元素，
    // 高德 SDK 内部会查找原生 <div> 子元素，直接传 <uni-view> 会报 "Map container div not exist"。
    // 这里获取挂载点后，确保内部有一个带明确尺寸的原生 <div> 作为实际地图容器。
    const mountEl = document.getElementById('amap-container') as HTMLElement | null
    if (!mountEl) {
      console.warn('[地图] 挂载点 #amap-container 不存在，稍后重试')
      // DOM 尚未就绪，延迟重试
      setTimeout(initAMap, 200)
      return
    }

    // 强制 uni-view 为块级元素，否则 inline 元素的尺寸不生效
    mountEl.style.display = 'block'

    // 复用或创建内部原生 div
    let innerDiv = mountEl.querySelector('.amap-inner') as HTMLElement | null
    if (!innerDiv) {
      innerDiv = document.createElement('div')
      innerDiv.className = 'amap-inner'
      mountEl.appendChild(innerDiv)
    }

    // 用固定像素尺寸，避免 height:100% 在父元素 height:auto 时失效
    let h = mountEl.offsetHeight || mountEl.clientHeight || 0
    let w = mountEl.offsetWidth || mountEl.clientWidth || 0
    if (h < 200) h = window.innerHeight || 360
    if (w < 100) w = window.innerWidth || 320
    innerDiv.style.width = w + 'px'
    innerDiv.style.height = h + 'px'

    if (amapInstance) {
      // 已有实例，仅更新尺寸和中心
      try { amapInstance.setCenter(new AMap.LngLat(116.397428, 39.90923)) } catch (e) { /* ignore */ }
      return
    }

    amapInstance = new AMap.Map(innerDiv, {
      zoom: 15,
      center: new AMap.LngLat(116.397428, 39.90923),
      resizeEnable: true
    })

    // 如果已有位置数据，立即渲染标记
    if (merchantLoc.value.lng || userLoc.value.lng || riderLoc.value.lng) {
      renderAMapMarkers()
    }
  } catch (e) {
    console.error('高德地图初始化失败:', e)
  }
}

function renderAMapMarkers() {
  if (!amapInstance) return
  const AMap = (window as any).AMap
  if (!AMap) return

  // 清除旧标记
  if (amapMerchantMarker) { amapMerchantMarker.setMap(null); amapMerchantMarker = null }
  if (amapUserMarker) { amapUserMarker.setMap(null); amapUserMarker = null }
  if (amapRiderMarker) { amapRiderMarker.setMap(null); amapRiderMarker = null }

  // 商家标记
  if (merchantLoc.value.lng && merchantLoc.value.lat) {
    amapMerchantMarker = new AMap.Marker({
      position: [merchantLoc.value.lng, merchantLoc.value.lat],
      title: merchantLoc.value.name || '商家',
      content: `<div style="background:#FF4B33;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;box-shadow:0 2px 8px rgba(255,75,51,0.4);border:2px solid #fff;">商</div>`,
      offset: new AMap.Pixel(-16, -16)
    })
    amapMerchantMarker.setMap(amapInstance)
  }

  // 用户标记
  if (userLoc.value.lng && userLoc.value.lat) {
    amapUserMarker = new AMap.Marker({
      position: [userLoc.value.lng, userLoc.value.lat],
      title: '我的位置',
      content: `<div style="background:#2196F3;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;box-shadow:0 2px 8px rgba(33,150,243,0.4);border:2px solid #fff;">我</div>`,
      offset: new AMap.Pixel(-16, -16)
    })
    amapUserMarker.setMap(amapInstance)
  }

  // 骑手标记
  if (riderLoc.value.lng && riderLoc.value.lat) {
    amapRiderMarker = new AMap.Marker({
      position: [riderLoc.value.lng, riderLoc.value.lat],
      title: '骑手',
      content: `<div style="background:#FF9800;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;box-shadow:0 2px 12px rgba(255,152,0,0.5);border:3px solid #fff;animation:riderPulse 2s infinite;">骑</div>`,
      offset: new AMap.Pixel(-18, -18)
    })
    amapRiderMarker.setMap(amapInstance)
  }

  fitMapView()
}

function fitMapView() {
  if (!amapInstance) return
  const points: [number, number][] = []
  if (merchantLoc.value.lng) points.push([merchantLoc.value.lng, merchantLoc.value.lat])
  if (userLoc.value.lng) points.push([userLoc.value.lng, userLoc.value.lat])
  if (riderLoc.value.lng) points.push([riderLoc.value.lng, riderLoc.value.lat])
  if (points.length > 0) {
    amapInstance.setFitView(null, false, [80, 80, 200, 80])
  }
}
// #endif

// ==================== 交互事件 ====================
function callRider() {
  const phone = rider.value.virtualPhone || rider.value.phone
  if (!phone) {
    message.warning('暂无骑手联系方式')
    return
  }
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

function goBack() {
  uni.navigateBack()
}

function formatDistance(m: number): string {
  return fmtDist(m)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.map-page {
  min-height: 100vh;
  background: #e8f4f8;
  position: relative;
}

.map-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text;
}

.header-info {
  flex: 1;
  text-align: center;
}

.header-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: $text;
}

.header-sub {
  display: block;
  font-size: 11px;
  color: $text-muted;
  margin-top: 2px;
}

.header-right {
  width: 36px;
}

.map-container {
  width: 100%;
  height: 100vh;
}

/* #ifdef H5 */
#amap-container {
  width: 100%;
  height: 100vh;
}
/* #endif */

.progress-badge {
  position: fixed;
  top: 70px;
  left: 16px;
  right: 16px;
  z-index: 90;
  background: rgba(255, 255, 255, 0.96);
  border-radius: $radius-lg;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: $shadow-md;
}

.badge-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-text {
  flex: 1;
  min-width: 0;
}

.badge-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: $text;
}

.badge-sub {
  display: block;
  font-size: 12px;
  color: $primary;
  margin-top: 3px;
  font-weight: 600;
}

.rider-panel {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 90;
  background: $card;
  border-radius: $radius-lg;
  padding: 16px;
  box-shadow: $shadow-lg;
}

.rider-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.rider-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: $bg;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $primary;
}

.rider-name {
  font-size: 15px;
  font-weight: 700;
  color: $text;
}

.rider-desc {
  font-size: 12px;
  color: $text-muted;
  margin-top: 3px;
}

.rider-actions {
  display: flex;
  gap: 12px;
}

.rider-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  padding: 11px 0;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 600;
}
</style>
