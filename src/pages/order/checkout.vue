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

    <!-- 商家信息卡片 -->
    <view class="merchant-card">
      <view class="m-logo-wrap">
        <image
          v-if="currentMerchantLogo"
          :src="currentMerchantLogo"
          class="m-logo"
          mode="aspectFill"
        />
        <view v-else class="m-logo m-logo--default">
          <CategoryIcon name="shop" :size="22" color="#FF6B35" />
        </view>
      </view>
      <view class="m-info">
        <text class="m-name">{{ currentMerchantName }}</text>
        <view class="m-tag">商家</view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="dish-list">
      <view v-for="it in displayItems" :key="it.id" class="dish-item">
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
      <view class="p-row"><text>商品金额</text><text>¥{{ currentTotalAmount.toFixed(2) }}</text></view>
      <view class="p-row"><text>打包费</text><text>¥{{ currentPackingFee.toFixed(2) }}</text></view>
      <view v-if="diningType !== 3" class="p-row"><text>配送费</text><text>¥{{ currentDeliveryFee.toFixed(2) }}</text></view>
      <view v-else class="p-row"><text>配送费</text><text style="color: #00C853;">自取免配送费</text></view>
      <view v-if="couponDiscount > 0" class="p-row"><text>优惠</text><text style="color: #00C853;">-¥{{ couponDiscount.toFixed(2) }}</text></view>
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
              v-for="c in couponList"
              :key="c.id"
              class="popup-coupon-item"
              :class="{ active: selectedCoupon && String(selectedCoupon.id) === String(c.id), disabled: !c.usable }"
              @tap="selectCoupon(c)"
            >
              <view class="popup-coupon-left" :style="{ background: c.usable ? c.bg : 'linear-gradient(135deg, #bbb 0%, #999 100%)' }">
                <text class="popup-coupon-value">{{ c.type === 'amount' ? `¥${c.value}` : `${c.value}折` }}</text>
                <text class="popup-coupon-condition">{{ c.condition }}</text>
              </view>
              <view class="popup-coupon-body">
                <text class="popup-coupon-name">{{ c.name }}</text>
                <text class="popup-coupon-desc">{{ c.desc }}</text>
                <text class="popup-coupon-expire">
                  {{ c.usable ? (c.expire + ' 到期') : '不可用于此商家' }}
                </text>
              </view>
              <view v-if="selectedCoupon && String(selectedCoupon.id) === String(c.id) && c.usable" class="popup-check"><CategoryIcon name="check" :size="14" /></view>
              <view v-if="!c.usable" class="popup-disabled-tag">不可用</view>
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
import { ref, computed, onMounted, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { useCartStore } from '@/store/cart'
import { useUserStore } from '@/store/user'
import { getDefaultAddress, createOrder, getDishDetail, getMyCoupons, getMerchantDetail, previewOrder } from '@/api'
import type { AddressVO } from '@/types/api'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'

// ==================== 全局防重锁（模块级，跨组件实例生效） ====================
let GLOBAL_ORDER_SUBMITTING = false
const ORDER_SUBMIT_LOCK_KEY = 'wzz_order_submit_lock'
const ORDER_SUBMIT_TOKEN_KEY = 'wzz_order_client_token'

function tryAcquireSubmitLock(): boolean {
  if (GLOBAL_ORDER_SUBMITTING) {
    console.log('[防重复提交] 内存锁已被占用')
    return false
  }
  const locked = uni.getStorageSync(ORDER_SUBMIT_LOCK_KEY)
  if (locked) {
    const lockTime = parseInt(locked, 10)
    if (Date.now() - lockTime < 5000) {
      console.log('[防重复提交] Storage锁有效，距上次锁定', Date.now() - lockTime, 'ms')
      return false
    }
    uni.removeStorageSync(ORDER_SUBMIT_LOCK_KEY)
  }
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

// ==================== 立即购买模式状态 ====================
const isBuyNow = ref(false)
const buyNowMerchantId = ref<string | null>(null)
const buyNowMerchantName = ref<string>('')
const buyNowMerchantLogo = ref<string>('')
const buyNowItems = ref<any[]>([]) // 立即购买的商品列表（结构对齐 CartItemVO）
const buyNowDeliveryFee = ref<number>(0)
const buyNowTotalAmount = ref<number>(0)
const buyNowPayAmount = ref<number>(0)
// diningType：2=外卖（默认），3=自取（对应后端diningType）
const diningType = ref<number>(2)

// ==================== 订单预览（按地址计算真实金额） ====================
// preview 有值时优先使用预览结果（含超距配送费、打包费），否则回退到 cartStore/buyNow 估算值
const preview = ref<{
  totalAmount: number
  packingFee: number
  deliveryFee: number
  couponAmount: number
  payAmount: number
  reachMinAmount: boolean
} | null>(null)

const remark = ref('')
const remarkInput = ref('')
const address = ref<AddressVO | null>(null)
const selectedCoupon = ref<any>(null)
const showCouponPopup = ref(false)
const showRemarkPopup = ref(false)
const isSubmitting = ref(false)
const submitted = ref(false)
let currentClientToken: string | null = null
const couponList = ref<any[]>([]) // 弹窗中展示的券列表（含不可用的）
// 购物车模式下，页面加载时传入的 merchantId（用于过滤该商家的商品，保持字符串避免精度丢失）
const cartMerchantIdRef = ref<string | null>(null)

// ==================== 当前模式下的展示数据 ====================
const currentMerchantId = computed<string | null>(() => {
  if (isBuyNow.value) return buyNowMerchantId.value ? String(buyNowMerchantId.value) : null
  // 购物车模式：优先使用URL传入的merchantId，否则取购物车中第一个商家
  if (cartMerchantIdRef.value) return cartMerchantIdRef.value
  const mid = cartStore.merchantId
  return mid ? String(mid) : null
})

const currentMerchantName = computed(() => {
  if (isBuyNow.value) return buyNowMerchantName.value || '商家'
  return cartStore.merchantName || ''
})

const currentMerchantLogo = computed(() => {
  if (isBuyNow.value) return buyNowMerchantLogo.value || ''
  // 购物车模式：优先使用URL传入的merchantId对应分组的logo，否则取购物车第一个商家的logo
  const mid = cartMerchantIdRef.value || cartStore.merchantId
  if (mid) {
    // 直接传字符串mid，避免Number转换导致精度丢失
    const g = cartStore.getGroup(String(mid))
    if (g?.merchantLogo) return g.merchantLogo
  }
  // 兼容：直接取 cart 上的 merchantLogo
  return (cartStore.cart as any)?.merchantLogo || ''
})

const displayItems = computed<any[]>(() => {
  if (isBuyNow.value) return buyNowItems.value
  // 购物车模式：如果 URL 带 merchantId 则过滤该商家的商品，否则展示全部
  if (cartMerchantIdRef.value) {
    return cartStore.getItemsByMerchant(cartMerchantIdRef.value)
  }
  return cartStore.items as any[]
})

const currentTotalAmount = computed(() => {
  // 优先使用预览结果（含真实配送费/打包费）
  if (preview.value) return Number(preview.value.totalAmount || 0)
  if (isBuyNow.value) return buyNowTotalAmount.value
  if (cartMerchantIdRef.value) {
    const g = cartStore.getGroup(cartMerchantIdRef.value)
    return g ? Number(g.totalAmount || 0) : cartStore.totalAmount
  }
  return cartStore.totalAmount
})

const currentDeliveryFee = computed(() => {
  // 自取模式免配送费
  if (diningType.value === 3) return 0
  // 优先使用预览结果（含超距加价）
  if (preview.value) return Number(preview.value.deliveryFee || 0)
  if (isBuyNow.value) return buyNowDeliveryFee.value
  if (cartMerchantIdRef.value) {
    const g = cartStore.getGroup(cartMerchantIdRef.value)
    return g ? Number(g.deliveryFee || 0) : cartStore.deliveryFee
  }
  return cartStore.deliveryFee
})

const currentPackingFee = computed(() => {
  // 自取/外卖均需打包费
  // 优先使用预览结果
  if (preview.value) return Number(preview.value.packingFee || 0)
  if (isBuyNow.value) return 0 // 立即购买模式无打包费预览，回退0
  if (cartMerchantIdRef.value) {
    const g = cartStore.getGroup(cartMerchantIdRef.value)
    return g ? Number(g.packingFee || 0) : cartStore.packingFee
  }
  return cartStore.packingFee
})

const currentPayAmount = computed(() => {
  // 优先使用预览结果（已扣除券抵扣）
  if (preview.value) return Number(preview.value.payAmount || 0)
  if (isBuyNow.value) return buyNowPayAmount.value
  let amount: number
  if (cartMerchantIdRef.value) {
    const g = cartStore.getGroup(cartMerchantIdRef.value)
    amount = g ? Number(g.payAmount || 0) : cartStore.payAmount
  } else {
    amount = cartStore.payAmount
  }
  // 自取模式下从应付中扣除配送费（前端展示用，实际金额以后端结算为准）
  if (diningType.value === 3) {
    const fee = cartMerchantIdRef.value
      ? (cartStore.getGroup(cartMerchantIdRef.value) ? Number(cartStore.getGroup(cartMerchantIdRef.value)!.deliveryFee || 0) : cartStore.deliveryFee)
      : cartStore.deliveryFee
    amount = amount - fee
  }
  return Math.max(0, amount)
})

// ==================== 生命周期 ====================
onShow(() => {
  if (!isBuyNow.value) {
    cartStore.fetchCart().then(() => {
      // 购物车数据加载完成后，重新按商家过滤优惠券
      loadUsableCoupons()
      // 触发预览（购物车商品/数量可能变化）
      schedulePreview()
    })
  } else {
    loadUsableCoupons()
    schedulePreview()
  }
  loadDefaultAddress()
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {})
  }
  releaseSubmitLock()
})

// 监听地址、商品、用餐类型变化，自动重新预览
watch([address, displayItems, diningType], () => {
  schedulePreview()
}, { deep: true })

onLoad(async (q: any) => {
  // 检测是否为立即购买模式
  if (q && String(q.buyNow) === '1') {
    isBuyNow.value = true
    // ID保持字符串避免雪花ID精度丢失
    const merchantId = String(q.merchantId || '')
    const dishId = String(q.dishId || '')
    const specId = q.specId ? String(q.specId) : undefined
    const quantity = Number(q.quantity) || 1
    if (q.diningType) diningType.value = Number(q.diningType)
    buyNowMerchantId.value = merchantId
    // 加载菜品详情
    await loadBuyNowDish(merchantId, dishId, specId, quantity)
  } else if (q && q.merchantId) {
    // 购物车结算模式，指定商家（保持字符串）
    cartMerchantIdRef.value = String(q.merchantId)
    if (q.diningType) diningType.value = Number(q.diningType)
    else diningType.value = cartStore.diningType
  } else {
    // 无参数时从cartStore获取diningType
    diningType.value = cartStore.diningType
  }
})

onMounted(() => {
  // 优惠券加载统一由 onShow 处理，避免与 cartStore.fetchCart 竞态
})

// ==================== 立即购买：加载菜品 ====================
async function loadBuyNowDish(merchantId: string, dishId: string, specId: string | undefined, quantity: number) {
  try {
    uni.showLoading({ title: '加载中' })
    const dish = await getDishDetail(dishId) as any
    let specName = ''
    let unitPrice = Number(dish.price) || 0
    if (specId && dish.specs && dish.specs.length) {
      const spec = dish.specs.find((s: any) => String(s.id) === String(specId))
      if (spec) {
        specName = spec.name
        unitPrice = Number(dish.price) + Number(spec.priceDiff || 0)
      }
    }
    buyNowMerchantName.value = dish.merchantName || '商家'
    buyNowMerchantLogo.value = dish.merchantLogo || ''
    const subtotal = Number((unitPrice * quantity).toFixed(2))
    buyNowItems.value = [{
      id: `bn-${dishId}-${specId || ''}`,
      merchantId,
      dishId,
      dishName: dish.name,
      dishImage: dish.image || (dish.images && dish.images[0]) || '',
      specId: specId || null,
      specName,
      unitPrice,
      quantity,
      subtotal,
    }]
    buyNowTotalAmount.value = subtotal
    // 从商家信息获取配送费（外卖模式）
    if (diningType.value !== 3) {
      try {
        const merchantDetail: any = await getMerchantDetail(merchantId)
        const baseFee = Number(merchantDetail?.deliveryFee || 0)
        buyNowDeliveryFee.value = baseFee
      } catch (e) {
        console.error('获取商家配送费失败', e)
        buyNowDeliveryFee.value = 0
      }
    } else {
      buyNowDeliveryFee.value = 0
    }
    buyNowPayAmount.value = subtotal + buyNowDeliveryFee.value
  } catch (e) {
    console.error('加载立即购买菜品失败', e)
    uni.showToast({ title: '菜品信息加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
  // 菜品加载完成后再加载可用优惠券（此时金额/商家ID已就绪）
  loadUsableCoupons()
}

// ==================== 地址 ====================
async function loadDefaultAddress() {
  try {
    const dto = await getDefaultAddress()
    if (dto) address.value = dto as any
  } catch (e) {
    console.error('获取默认地址失败', e)
  }
  // 地址加载完成后触发预览（watch address 也会触发，这里显式调用确保及时）
  schedulePreview()
}

// ==================== 订单预览（按地址计算真实配送费/打包费/总额） ====================
let previewTimer: ReturnType<typeof setTimeout> | null = null
function schedulePreview() {
  // 防抖：地址/券/商品变化后 300ms 触发预览，避免高频调用
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    fetchPreview()
  }, 300)
}

async function fetchPreview() {
  const mid = currentMerchantId.value
  const addr = address.value
  const items = displayItems.value
  if (!mid || !items.length) {
    preview.value = null
    return
  }
  // 无论外卖还是自取，都需要地址才能调后端预览接口（后端校验地址归属）
  // 无地址时回退到 cartStore 估算值（自取模式配送费为0，cartStore 的打包费/商品金额可用）
  if (!addr) {
    preview.value = null
    return
  }
  try {
    const payload: any = {
      merchantId: String(mid),
      addressId: String(addr.id),
      items: items.map((i: any) => ({
        dishId: String(i.dishId),
        specId: i.specId ? String(i.specId) : null,
        quantity: Number(i.quantity),
      })),
      diningType: diningType.value,
    }
    if (selectedCoupon.value?.id) {
      payload.userCouponId = String(selectedCoupon.value.id)
    }
    const res: any = await previewOrder(payload)
    if (res) {
      preview.value = {
        totalAmount: Number(res.totalAmount || 0),
        packingFee: Number(res.packingFee || 0),
        deliveryFee: Number(res.deliveryFee || 0),
        couponAmount: Number(res.couponAmount || 0),
        payAmount: Number(res.payAmount || 0),
        reachMinAmount: res.reachMinAmount !== false,
      }
    } else {
      preview.value = null
    }
  } catch (e: any) {
    console.warn('[订单预览] 失败，回退到购物车估算值', e?.message || e)
    preview.value = null
  }
}

// ==================== 优惠券 ====================
function isCouponUsableForMerchant(c: any, mid: string | null): boolean {
  if (!mid) return true
  // scope: 1=全场通用, 2=指定商家, 3=指定类目
  // 专享券（scope=2）必须 scopeIds 包含当前 merchantId 才可用
  if (c.scope === 2) {
    const ids: any[] = Array.isArray(c.scopeIds) ? c.scopeIds : []
    return ids.some((id) => String(id) === String(mid))
  }
  return true
}

async function loadUsableCoupons() {
  try {
    const mid = currentMerchantId.value
    const amount = Number(currentTotalAmount.value) || 0
    console.log('[结算页] 加载可用优惠券, merchantId=', mid, 'orderAmount=', amount)

    // 使用 myCoupons 接口获取未使用的券（该接口已验证可用），然后在前端做过滤
    const res = await getMyCoupons(0) as any
    // getMyCoupons 返回分页结构 { records, total, ... }，兼容数组直接返回
    const allUnused: any[] = (res?.records || res || []) as any[]
    console.log('[结算页] 未使用券总数:', allUnused.length)

    const now = Date.now()
    const parseDate = (s: string) => {
      if (!s) return null
      const t = s.replace(' ', 'T')
      const d = new Date(t)
      return isNaN(d.getTime()) ? null : d
    }

    const mapped = (allUnused || [])
      .filter((c: any) => {
        // 过期过滤
        const endDate = parseDate(c.validEnd)
        if (endDate && endDate.getTime() < now) return false
        // 商家范围过滤：指定商家券(scope=2)必须scopeIds包含当前merchantId（字符串比较避免精度问题）
        if (c.scope === 2 && mid) {
          const ids: any[] = Array.isArray(c.scopeIds) ? c.scopeIds : []
          if (!ids.some((id) => String(id) === String(mid))) {
            console.log('[结算页] 券被商家过滤掉, couponId=', c.id, 'couponScopeIds=', ids, 'merchantId=', mid)
            return false
          }
        }
        // 门槛过滤
        const threshold = Number(c.threshold) || 0
        if (threshold > 0 && amount < threshold) return false
        return true
      })
      .map((c: any) => {
        const endDate = parseDate(c.validEnd)
        let expireText = ''
        if (endDate) {
          const y = endDate.getFullYear()
          const m = String(endDate.getMonth() + 1).padStart(2, '0')
          const d = String(endDate.getDate()).padStart(2, '0')
          expireText = `${y}.${m}.${d}`
        }
        return {
          id: c.id,
          couponId: c.couponId,
          type: c.type === 2 ? 'discount' : 'amount',
          value: c.type === 2 ? (c.discount ? Number(c.discount) * 10 : 0) : (Number(c.amount) || 0),
          condition: c.threshold && Number(c.threshold) > 0 ? `满 ${c.threshold} 元可用` : '无门槛',
          name: c.couponName || '优惠券',
          desc: c.scopeDesc || '',
          expire: expireText,
          bg: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
          scope: c.scope,
          scopeIds: c.scopeIds || [],
          rawThreshold: Number(c.threshold) || 0,
          usable: true,
        }
      })
    console.log('[结算页] 过滤后可用优惠券:', mapped)
    couponList.value = mapped

    // 如果当前选中的券已变得不可用，自动取消选择
    if (selectedCoupon.value) {
      const stillUsable = mapped.find(c => String(c.id) === String(selectedCoupon.value.id))
      if (!stillUsable) selectedCoupon.value = null
    }
  } catch (e) {
    console.error('[结算页] 加载可用优惠券失败', e)
    couponList.value = []
  }
}

// 可用优惠券（用于自动选择/校验）
const usableCoupons = computed(() => couponList.value.filter(c => c.usable))

const couponDiscount = computed(() => {
  // 预览模式下直接使用后端计算的券抵扣金额
  if (preview.value) return Number(preview.value.couponAmount || 0)
  if (!selectedCoupon.value) return 0
  if (selectedCoupon.value.type === 'amount') return selectedCoupon.value.value
  return Number((currentTotalAmount.value * (1 - selectedCoupon.value.value / 10)).toFixed(2))
})

const payable = computed(() => {
  // 预览模式下 payAmount 已含券抵扣，直接返回
  if (preview.value) return Math.max(0, Number(preview.value.payAmount || 0))
  const base = currentPayAmount.value
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
  if (c && !c.usable) {
    uni.showToast({ title: '该优惠券不可用于此商家', icon: 'none' })
    return
  }
  selectedCoupon.value = c
  // 券变化后重新预览（后端会重新计算券抵扣金额）
  schedulePreview()
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
  if (submitted.value) {
    console.log('[onSubmit] 已提交成功，忽略重复触发')
    return
  }
  if (!tryAcquireSubmitLock()) {
    uni.showToast({ title: '正在提交中，请勿重复操作', icon: 'none' })
    return
  }
  isSubmitting.value = true

  // 校验：地址
  if (!address.value) {
    releaseSubmitLock()
    isSubmitting.value = false
    return uni.showToast({ title: '请先选择地址', icon: 'none' })
  }
  // 校验：商品
  if (!displayItems.value.length) {
    releaseSubmitLock()
    isSubmitting.value = false
    return uni.showToast({ title: '商品为空', icon: 'none' })
  }

  // 校验：已选优惠券必须适用于当前商家（兜底校验）
  if (selectedCoupon.value && !isCouponUsableForMerchant(selectedCoupon.value, currentMerchantId.value)) {
    uni.showToast({ title: '该优惠券不可用于此商家，已自动取消', icon: 'none' })
    selectedCoupon.value = null
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

  // 幂等性保护：复用上一次未完成的token，避免重复创建订单
  // 只有订单创建成功后才清除token；失败/异常时保留token，下次提交复用
  const storedToken = uni.getStorageSync(ORDER_SUBMIT_TOKEN_KEY)
  if (storedToken) {
    currentClientToken = storedToken
    console.log('[onSubmit] 复用未完成订单的clientToken:', currentClientToken)
  } else {
    currentClientToken = generateUUID()
    uni.setStorageSync(ORDER_SUBMIT_TOKEN_KEY, currentClientToken)
    console.log('[onSubmit] 生成新的clientToken:', currentClientToken)
  }

  try {
    // 构建订单 items（ID保持字符串避免雪花ID精度丢失，后端StringToLongDeserializer支持字符串转Long）
    const orderItems = displayItems.value.map((i: any) => ({
      dishId: String(i.dishId),
      specId: i.specId ? String(i.specId) : null,
      quantity: Number(i.quantity),
    }))

    const orderPayload: any = {
      merchantId: String(currentMerchantId.value),
      addressId: String(address.value.id),
      items: orderItems,
      remark: remark.value || '',
      clientToken: currentClientToken,
      diningType: diningType.value,
    }
    if (selectedCoupon.value?.id) {
      orderPayload.userCouponId = String(selectedCoupon.value.id)
    }

    console.log('[onSubmit] 请求参数:', JSON.stringify(orderPayload))
    const res = await createOrder(orderPayload)
    console.log('[onSubmit] 订单创建成功:', res)

    submitted.value = true

    // 购物车模式才刷新购物车；立即购买模式不动购物车
    if (!isBuyNow.value) {
      cartStore.fetchCart().catch(() => {})
    }

    // 跳转到支付页
    // 订单创建成功，清除clientToken，允许下次新订单
  uni.removeStorageSync(ORDER_SUBMIT_TOKEN_KEY)
  uni.redirectTo({
    url: `/pages/order/payment?id=${res.id}&amount=${res.payAmount}&paymentNo=${res.orderNo}`
      + `&totalAmount=${res.totalAmount || 0}&packingFee=${res.packingFee || 0}`
      + `&deliveryFee=${res.deliveryFee || 0}&couponAmount=${res.couponAmount || 0}`
      + `&diningType=${res.diningType || 2}`
  })
  } catch (e: any) {
    console.error('[onSubmit] 订单提交失败:', e)
    if (e?.code === 10009) {
      uni.showModal({
        title: '需要绑定手机号',
        content: '下单前需绑定手机号以便骑手联系，是否立即绑定？',
        confirmText: '去绑定',
        cancelText: '取消',
        success: (mRes) => {
          if (mRes.confirm) {
            uni.navigateTo({ url: `/pages/bind-phone/index?redirect=${encodeURIComponent('/pages/order/checkout')}` })
          }
        }
      })
    } else {
      const errMsg = e?.message || '下单失败，请重试'
      uni.showToast({ title: errMsg, icon: 'none' })
    }
  } finally {
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

.merchant-card {
  background: #fff;
  margin: 0 16px 12px;
  padding: 14px 16px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  box-shadow: $shadow;
}

.m-logo-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 12px;
  border: 2px solid #FFF0E8;
}

.m-logo {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}

.m-logo--default {
  background: linear-gradient(135deg, #FFF0E8 0%, #FFE0CC 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.m-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.m-name {
  font-size: 15px;
  font-weight: 600;
  color: $text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-tag {
  flex-shrink: 0;
  font-size: 11px;
  color: $primary;
  background: #FFF0E8;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
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

.popup-coupon-item.disabled {
  opacity: 0.65;
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

.popup-disabled-tag {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: #999;
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
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
