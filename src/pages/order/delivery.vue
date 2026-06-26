<template>
  <view class="delivery-page">
    <!-- 顶部状态条 -->
    <view class="status-header">
      <view class="status-main">
        <CategoryIcon name="package" :size="28" />
        <text class="status-text">{{ statusText }}</text>
      </view>
      <text class="status-sub">预计 {{ estimateTime }} 送达</text>
    </view>

    <!-- 配送进度条（5 步） -->
    <view class="progress-card">
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: progress + '%' }"></view>
      </view>
      <view class="progress-steps">
        <view
          v-for="(step, idx) in steps"
          :key="idx"
          :class="['step', idx <= activeStep && 'active']"
        >
          <view class="step-dot">
            <CategoryIcon v-if="idx <= activeStep" name="check" :size="10" />
          </view>
          <text class="step-label">{{ step }}</text>
        </view>
      </view>
    </view>

    <!-- 骑手信息卡 -->
    <view class="rider-card">
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
      </view>
    </view>

    <!-- 轨迹信息 -->
    <view class="tracking-card">
      <view class="section-title">配送轨迹</view>
      <view class="timeline">
        <view
          v-for="(node, idx) in tracking"
          :key="idx"
          :class="['timeline-item', idx === 0 && 'latest']"
        >
          <view class="timeline-dot"></view>
          <view class="timeline-body">
            <text class="timeline-text">{{ node.text }}</text>
            <text class="timeline-time">{{ node.time }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 查看地图 -->
    <view class="map-entry" @tap="goMap">
      <CategoryIcon name="location" :size="18" />
      <text>查看配送地图</text>
      <text class="map-arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import { getOrderDelivery } from '@/api'
import type { DeliveryVO, DeliveryStepVO } from '@/types/api'
import type { WSMessage } from '@/utils/websocket'

const defaultSteps = ['已下单', '商家接单', '骑手取餐', '配送中', '已送达']
const delivery = ref<DeliveryVO | null>(null)
const loading = ref(false)
const orderId = ref<string | number>('')
const orderNo = ref('')

const steps = computed(() => {
  if (delivery.value?.steps?.length) {
    return delivery.value.steps.map((s: DeliveryStepVO) => s.name)
  }
  return defaultSteps
})

const activeStep = computed(() => {
  if (delivery.value?.steps?.length) {
    const idx = delivery.value.steps.findIndex((s: DeliveryStepVO) => !s.done)
    return idx === -1 ? delivery.value.steps.length - 1 : Math.max(0, idx - 1)
  }
  return 3
})

const progress = computed(() => (activeStep.value / (steps.value.length - 1)) * 100)

const statusText = computed(() => delivery.value?.statusDesc || '骑手正在配送中')
const estimateTime = computed(() => {
  const t = delivery.value?.expectedTime
  if (!t) return ''
  // 取 HH:mm
  return t.length >= 16 ? t.slice(11, 16) : t
})

const rider = computed(() => {
  const r = delivery.value?.rider
  return {
    name: r?.name || '',
    level: r?.rating ? `评分 ${r.rating}` : '',
    phone: r?.phone || '',
    virtualPhone: r?.phone || '',
    avatar: r?.avatar || ''
  }
})

const tracking = computed(() => {
  if (delivery.value?.steps?.length) {
    return delivery.value.steps
      .slice()
      .reverse()
      .map((s: DeliveryStepVO) => ({
        text: s.name,
        time: s.time ? (s.time.length >= 16 ? s.time.slice(11, 16) : s.time) : ''
      }))
  }
  return []
})

onLoad((q: any) => {
  if (q?.id) {
    orderId.value = q.id
    fetchDelivery(q.id)
  }
  // 监听骑手位置WS消息，实时刷新配送数据
  uni.$on('riderLocation', onRiderLocationMsg)
})

onUnmounted(() => {
  uni.$off('riderLocation', onRiderLocationMsg)
})

function onRiderLocationMsg(msg: WSMessage) {
  // 只刷新当前订单的数据
  if (msg.orderId && String(msg.orderId) !== String(orderId.value)) {
    return
  }
  // 骑手位置更新时，重新拉取配送数据（含位置、骑手信息等）
  if (orderId.value) {
    fetchDelivery(orderId.value)
  }
}

async function fetchDelivery(id: string | number) {
  loading.value = true
  try {
    const data = await getOrderDelivery(id)
    delivery.value = data
    if ((data as any)?.orderNo) {
      orderNo.value = (data as any).orderNo
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function callRider() {
  const phone = rider.value.phone || rider.value.virtualPhone
  if (!phone) {
    return uni.showToast({ title: '暂无骑手联系方式', icon: 'none' })
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

function goMap() {
  const params = [`id=${orderId.value}`]
  if (orderNo.value) {
    params.push(`orderNo=${encodeURIComponent(orderNo.value)}`)
  }
  uni.navigateTo({ url: `/pages/order/map?${params.join('&')}` })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.delivery-page {
  min-height: 100vh;
  background: $bg;
  padding: 12px 16px 40px;
}

.status-header {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  border-radius: $radius-lg;
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: $shadow-md;
}

.status-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.status-text {
  font-size: 18px;
  font-weight: 700;
}

.status-sub {
  font-size: 13px;
  opacity: 0.9;
}

.progress-card {
  background: $card;
  border-radius: $radius-lg;
  padding: 20px 16px;
  margin-bottom: 12px;
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
  background: $card;
  border-radius: $radius-lg;
  padding: 16px;
  margin-bottom: 12px;
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

.tracking-card {
  background: $card;
  border-radius: $radius-lg;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: $shadow;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: $text;
  margin-bottom: 14px;
}

.timeline {
  position: relative;
  padding-left: 12px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background: $border;
}

.timeline-item {
  position: relative;
  padding-left: 20px;
  padding-bottom: 18px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: $text-muted;
  border: 2px solid #fff;
}

.timeline-item.latest .timeline-dot {
  background: $primary;
  box-shadow: 0 0 0 4px rgba($primary, 0.15);
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-text {
  font-size: 13px;
  color: $text;
}

.timeline-time {
  font-size: 11px;
  color: $text-muted;
}

.map-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  background: $card;
  border-radius: $radius-lg;
  padding: 16px;
  box-shadow: $shadow;
  color: $primary;
  font-size: 14px;
  font-weight: 600;
}

.map-arrow {
  margin-left: auto;
  font-size: 18px;
}
</style>
