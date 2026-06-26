<template>
  <view class="checkout">
    <!-- 收货地址 -->
    <view class="address-card" @tap="goAddress">
      <CategoryIcon name="location" :size="22" color="#FF6B35" />
      <view class="addr-info" v-if="address">
        <view class="addr-line1">
          <text class="addr-name">{{ address.name }}</text>
          <text class="addr-phone">{{ address.phone }}</text>
        </view>
        <text class="addr-detail">{{ address.tag }} · {{ address.address }}</text>
      </view>
      <view v-else class="addr-empty">请选择收货地址 ▸</view>
    </view>

    <!-- 商家 -->
    <view class="merchant-row">
      <CategoryIcon name="shop" :size="18" color="#333" />
      <text class="m-name">{{ cartStore.merchantName }}</text>
    </view>

    <!-- 商品列表 -->
    <view class="dish-list">
      <view v-for="it in cartStore.items" :key="it.id" class="dish-item">
        <view class="d-img-wrap">
          <SmartImage
            :src="it.dishImage"
            bg="linear-gradient(135deg, #FF6B35, #FFC107)"
            icon="meishi"
            :iconSize="22"
            radius="6px"
            mode="aspectFill"
          />
        </view>
        <view class="d-info">
          <text class="d-name">{{ it.dishName }}</text>
          <text class="d-spec">{{ it.specName || '默认' }}</text>
        </view>
        <view class="d-price">¥{{ it.unitPrice.toFixed(2) }} × {{ it.quantity }}</view>
      </view>
    </view>

    <!-- 优惠券 -->
    <view class="coupon-row" @tap="openCouponPopup">
      <text class="lbl">优惠券</text>
      <text class="coupon-text" :class="{ 'coupon-active': selectedCoupon }">
        {{ selectedCoupon ? selectedCoupon.name : '选择优惠券' }}
      </text>
      <text class="arrow">›</text>
    </view>

    <!-- 备注 -->
    <view class="remark-row" @tap="openRemarkPopup">
      <text class="lbl">备注</text>
      <text class="remark-text" :class="{ placeholder: !remark }">{{ remark || '选填，可填写口味、忌口等' }}</text>
      <text class="arrow">›</text>
    </view>

    <!-- 费用明细 -->
    <view class="price-list">
      <view class="p-row"><text>商品金额</text><text>¥{{ cartStore.totalAmount.toFixed(2) }}</text></view>
      <view class="p-row"><text>配送费</text><text>¥{{ cartStore.deliveryFee.toFixed(2) }}</text></view>
      <view class="p-row"><text>优惠</text><text style="color: $success;">-¥{{ 0 }}</text></view>
      <view v-if="selectedCoupon" class="p-row"><text>券抵扣</text><text style="color: $success;">-¥{{ couponDiscount.toFixed(2) }}</text></view>
      <view class="p-row total">
        <text>实付</text>
        <text class="p-total-price">¥{{ payable.toFixed(2) }}</text>
      </view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <view class="footer-total">合计：<text class="price">¥{{ payable.toFixed(2) }}</text></view>
      <!-- 使用 view + 条件判断实现真正的禁用，防止任何点击事件触发 -->
      <view 
        v-if="!isSubmitting"
        class="submit-btn" 
        @tap.stop.prevent="onSubmit"
      >提交订单</view>
      <view 
        v-else
        class="submit-btn submit-disabled"
      >提交中...</view>
    </view>

    <!-- 优惠券弹窗 -->
    <view v-if="showCouponPopup" class="popup-mask" @tap="closeCouponPopup">
      <view class="popup-content coupon-popup" @tap.stop>
        <view class="popup-header">
          <text class="popup-title">选择优惠券</text>
          <text class="popup-close" @tap="closeCouponPopup">×</text>
        </view>
        <scroll-view scroll-y class="coupon-scroll">
          <view class="popup-coupon-list">
            <view class="popup-coupon-item no-coupon" :class="{ active: !selectedCoupon }" @tap="selectCoupon(null)">
              <text>不使用优惠券</text>
              <view v-if="!selectedCoupon" class="popup-check"><CategoryIcon name="check" :size="14" /></view>
            </view>
            <view
              v-for="c in usableCoupons"
              :key="c.id"
              class="popup-coupon-item"
              :class="{ active: selectedCoupon?.id === c.id }"
              @tap="selectCoupon(c)"
            >
              <view class="popup-coupon-left" :style="{ background: c.bg }">
                <text class="popup-coupon-value">{{ c.type === 'amount' ? `¥${c.value}` : `${c.value}折` }}</text>
                <text class="popup-coupon-condition">{{ c.condition }}</text>
              </view>
              <view class="popup-coupon-body">
                <text class="popup-coupon-name">{{ c.name }}</text>
                <text class="popup-coupon-desc">{{ c.desc }}</text>
                <text class="popup-coupon-expire">{{ c.expire }} 到期</text>
              </view>
              <view v-if="selectedCoupon?.id === c.id" class="popup-check"><CategoryIcon name="check" :size="14" /></view>
            </view>
          </view>
        </scroll-view>
        <view class="popup-footer">
          <view class="popup-btn" @tap="closeCouponPopup">确定</view>
        </view>
      </view>
    </view>

    <!-- 备注弹窗 -->
    <view v-if="showRemarkPopup" class="popup-mask" @tap="closeRemarkPopup">
      <view class="popup-content remark-popup" @tap.stop>
        <view class="popup-header">
          <text class="popup-title">填写备注</text>
          <text class="popup-close" @tap="closeRemarkPopup">×</text>
        </view>
        <textarea
          v-model="remarkInput"
          class="remark-textarea"
          placeholder="选填，可填写口味、忌口等"
          maxlength="50"
        />
        <text class="remark-count">{{ remarkInput.length }}/50</text>
        <view class="popup-footer">
          <view class="popup-btn" @tap="confirmRemark">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/store/cart'
import { useUserStore } from '@/store/user'
import { getDefaultAddress, createOrder, getMyCoupons } from '@/api'
import type { AddressVO } from '@/types/api'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'

// ==================== 全局防重锁（模块级，跨组件实例生效） ====================
// 使用模块级变量 + storage 双重保险，确保即使有多个组件实例或页面事件重复触发也不会重复提交
let GLOBAL_ORDER_SUBMITTING = false
const ORDER_SUBMIT_LOCK_KEY = 'wzz_order_submit_lock'
const ORDER_SUBMIT_TOKEN_KEY = 'wzz_order_client_token'

function tryAcquireSubmitLock(): boolean {
  // 1. 检查内存锁
  if (GLOBAL_ORDER_SUBMITTING) {
    console.log('[防重复提交] 内存锁已被占用')
    return false
  }
  // 2. 检查 storage 锁（防止页面刷新或多实例情况）
  const locked = uni.getStorageSync(ORDER_SUBMIT_LOCK_KEY)
  if (locked) {
    const lockTime = parseInt(locked, 10)
    // 如果锁在 5 秒内，认为有效
    if (Date.now() - lockTime < 5000) {
      console.log('[防重复提交] Storage锁有效，距上次锁定', Date.now() - lockTime, 'ms')
      return false
    }
    // 锁过期，清除
    uni.removeStorageSync(ORDER_SUBMIT_LOCK_KEY)
  }
  // 3. 获取锁
  GLOBAL_ORDER_SUBMITTING = true
  uni.setStorageSync(ORDER_SUBMIT_LOCK_KEY, Date.now().toString())
  return true
}

function releaseSubmitLock() {
  GLOBAL_ORDER_SUBMITTING = false
  uni.removeStorageSync(ORDER_SUBMIT_LOCK_KEY)
}

const cartStore = useCartStore()
const userStore = useUserStore()
const remark = ref('')
const remarkInput = ref('')
const address = ref<AddressVO | null>(null)
const selectedCoupon = ref<any>(null)
const showCouponPopup = ref(false)
const showRemarkPopup = ref(false)
const isSubmitting = ref(false)
// 已提交成功标记：一旦成功跳转到支付页，任何后续触发都直接忽略
const submitted = ref(false)
// 保存当前提交的 clientToken，用于请求去重
let currentClientToken: string | null = null
const usableCoupons = ref<any[]>([])

onShow(() => {
  cartStore.fetchCart()
  loadDefaultAddress()
  // 进入结算页时刷新用户资料，确保 phoneBound 最新
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {})
  }
  // 进入页面时释放可能残留的锁
  releaseSubmitLock()
})

onLoad((q: any) => {
  if (q?.addressId) {
    // 从地址列表返回时可通过参数回显，这里简化直接刷新默认地址
  }
})

onMounted(() => {
  loadUsableCoupons()
})

async function loadDefaultAddress() {
  try {
    const dto = await getDefaultAddress()
    if (dto) address.value = dto as any
  } catch (e) {
    console.error('获取默认地址失败', e)
  }
}

async function loadUsableCoupons() {
  try {
    // 获取用户已领取的未使用优惠券（status=0）
    const res = await getMyCoupons(0)
    const list = (res?.list || []) as any[]
    const now = Date.now()
    usableCoupons.value = list
      .filter((c: any) => {
        // 过滤已过期的券
        if (c.validEnd) {
          const endTime = new Date(c.validEnd).getTime()
          if (endTime < now) return false
        }
        // 过滤已使用或已过期的状态
        if (c.status !== 0) return false
        return true
      })
      .map((c: any) => ({
        id: c.id,
        couponId: c.couponId,
        type: c.type === 2 ? 'discount' : 'amount',
        value: c.type === 2 ? (c.discount ? Number(c.discount) * 10 : 0) : (Number(c.amount) || 0),
        condition: c.threshold && c.threshold > 0 ? `满 ${c.threshold} 元可用` : '无门槛',
        name: c.couponName || '优惠券',
        desc: c.typeDesc || '',
        expire: c.validEnd ? new Date(c.validEnd).toLocaleDateString() : '',
        bg: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
      }))
  } catch (e) {
    console.error('加载可用优惠券失败', e)
    usableCoupons.value = []
  }
}

const couponDiscount = computed(() => {
  if (!selectedCoupon.value) return 0
  if (selectedCoupon.value.type === 'amount') return selectedCoupon.value.value
  return Number((cartStore.totalAmount * (1 - selectedCoupon.value.value / 10)).toFixed(2))
})

const payable = computed(() => {
  const base = cartStore.payAmount
  return Math.max(0, Number((base - couponDiscount.value).toFixed(2)))
})

function goAddress() {
  uni.navigateTo({ url: '/pages/address/list?from=checkout' })
}

function openCouponPopup() {
  if (isSubmitting.value) return
  showCouponPopup.value = true
}

function closeCouponPopup() {
  showCouponPopup.value = false
}

function selectCoupon(c: any) {
  if (isSubmitting.value) return
  selectedCoupon.value = c
}

function openRemarkPopup() {
  if (isSubmitting.value) return
  remarkInput.value = remark.value
  showRemarkPopup.value = true
}

function closeRemarkPopup() {
  showRemarkPopup.value = false
}

function confirmRemark() {
  remark.value = remarkInput.value.slice(0, 50)
  closeRemarkPopup()
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function onSubmit() {
  // 第1层防护：已提交成功标记
  if (submitted.value) {
    console.log('[onSubmit] 已提交成功，忽略重复触发')
    return
  }

  // 第2层防护：全局提交锁（内存+Storage双重检查）
  if (!tryAcquireSubmitLock()) {
    uni.showToast({ title: '正在提交中，请勿重复操作', icon: 'none' })
    return
  }

  // 第3层防护：本地状态标记
  isSubmitting.value = true

  // 校验：地址
  if (!address.value) {
    releaseSubmitLock()
    isSubmitting.value = false
    return uni.showToast({ title: '请先选择地址', icon: 'none' })
  }
  // 校验：购物车
  if (!cartStore.items.length) {
    releaseSubmitLock()
    isSubmitting.value = false
    return uni.showToast({ title: '购物车为空', icon: 'none' })
  }

  // 校验：手机号绑定
  if (!userStore.phoneBound) {
    releaseSubmitLock()
    isSubmitting.value = false
    uni.showModal({
      title: '需要绑定手机号',
      content: '下单前需绑定手机号以便骑手联系，是否立即绑定？',
      confirmText: '去绑定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: `/pages/bind-phone/index?redirect=${encodeURIComponent('/pages/order/checkout')}` })
        }
      }
    })
    return
  }

  // 生成唯一 clientToken（只生成一次）
  currentClientToken = generateUUID()
  uni.setStorageSync(ORDER_SUBMIT_TOKEN_KEY, currentClientToken)

  console.log('[onSubmit] 开始提交订单, clientToken:', currentClientToken)

  try {
    // 构建订单参数
    const orderPayload: any = {
      merchantId: cartStore.merchantId,
      addressId: address.value.id,
      items: cartStore.items.map((i: any) => ({
        dishId: i.dishId,
        specId: i.specId || null,
        quantity: i.quantity
      })),
      remark: remark.value || '',
      clientToken: currentClientToken,
    }
    // 只有选择了优惠券才传userCouponId
    if (selectedCoupon.value?.id) {
      orderPayload.userCouponId = selectedCoupon.value.id
    }

    console.log('[onSubmit] 请求参数:', JSON.stringify(orderPayload))
    const res = await createOrder(orderPayload)
    console.log('[onSubmit] 订单创建成功:', res)
    
    // 标记为已提交，防止后续任何重复触发
    submitted.value = true
    
    // 跳转到支付页
    uni.redirectTo({ url: `/pages/order/payment?id=${res.id}&amount=${res.payAmount}&paymentNo=${res.orderNo}` })
  } catch (e: any) {
    console.error('[onSubmit] 订单提交失败:', e)
    // 后端可能返回 PHONE_NOT_BOUND(10009)，同样引导去绑定
    if (e?.code === 10009) {
      uni.showModal({
        title: '需要绑定手机号',
        content: '下单前需绑定手机号以便骑手联系，是否立即绑定？',
        confirmText: '去绑定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: `/pages/bind-phone/index?redirect=${encodeURIComponent('/pages/order/checkout')}` })
          }
        }
      })
    } else {
      // 即使是"请勿重复提交"错误，也不要让用户反复点击，提示后刷新状态
      const errMsg = e?.message || '下单失败，请重试'
      uni.showToast({ title: errMsg, icon: 'none' })
    }
  } finally {
    // 只有在没有提交成功时才释放锁和重置状态
    if (!submitted.value) {
      releaseSubmitLock()
      isSubmitting.value = false
    }
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.checkout {
  min-height: 100vh;
  background: $bg;
  padding-top: calc(var(--status-bar-height, 20px) + 44px);
  padding-bottom: 70px;
}

.address-card {
  background: #fff;
  margin: 12px 16px;
  border-radius: $radius-md;
  padding: 16px;
  display: flex;
  align-items: center;
  box-shadow: $shadow;
}

.addr-icon {
  margin-right: 12px;
  flex-shrink: 0;
}

.addr-info {
  flex: 1;
}

.addr-line1 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
}

.addr-phone {
  color: $text-light;
  font-weight: 400;
}

.addr-detail {
  color: $text-light;
  font-size: 13px;
  margin-top: 4px;
}

.addr-empty {
  color: $text-muted;
  font-size: 14px;
  flex: 1;
}

.merchant-row {
  background: #fff;
  margin: 0 16px 12px;
  padding: 12px 16px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
}

.m-icon {
  margin-right: 8px;
  flex-shrink: 0;
}

.m-name {
  font-size: 14px;
  font-weight: 600;
}

.dish-list {
  background: #fff;
  margin: 0 16px 12px;
  border-radius: $radius-md;
  padding: 12px 16px;
}

.dish-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.d-img-wrap {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  margin-right: 10px;
  flex-shrink: 0;
  overflow: hidden;
}

.d-info {
  flex: 1;
  min-width: 0;
}

.d-name {
  display: block;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.d-spec {
  display: block;
  font-size: 12px;
  color: $text-light;
  margin-top: 2px;
}

.d-price {
  color: $primary;
  font-weight: 600;
  margin-left: 8px;
  flex-shrink: 0;
}

.coupon-row, .remark-row {
  background: #fff;
  margin: 0 16px 12px;
  padding: 14px 16px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
}

.lbl {
  color: $text-light;
  margin-right: 12px;
  font-size: 14px;
}

.coupon-text, .remark-text {
  flex: 1;
  font-size: 14px;
  color: $text;
}

.coupon-active {
  color: $primary;
}

.placeholder {
  color: $text-muted;
}

.arrow {
  color: $text-muted;
  font-size: 18px;
  margin-left: 8px;
}

.price-list {
  background: #fff;
  margin: 0 16px 12px;
  padding: 16px;
  border-radius: $radius-md;
}

.p-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
  color: $text-light;
}

.p-row.total {
  border-top: 1px solid $border;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 15px;
  color: $text;
  font-weight: 600;
}

.p-total-price {
  color: $primary;
  font-size: 18px;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  z-index: 100;
}

.footer-total {
  font-size: 14px;
}

.footer-total .price {
  color: $primary;
  font-size: 18px;
  font-weight: 700;
  margin-left: 4px;
}

.submit-btn {
  background: linear-gradient(135deg, $primary 0%, #FF8C42 100%);
  color: #fff;
  padding: 10px 28px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  min-width: 120px;
  text-align: center;
}

.submit-disabled {
  background: #ccc;
  color: #fff;
}

/* 弹窗 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.popup-content {
  background: #fff;
  width: 100%;
  border-radius: 16px 16px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid $border;
}

.popup-title {
  font-size: 16px;
  font-weight: 600;
}

.popup-close {
  font-size: 24px;
  color: $text-muted;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coupon-scroll {
  flex: 1;
  max-height: 50vh;
}

.popup-coupon-list {
  padding: 12px 16px;
}

.popup-coupon-item {
  display: flex;
  background: #fafafa;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  position: relative;
  border: 2px solid transparent;
}

.popup-coupon-item.active {
  border-color: $primary;
}

.popup-coupon-item.no-coupon {
  justify-content: center;
  padding: 16px;
  color: $text-light;
}

.popup-coupon-left {
  width: 90px;
  padding: 12px 8px;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.popup-coupon-value {
  font-size: 20px;
  font-weight: 700;
}

.popup-coupon-condition {
  font-size: 10px;
  margin-top: 2px;
  opacity: 0.9;
}

.popup-coupon-body {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.popup-coupon-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.popup-coupon-desc {
  font-size: 12px;
  color: $text-light;
  margin-bottom: 2px;
}

.popup-coupon-expire {
  font-size: 11px;
  color: $text-muted;
}

.popup-check {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background: $primary;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remark-textarea {
  width: 100%;
  min-height: 100px;
  padding: 16px;
  font-size: 14px;
  box-sizing: border-box;
  border: none;
  outline: none;
  resize: none;
}

.remark-count {
  text-align: right;
  padding: 0 16px 8px;
  font-size: 12px;
  color: $text-muted;
}

.popup-footer {
  padding: 12px 16px;
  border-top: 1px solid $border;
}

.popup-btn {
  background: $primary;
  color: #fff;
  text-align: center;
  padding: 12px;
  border-radius: 24px;
  font-weight: 600;
}
</style>
