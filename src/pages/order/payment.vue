<template>
  <view class="payment">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: `calc(var(--status-bar-height, 20px) + 4px)` }">
      <view class="nav-back" @tap="goBack">
        <view class="nav-back-arrow" />
      </view>
      <text class="nav-title">收银台</text>
      <view class="nav-placeholder" />
    </view>

    <view class="amount-card">
      <text class="lbl">应付金额</text>
      <text class="amount">¥{{ amount.toFixed(2) }}</text>
      <view v-if="feeDetailVisible" class="fee-detail">
        <view class="fee-row"><text>商品金额</text><text>¥{{ goodsAmount.toFixed(2) }}</text></view>
        <view v-if="packingFee > 0" class="fee-row"><text>打包费</text><text>¥{{ packingFee.toFixed(2) }}</text></view>
        <view v-if="diningType === 3" class="fee-row"><text>配送费</text><text class="fee-free">自取免配送费</text></view>
        <view v-else-if="diningType === 1" class="fee-row"><text>配送费</text><text class="fee-free">堂食免配送费</text></view>
        <view v-else class="fee-row"><text>配送费</text><text>¥{{ deliveryFee.toFixed(2) }}</text></view>
        <view v-if="couponAmount > 0" class="fee-row coupon-row"><text>优惠券</text><text>-¥{{ couponAmount.toFixed(2) }}</text></view>
      </view>
      <text class="order-no">订单号：{{ orderNo }}</text>
      <text v-if="countdownText" class="countdown">支付剩余时间 {{ countdownText }}</text>
    </view>

    <view class="pay-methods">
      <text class="section-title">选择支付方式</text>
      <view
        v-for="m in methods"
        :key="m.id"
        :class="['pay-item', payMethod === m.id && 'pay-active', m.disabled && 'pay-disabled']"
        @tap="selectMethod(m)"
      >
        <image class="pay-icon-img" :src="m.iconImg" mode="aspectFit" />
        <view class="pay-info">
          <text class="pay-name">{{ m.name }}</text>
          <text class="pay-desc">{{ m.desc }}</text>
        </view>
        <view :class="['pay-radio', payMethod === m.id && 'pay-radio-active']"></view>
      </view>
    </view>

    <view :class="['pay-btn', (timeLeft <= 0 || paying) && 'pay-btn-disabled']" @tap="onPay">
      {{ paying ? '支付中...' : (timeLeft <= 0 ? '订单已超时' : `确认支付 ¥${amount.toFixed(2)}`) }}
    </view>

    <!-- 支付宝跳转中提示（不使用v-html，避免DOM冲突） -->
    <!-- #ifdef H5 -->
    <view v-if="redirecting" class="alipay-webview">
      <view class="alipay-loading">正在跳转支付宝...</view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createPayment, getPaymentStatus, getOrderDetail } from '@/api'
import { useUserStore } from '@/store/user'

const PAYMENT_DURATION_SEC = 30 * 60 // 30分钟
const DEADLINE_STORAGE_PREFIX = 'wzz_pay_deadline_'

const userStore = useUserStore()
const orderNo = ref('')
const orderId = ref<string | number>('')
const paymentNo = ref('')
const amount = ref(0)
const goodsAmount = ref(0)
const packingFee = ref(0)
const deliveryFee = ref(0)
const couponAmount = ref(0)
const diningType = ref(2) // 默认外卖
const feeDetailVisible = ref(false)
const payMethod = ref('ALIPAY')
const timeLeft = ref(PAYMENT_DURATION_SEC)
const paying = ref(false)
const redirecting = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let deadlineKey = ''

const balance = computed(() => Number(userStore.userInfo?.balance || 0))

const methods = computed(() => [
  { id: 'ALIPAY', name: '支付宝', desc: '推荐有支付宝账户的用户使用', iconImg: '/static/icons/emoji/alipay.jpg' },
  { id: 'WECHAT', name: '微信支付', desc: '推荐有微信账户的用户使用', iconImg: '/static/icons/emoji/wechat-pay.jpg' },
  { id: 'BALANCE', name: '余额支付', desc: `当前余额 ¥${balance.value.toFixed(2)}`, iconImg: '/static/icons/emoji/wallet.jpg', disabled: balance.value < amount.value }
])

const payTypeNumberMap: Record<string, number> = {
  ALIPAY: 1,
  WECHAT: 2,
  BALANCE: 3
}

const payTypeNameMap: Record<string, string> = {
  WECHAT: '微信支付',
  ALIPAY: '支付宝',
  BALANCE: '余额支付'
}

const countdownText = computed(() => {
  if (timeLeft.value <= 0) return '00:00'
  const m = Math.floor(timeLeft.value / 60).toString().padStart(2, '0')
  const s = (timeLeft.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

onLoad(async (q: any) => {
  if (q?.id) {
    orderId.value = q.id
  }
  orderNo.value = q?.paymentNo || q?.orderNo || (q?.id ? String(q.id) : '')

  // 优先用URL参数做快速展示（避免页面闪烁）
  if (q?.amount) amount.value = Number(q.amount) || 0
  if (q?.totalAmount !== undefined) goodsAmount.value = Number(q.totalAmount) || 0
  if (q?.packingFee !== undefined) packingFee.value = Number(q.packingFee) || 0
  if (q?.deliveryFee !== undefined) deliveryFee.value = Number(q.deliveryFee) || 0
  if (q?.couponAmount !== undefined) couponAmount.value = Number(q.couponAmount) || 0
  if (q?.diningType !== undefined) diningType.value = Number(q.diningType) || 2
  feeDetailVisible.value = true

  // 始终从后端拉取权威数据（URL参数可能因版本/缓存不一致，后端为准）
  if (q?.id) {
    try {
      const orderDetail: any = await getOrderDetail(q.id)
      if (orderDetail) {
        amount.value = Number(orderDetail.payAmount) || 0
        goodsAmount.value = Number(orderDetail.totalAmount) || 0
        packingFee.value = Number(orderDetail.packingFee) || 0
        couponAmount.value = Number(orderDetail.couponAmount) || 0
        diningType.value = Number(orderDetail.diningType) || 2
        // 外卖(2)显示配送费；堂食(1)/自取(3)配送费为0
        if (diningType.value === 2) {
          deliveryFee.value = Number(orderDetail.deliveryFee) || 0
        } else {
          deliveryFee.value = 0
        }
        feeDetailVisible.value = true
        if (!orderNo.value && orderDetail.orderNo) {
          orderNo.value = orderDetail.orderNo
        }
      }
    } catch (e) {
      console.error('获取订单详情失败', e)
    }
  }
})

onMounted(() => {
  deadlineKey = DEADLINE_STORAGE_PREFIX + orderId.value
  let deadline = 0
  try {
    const stored = uni.getStorageSync(deadlineKey)
    if (stored) deadline = Number(stored)
  } catch {
    deadline = 0
  }

  const now = Date.now()
  let remaining = 0
  if (deadline > now) {
    remaining = Math.floor((deadline - now) / 1000)
  }
  if (remaining <= 0 || remaining > PAYMENT_DURATION_SEC) {
    deadline = now + PAYMENT_DURATION_SEC * 1000
    uni.setStorageSync(deadlineKey, deadline)
    remaining = PAYMENT_DURATION_SEC
  }
  timeLeft.value = remaining

  timer = setInterval(() => {
    const nowTs = Date.now()
    const left = Math.max(0, Math.floor((deadline - nowTs) / 1000))
    timeLeft.value = left
    if (left <= 0) {
      onTimeout()
    }
  }, 1000)
})

onUnmounted(() => {
  cleanup()
})

function cleanup() {
  if (timer) { clearInterval(timer); timer = null }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

function goBack() {
  uni.navigateBack()
}

function selectMethod(m: any) {
  if (m.disabled) {
    uni.showToast({ title: '余额不足', icon: 'none' })
    return
  }
  payMethod.value = m.id
}

function onTimeout() {
  cleanup()
  timeLeft.value = 0
  uni.showToast({ title: '支付超时，订单已取消', icon: 'none' })
  setTimeout(() => {
    uni.redirectTo({ url: `/pages/order/detail?id=${orderId.value}&autoCancel=1` })
  }, 1500)
}

function goSuccess() {
  cleanup()
  const payTypeName = payTypeNameMap[payMethod.value] || '在线支付'
  uni.redirectTo({ url: `/pages/order/result?status=success&payType=${encodeURIComponent(payTypeName)}&orderId=${orderId.value}&paymentNo=${paymentNo.value}` })
}

function startPollingStatus() {
  if (pollTimer) clearInterval(pollTimer)
  let pollCount = 0
  pollTimer = setInterval(async () => {
    pollCount++
    try {
      const res = await getPaymentStatus(paymentNo.value, true)
      if (res?.status === 1) {
        goSuccess()
        return
      }
    } catch (e) {
      // ignore poll errors
    }
    // 最多轮询30次（90秒），超时后跳转到订单详情
    if (pollCount >= 30) {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
      uni.redirectTo({ url: `/pages/order/detail?id=${orderId.value}` })
    }
  }, 3000)
}

/**
 * H5环境下安全地提交支付宝表单
 * 直接将表单写入body并提交，避免Vue管理DOM导致的冲突
 */
function submitAlipayForm(html: string) {
  // #ifdef H5
  try {
    // 先停止所有定时器，避免Vue在页面卸载时更新DOM
    cleanup()

    // 显示跳转提示
    redirecting.value = true

    // 解析HTML创建表单DOM（不通过v-html，直接操作body）
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'absolute'
    container.style.width = '1px'
    container.style.height = '1px'
    container.style.overflow = 'hidden'
    container.style.opacity = '0'
    document.body.appendChild(container)

    const form = container.querySelector('form') as HTMLFormElement
    if (form) {
      // 延迟提交，让UI先渲染"正在跳转"提示
      setTimeout(() => {
        form.submit()
      }, 200)
    } else {
      // 如果没有表单（可能是直接跳转URL），直接跳转
      const match = html.match(/action=["']([^"']+)["']/)
      if (match && match[1]) {
        window.location.href = match[1]
      }
    }
  } catch (e) {
    console.error('提交支付宝表单失败', e)
    paying.value = false
    redirecting.value = false
    uni.showToast({ title: '跳转支付宝失败', icon: 'none' })
  }
  // #endif
}

async function onPay() {
  if (timeLeft.value <= 0 || paying.value || redirecting.value) return
  const method = methods.value.find(m => m.id === payMethod.value)
  if (method?.disabled) {
    return uni.showToast({ title: '余额不足', icon: 'none' })
  }

  const payType = payTypeNumberMap[payMethod.value]
  const payTypeName = payTypeNameMap[payMethod.value] || '在线支付'
  paying.value = true

  try {
    const res = await createPayment(orderId.value, payType)
    paymentNo.value = res?.paymentNo || ''

    if (payMethod.value === 'BALANCE') {
      // 余额支付直接成功
      paying.value = false
      uni.showToast({ title: '支付成功', icon: 'success' })
      // 刷新用户信息（余额已变更）
      userStore.fetchProfile?.()
      setTimeout(() => goSuccess(), 800)
      return
    }

    if (payMethod.value === 'ALIPAY' && res?.payUrl) {
      // #ifdef H5
      // H5环境：动态创建表单提交到支付宝，避免Vue DOM冲突
      paying.value = false
      submitAlipayForm(res.payUrl)
      // H5环境下页面会跳走，回跳时到result页同步状态
      // 这里不启动轮询（页面即将离开），依靠result页的同步+后端定时任务
      return
      // #endif
      // #ifndef H5
      paying.value = false
      uni.showModal({
        title: '支付宝支付',
        content: '请在支付宝中完成支付，完成后将自动跳转',
        showCancel: false,
        confirmText: '知道了'
      })
      startPollingStatus()
      // #endif
      return
    }

    if (payMethod.value === 'WECHAT') {
      // 微信支付（Mock模式：模拟支付过程后轮询确认支付状态）
      paying.value = false
      uni.showLoading({ title: '微信支付中...' })
      // 模拟微信支付过程，然后通过轮询同步后端支付状态
      setTimeout(() => {
        uni.hideLoading()
        // 启动轮询确认支付状态（与支付宝非H5流程一致）
        // 轮询会调用sync=true接口，触发MockWechatStrategy.queryPayment返回paid=true
        // 后端handleCallback将标记支付单为SUCCESS、订单为PAID
        startPollingStatus()
      }, 1500)
      return
    }

    paying.value = false
  } catch (e: any) {
    paying.value = false
    uni.showToast({ title: e?.message || '支付失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.payment {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 80px;
}

/* 自定义导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-arrow {
  width: 10px;
  height: 10px;
  border-left: 2px solid $text;
  border-bottom: 2px solid $text;
  transform: rotate(45deg);
  margin-left: 6px;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: $text;
}

.nav-placeholder {
  width: 40px;
}

.amount-card {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  padding: 32px 20px;
  text-align: center;
}

.lbl {
  display: block;
  font-size: 13px;
  opacity: 0.9;
}

.amount {
  display: block;
  font-size: 40px;
  font-weight: 800;
  margin: 8px 0;
}

.order-no {
  display: block;
  font-size: 12px;
  opacity: 0.85;
}

.countdown {
  display: inline-block;
  margin-top: 10px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 12px;
}

.fee-detail {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  opacity: 0.9;
  margin-top: 6px;
  &:first-child { margin-top: 0; }
}

.fee-free {
  color: #A5D6A7;
}

.coupon-row :last-child {
  color: #A5D6A7;
}

.pay-methods {
  background: #fff;
  margin: 16px;
  border-radius: $radius-md;
  padding: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
  color: $text;
}

.pay-item {
  display: flex;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid $border;
}

.pay-item:last-child {
  border-bottom: none;
}

.pay-disabled {
  opacity: 0.5;
}

.pay-icon-img {
  width: 36px;
  height: 36px;
  margin-right: 14px;
  border-radius: 8px;
  flex-shrink: 0;
}

.pay-info {
  flex: 1;
}

.pay-name {
  font-size: 15px;
  font-weight: 600;
  display: block;
}

.pay-desc {
  font-size: 11px;
  color: $text-muted;
  margin-top: 2px;
  display: block;
}

.pay-radio {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border: 2px solid $border;
}

.pay-radio-active {
  background: $primary;
  border-color: $primary;
  box-shadow: inset 0 0 0 3px #fff;
}

.pay-active {
  background: rgba(255, 107, 53, 0.04);
  border-radius: 8px;
}

.pay-btn {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  height: 50px;
  line-height: 50px;
  text-align: center;
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 25px;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
}

.pay-btn-disabled {
  opacity: 0.6;
}

/* 支付宝跳转中覆盖层 */
.alipay-webview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.alipay-loading {
  font-size: 15px;
  color: #666;
}
</style>
