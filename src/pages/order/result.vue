<template>
  <view class="result">
    <view :class="['icon-circle', success ? 'icon-success' : 'icon-fail']">
      <CategoryIcon :name="success ? 'check' : 'close'" :size="48" />
    </view>
    <text class="title">{{ title }}</text>
    <text class="desc">{{ desc }}</text>

    <!-- 订单信息卡片 -->
    <view v-if="order" class="order-card">
      <view class="order-row">
        <text class="order-label">商家</text>
        <text class="order-value">{{ order.merchantName || '-' }}</text>
      </view>
      <view class="order-row">
        <text class="order-label">订单号</text>
        <text class="order-value">{{ order.orderNo || order.id }}</text>
      </view>
      <view class="order-row">
        <text class="order-label">支付金额</text>
        <text class="order-value price">¥{{ Number(order.payAmount || 0).toFixed(2) }}</text>
      </view>
      <view class="order-row">
        <text class="order-label">支付方式</text>
        <text class="order-value">{{ payTypeText }}</text>
      </view>
      <view class="order-row" v-if="order.payTime">
        <text class="order-label">支付时间</text>
        <text class="order-value">{{ formatTime(order.payTime) }}</text>
      </view>
    </view>
    <view v-else class="order-card">
      <view class="order-row">
        <text class="order-label">订单号</text>
        <text class="order-value">{{ orderId || '-' }}</text>
      </view>
      <view class="order-row">
        <text class="order-label">支付方式</text>
        <text class="order-value">{{ payTypeText }}</text>
      </view>
    </view>

    <!-- 加载中提示 -->
    <view v-if="checking" class="checking-tip">
      <view class="checking-spinner"></view>
      <text>正在确认支付结果...</text>
    </view>

    <view class="actions">
      <view class="action-btn" @tap="goOrder">查看订单</view>
      <view class="action-btn action-primary" @tap="goHome">返回首页</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import { getOrderDetail, getPaymentStatus } from '@/api'
import type { OrderVO, PaymentVO } from '@/types/api'

const success = ref(true)
const checking = ref(false)
const order = ref<OrderVO | null>(null)
const orderId = ref<string | number>('')
const paymentNo = ref('')
const payType = ref('在线支付')

let pollTimer: ReturnType<typeof setInterval> | null = null
let pollCount = 0
const MAX_POLL_COUNT = 20 // 最多轮询20次（60秒）

const payTypeMap: Record<number, string> = {
  1: '支付宝',
  2: '微信支付',
  3: '余额支付'
}

const payTypeText = computed(() => {
  if (order.value?.payType) {
    return payTypeMap[order.value.payType] || payType.value
  }
  return payType.value
})

const title = computed(() => {
  if (checking.value) return '支付确认中'
  return success.value ? '支付成功' : '支付失败'
})

const desc = computed(() => {
  if (checking.value) return '请稍候，正在确认您的支付结果'
  return success.value ? '商家正在准备您的订单' : '请稍后再试或重新支付'
})

onLoad((q: any) => {
  // 解析URL参数（处理支付宝同步回跳时参数在search部分的情况）
  const allParams = parseAllParams(q)

  success.value = allParams.status !== 'fail'
  if (allParams.payType) payType.value = decodeURIComponent(allParams.payType)
  if (allParams.paymentNo) paymentNo.value = allParams.paymentNo

  // 支付宝回跳时out_trade_no就是我们的paymentNo
  if (allParams.out_trade_no && !paymentNo.value) {
    paymentNo.value = allParams.out_trade_no
  }

  if (allParams.orderId) {
    orderId.value = allParams.orderId
    checking.value = true
    loadAndCheckOrder(allParams.orderId)
  } else if (allParams.id) {
    orderId.value = allParams.id
    checking.value = true
    loadAndCheckOrder(allParams.id)
  } else if (paymentNo.value) {
    // 只有paymentNo没有orderId（支付宝回跳场景），先通过paymentNo查询
    checking.value = true
    checkByPaymentNo(paymentNo.value)
  } else {
    // 没有任何参数，默认显示成功（从余额支付/微信支付Mock跳转过来）
    checking.value = false
    success.value = true
  }
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

/**
 * 解析所有URL参数，包括hash和search部分
 */
function parseAllParams(q: any): Record<string, string> {
  const params: Record<string, string> = { ...q }

  // #ifdef H5
  try {
    // 解析search部分的参数（支付宝回跳参数可能在这里）
    const search = window.location.search
    if (search) {
      const searchParams = new URLSearchParams(search.startsWith('?') ? search.substring(1) : search)
      searchParams.forEach((value, key) => {
        if (!params[key]) {
          params[key] = value
        }
      })
    }
    // 解析hash中的query部分
    const hash = window.location.hash
    if (hash && hash.includes('?')) {
      const hashQuery = hash.substring(hash.indexOf('?') + 1)
      const hashParams = new URLSearchParams(hashQuery)
      hashParams.forEach((value, key) => {
        if (!params[key]) {
          params[key] = value
        }
      })
    }
  } catch (e) {
    console.error('解析URL参数失败', e)
  }
  // #endif

  return params
}

async function loadOrder(id: string | number) {
  try {
    order.value = await getOrderDetail(id)
    if (order.value?.payStatus === 1 || order.value?.status !== 0) {
      success.value = true
    }
  } catch (e) {
    console.error('加载订单详情失败', e)
    order.value = null
  }
}

async function loadAndCheckOrder(id: string | number) {
  try {
    order.value = await getOrderDetail(id)
    if (order.value?.payStatus === 1 || order.value?.status !== 0) {
      checking.value = false
      success.value = true
      return
    }

    if (paymentNo.value) {
      await checkByPaymentNo(paymentNo.value)
    } else {
      startPollingOrder(id)
    }
  } catch (e) {
    console.error('加载订单详情失败', e)
    checking.value = false
    startPollingOrder(id)
  }
}

async function checkByPaymentNo(payNo: string) {
  try {
    const res = await getPaymentStatus(payNo, true)
    if (res?.status === 1) {
      checking.value = false
      success.value = true
      // 从paymentNo获取orderId
      if (res?.orderId) {
        orderId.value = res.orderId
        order.value = await getOrderDetail(res.orderId)
      } else if (orderId.value) {
        order.value = await getOrderDetail(orderId.value)
      }
      return
    }
    // 如果有orderId，轮询订单状态
    if (orderId.value) {
      startPollingOrder(orderId.value)
    } else if (res?.orderId) {
      orderId.value = res.orderId
      startPollingOrder(res.orderId)
    }
  } catch (e) {
    console.error('查询支付状态失败', e)
    if (orderId.value) {
      startPollingOrder(orderId.value)
    } else {
      checking.value = false
      success.value = false
    }
  }
}

function startPollingOrder(id: string | number) {
  pollCount = 0
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    pollCount++
    try {
      const o = await getOrderDetail(id)
      order.value = o
      if (o?.payStatus === 1 || o?.status !== 0) {
        checking.value = false
        success.value = true
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
        uni.showToast({ title: '支付成功', icon: 'success' })
        return
      }
    } catch (e) {
      console.error('轮询订单状态失败', e)
    }

    if (pollCount >= MAX_POLL_COUNT) {
      checking.value = false
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      if (order.value?.payStatus === 1) {
        success.value = true
      } else {
        // 轮询结束仍未确认支付，但后端定时任务会继续处理，显示处理中提示
        success.value = false
        uni.showToast({ title: '支付结果确认中，请稍后查看订单', icon: 'none' })
      }
    }
  }, 3000)
}

function formatTime(time: any): string {
  if (!time) return ''
  const d = new Date(time)
  if (isNaN(d.getTime())) return String(time)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function goOrder() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  uni.reLaunch({ url: '/pages/order/list' })
}

function goHome() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.result {
  min-height: 100vh;
  background: $bg;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: calc(var(--status-bar-height, 20px) + 40px) 24px 80px;
}

.icon-circle {
  width: 96px;
  height: 96px;
  border-radius: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 56px;
  font-weight: 700;
  margin-bottom: 24px;
}

.icon-success {
  background: $success;
}

.icon-fail {
  background: $danger;
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: $text;
}

.desc {
  font-size: 13px;
  color: $text-muted;
  margin-top: 8px;
}

.checking-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 13px;
  color: $primary;
}

.checking-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba($primary, 0.25);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.order-card {
  width: 100%;
  background: #fff;
  border-radius: $radius-lg;
  padding: 16px;
  margin-top: 32px;
  box-shadow: $shadow;
}

.order-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 14px;
  border-bottom: 1px solid $border;
}

.order-row:last-child {
  border-bottom: none;
}

.order-label {
  color: $text-light;
}

.order-value {
  color: $text;
  font-weight: 500;
}

.order-value.price {
  color: $primary;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 16px;
  margin-top: 40px;
  width: 100%;
}

.action-btn {
  flex: 1;
  height: 48px;
  line-height: 48px;
  text-align: center;
  border: 1px solid $primary;
  color: $primary;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
}

.action-primary {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  border: none;
}
</style>
