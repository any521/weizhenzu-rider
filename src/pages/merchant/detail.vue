<template>
  <view class="page">
    <!-- 商家信息头 -->
    <view class="merchant-header">
      <view class="merchant-info-row">
        <view class="merchant-logo-wrap">
          <SmartImage
            v-if="card.imageUrl"
            :src="card.imageUrl"
            :bg="card.bg"
            icon="shop"
            :iconSize="22"
            radius="50%"
            round
            mode="aspectFill"
          />
          <view v-else class="merchant-logo" :style="{ background: card.bg }">{{ card.logo }}</view>
        </view>
        <view class="merchant-detail">
          <view class="merchant-name-row">{{ card.name }}</view>
          <view class="merchant-rating">
            <view class="star"><CategoryIcon name="star" :size="10" /> {{ card.rating }}</view>
            <text>月售 {{ card.monthlySales }}</text>
            <template v-if="diningType !== 3">
              <text>起送 ¥{{ card.minOrder }}</text>
              <text>配送 ¥{{ card.deliveryFee }}</text>
            </template>
            <template v-else>
              <text style="color: #00C853; font-weight: 600;">到店自取</text>
            </template>
            <view class="coupon-entry-btn" @tap.stop="openCouponPopup">
              <text class="coupon-icon">🎫</text>
              <text>领券</text>
            </view>
          </view>
        </view>
        <!-- 关注按钮 -->
        <view :class="['fav-btn', isFavorited && 'fav-btn--active']" @tap="toggleFavorite">
          <CategoryIcon :name="isFavorited ? 'heart-filled' : 'heart-empty'" :size="18" />
          <text class="fav-text">{{ isFavorited ? '已关注' : '关注' }}</text>
        </view>
      </view>
      <view class="merchant-promo-row">
        <text v-for="(tag, idx) in card.tags" :key="idx" :class="['tag', `tag-${tag.type}`]">{{ tag.text }}</text>
      </view>
    </view>

    <!-- Tabs -->
    <view class="filter-tabs">
      <text
        v-for="(tab, idx) in tabs"
        :key="idx"
        :class="['filter-tab', activeTab === idx && 'active']"
        @tap="activeTab = idx"
      >{{ tab }}</text>
    </view>

    <!-- 点餐内容 -->
    <scroll-view v-if="activeTab === 0" scroll-y class="menu-content" :style="{ height: contentHeight + 'px' }">
      <view v-for="(section, sIdx) in menuSections" :key="sIdx" class="menu-section">
        <view class="menu-section-title">
          <CategoryIcon :name="section.icon" :size="12" />
          <text>{{ section.title }}</text>
        </view>
        <view
          v-for="d in section.dishes"
          :key="d.id"
          class="menu-item"
          @tap="goDish(d.id)"
        >
          <view class="menu-item-img-wrap">
            <SmartImage
              :src="d.imageUrl"
              :bg="d.bg"
              icon="meishi"
              :iconSize="28"
              radius="8px"
              mode="aspectFill"
            />
          </view>
          <view class="menu-item-info">
            <view class="menu-item-name">{{ d.name }}</view>
            <view class="menu-item-desc">{{ d.desc }}</view>
            <view class="menu-item-stats">月售 {{ d.sales }} <view class="star"><CategoryIcon name="star" :size="10" /> {{ d.rating.toFixed(1) }}</view></view>
            <view class="menu-item-bottom">
              <view class="menu-item-price">
                ¥{{ d.price }}
                <text v-if="d.originalPrice" class="old">¥{{ d.originalPrice }}</text>
              </view>
              <view class="qty-control" v-if="d.qty > 0" @tap.stop>
                <text class="qty-btn minus" @tap="onDec(d)">−</text>
                <text class="qty-num">{{ d.qty }}</text>
                <text class="qty-btn plus" @tap="onInc(d)">+</text>
              </view>
              <view v-else class="add-btn" @tap.stop="onInc(d)">+</view>
            </view>
          </view>
        </view>
      </view>
      <view style="height: 80px;"></view>
    </scroll-view>

    <!-- 评价内容 -->
    <scroll-view v-else-if="activeTab === 1" scroll-y class="tab-content" :style="{ height: contentHeight + 'px' }">
      <view class="rating-summary">
        <view class="rating-score">
          <text class="score">{{ card.rating }}</text>
          <text class="score-label">商家评分</text>
        </view>
        <view class="rating-tags">
          <text v-for="(tag, idx) in ratingTags" :key="idx" class="rating-tag">{{ tag }}</text>
        </view>
      </view>
      <view v-if="reviews.length" class="comment-list">
        <view v-for="r in reviews" :key="r.id" class="comment-item">
          <view class="comment-user">
            <view class="user-avatar">
              <image v-if="r.userAvatar" :src="r.userAvatar" class="avatar-img" mode="aspectFill" />
              <CategoryIcon v-else name="user" :size="14" />
            </view>
            <text class="user-name">{{ r.userNickname || '匿名用户' }}</text>
            <text v-if="r.createdAt" class="comment-time">{{ formatCommentTime(r.createdAt) }}</text>
          </view>
          <view class="comment-content">
            <view class="star">
              <CategoryIcon v-for="n in 5" :key="n" name="star" :size="12" :color="n <= (r.rating || 5) ? '#FF6B35' : '#ddd'" />
            </view>
            <text v-if="r.dishNames && r.dishNames.length" class="comment-dishes">
              购买：{{ r.dishNames.join('、') }}
            </text>
            <text class="comment-text">{{ r.content || '用户未留下评价' }}</text>
            <view v-if="r.images && r.images.length" class="comment-images">
              <image v-for="(img, imgIdx) in r.images" :key="imgIdx" :src="img" class="comment-img" mode="aspectFill" @tap="previewImage(img, r.images)" />
            </view>
            <view v-if="r.merchantReply || r.reply" class="merchant-reply">
              <text class="reply-label">商家回复：</text>
              <text class="reply-text">{{ r.merchantReply || r.reply }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="comment-empty">
        <text>暂无评价</text>
      </view>
      <view style="height: 80px;"></view>
    </scroll-view>

    <!-- 商家内容 -->
    <scroll-view v-else scroll-y class="tab-content" :style="{ height: contentHeight + 'px' }">
      <view class="notice-card">
        <view class="notice-title">商家公告</view>
        <text class="notice-text">{{ detail.notice || '暂无公告' }}</text>
      </view>
      <view class="info-card">
        <view class="info-title">商家信息</view>
        <view v-if="diningType !== 3" class="info-line"><text>配送时间</text><text>{{ card.deliveryTime }}</text></view>
        <view v-if="diningType !== 3" class="info-line"><text>起送价</text><text>¥{{ card.minOrder }}</text></view>
        <view v-if="diningType !== 3" class="info-line"><text>配送费</text><text>¥{{ card.deliveryFee }}</text></view>
        <view v-else class="info-line"><text>取餐方式</text><text style="color: #00C853; font-weight: 600;">到店自取（免配送费）</text></view>
        <view class="info-line"><text>商家地址</text><text>{{ detail.address || '' }}</text></view>
      </view>
      <view style="height: 80px;"></view>
    </scroll-view>

    <FloatingCart :count="cartStore.totalCount" @tap="goCart" />

    <!-- 优惠券弹窗 -->
    <van-popup
      v-model:show="showCouponPopup"
      position="bottom"
      round
      :style="{ maxHeight: '70vh' }"
      safe-area-inset-bottom
      closeable
      close-icon-position="top-right"
      class="merchant-coupon-popup"
    >
      <view class="coupon-popup-header">
        <text class="coupon-popup-title">领取优惠券</text>
      </view>
      <scroll-view scroll-y class="coupon-scroll">
        <view v-if="couponLoading" class="coupon-loading">
          <text>加载中...</text>
        </view>
        <view v-else-if="!couponList.length" class="coupon-empty">
          <text>暂无可用优惠券</text>
        </view>
        <view v-else class="coupon-list">
          <view
            v-for="c in couponList"
            :key="c.id"
            :class="['coupon-card', { 'coupon-card--disabled': !c.canReceive }]"
          >
            <view class="coupon-card-left">
              <text class="coupon-value">{{ formatCouponValue(c) }}</text>
              <text class="coupon-condition">{{ formatCouponCondition(c) }}</text>
            </view>
            <view class="coupon-card-body">
              <text class="coupon-name">{{ c.name }}</text>
              <text class="coupon-expire">{{ formatCouponExpire(c) }}</text>
            </view>
            <view class="coupon-card-right">
              <view
                v-if="c.canReceive"
                class="coupon-receive-btn"
                :class="{ 'coupon-receive-btn--loading': receivingId === c.id }"
                @tap="onReceiveCoupon(c)"
              >
                {{ receivingId === c.id ? '领取中' : '立即领取' }}
              </view>
              <view v-else class="coupon-received-btn">已领取</view>
            </view>
          </view>
        </view>
      </scroll-view>
    </van-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMerchantDetail, getMerchantMenu, getMerchantReviews, addFavorite, removeFavorite, isFavorite, getMerchantCoupons, receiveCoupon } from '@/api'
import type { MerchantVO, DishCategoryVO, ReviewVO, CouponVO } from '@/types/api'
import FloatingCart from '@/components/FloatingCart/FloatingCart.vue'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import { Popup as VanPopup } from 'vant'
import 'vant/es/popup/style'
import { useCartStore } from '@/store/cart'
import { useUserStore } from '@/store/user'
import { merchantVoToCard, menuCategoriesToCard } from '@/utils/dataTransform'

const detail = ref<Partial<MerchantVO>>({})
const categories = ref<DishCategoryVO[]>([])
const reviews = ref<ReviewVO[]>([])
const ratingTags = ref(['味道赞', '分量足', '包装精美', '送货快', '态度好', '性价比高', '食材新鲜', '干净卫生'])
const tabs = ref(['点餐', '评价', '商家'])
const activeTab = ref(0)
const contentHeight = ref(600)
const cartStore = useCartStore()
const userStore = useUserStore()
const merchantId = ref<string | number>('')
const isFavorited = ref(false)
const showCouponPopup = ref(false)
const couponList = ref<CouponVO[]>([])
const couponLoading = ref(false)
const receivingId = ref<number | string | null>(null)
/** 当前用餐类型: 2=外卖, 3=自取 */
const diningType = ref(2)

const card = computed(() => merchantVoToCard(detail.value as MerchantVO))
const menuSections = computed(() => menuCategoriesToCard(categories.value, cartStore.qtyMap))

const cartItemMap = computed(() => {
  const map: Record<string, { id: number; quantity: number }> = {}
  cartStore.items.forEach((item) => {
    map[`${item.dishId}-${item.specId || ''}`] = { id: item.id, quantity: item.quantity }
  })
  return map
})

onLoad((q: any) => {
  const id = q?.id || ''
  merchantId.value = id
  if (q?.diningType) diningType.value = Number(q.diningType)
  loadData(id)
  if (userStore.isLoggedIn) {
    checkFavoriteStatus(id)
  }
  uni.getSystemInfo({
    success: (res: any) => {
      contentHeight.value = res.windowHeight - 220
    },
  })
})

onMounted(() => {
  cartStore.fetchCart()
})

watch(activeTab, (idx) => {
  if (idx === 1 && merchantId.value && !reviews.value.length) {
    loadReviews(merchantId.value)
  }
})

async function checkFavoriteStatus(id: string | number) {
  try {
    isFavorited.value = await isFavorite(id as any)
  } catch (e) {
    isFavorited.value = false
  }
}

async function toggleFavorite() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    if (isFavorited.value) {
      await removeFavorite(merchantId.value as any)
      isFavorited.value = false
      uni.showToast({ title: '已取消关注', icon: 'none' })
    } else {
      await addFavorite(merchantId.value as any)
      isFavorited.value = true
      uni.showToast({ title: '关注成功', icon: 'success' })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

async function loadData(id: string | number) {
  try {
    const [m, menu] = await Promise.all([
      getMerchantDetail(id as any),
      getMerchantMenu(id as any),
    ])
    detail.value = m || {}
    categories.value = menu || []
  } catch (e) {
    console.error('加载商家详情失败', e)
    setTimeout(() => { uni.navigateBack() }, 1500)
  }
}

async function loadReviews(id: number) {
  try {
    const res = await getMerchantReviews(id, { current: 1, size: 10 })
    reviews.value = res?.list || []
  } catch (e) {
    console.error('加载评价失败', e)
    reviews.value = []
  }
}

function onInc(d: any) {
  const merchantId = detail.value.id
  if (!merchantId) return
  // 多商家购物车：支持同时加购多个商家的商品
  // ID保持字符串传递，避免雪花ID精度丢失
  addDish(String(merchantId), d)
}

async function addDish(merchantId: string | number, d: any) {
  await cartStore.addItem({ 
    merchantId: String(merchantId), 
    dishId: String(d.id), 
    specId: d.specId ? String(d.specId) : null, 
    quantity: 1 
  })
  uni.showToast({ title: '已加入购物车', icon: 'success' })
}

function onDec(d: any) {
  if (d.qty <= 0) return
  const key = `${d.id}-${d.specId || ''}`
  const cartItem = cartItemMap.value[key]
  if (!cartItem) return
  const quantity = cartItem.quantity - 1
  if (quantity <= 0) {
    cartStore.remove(cartItem.id)
  } else {
    cartStore.changeQty(cartItem.id, quantity)
  }
}

function goDish(id: string | number) {
  uni.navigateTo({ url: `/pages/dish/detail?id=${id}` })
}
function goCart() {
  uni.navigateTo({ url: '/pages/cart/index' })
}

// ==================== 优惠券 ====================
async function openCouponPopup() {
  if (!merchantId.value) return
  showCouponPopup.value = true
  await loadMerchantCoupons()
}

async function loadMerchantCoupons() {
  couponLoading.value = true
  try {
    const list = await getMerchantCoupons(merchantId.value)
    couponList.value = list || []
  } catch (e) {
    console.error('加载商家优惠券失败', e)
    couponList.value = []
  } finally {
    couponLoading.value = false
  }
}

async function onReceiveCoupon(coupon: CouponVO) {
  if (!coupon.canReceive || receivingId.value !== null) return
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  receivingId.value = coupon.id
  try {
    await receiveCoupon(coupon.id as number)
    uni.showToast({ title: '领取成功', icon: 'success' })
    // 刷新列表
    await loadMerchantCoupons()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '领取失败', icon: 'none' })
  } finally {
    receivingId.value = null
  }
}

function formatCouponValue(c: CouponVO): string {
  if (c.type === 1 && c.amount) {
    // 满减券
    return `¥${c.amount}`
  }
  if (c.type === 2 && c.discount) {
    // 折扣券
    return `${c.discount}折`
  }
  return c.typeDesc || ''
}

function formatCouponCondition(c: CouponVO): string {
  const threshold = c.threshold ?? c.minPoint
  if (c.type === 1 && threshold && threshold > 0) {
    return `满${threshold}可用`
  }
  if (c.type === 2 && c.maxDiscount) {
    return `最多减¥${c.maxDiscount}`
  }
  return '无门槛'
}

function formatCouponExpire(c: CouponVO): string {
  if (c.validStart && c.validEnd) {
    const start = c.validStart.slice(0, 10)
    const end = c.validEnd.slice(0, 10)
    return `${start} 至 ${end}`
  }
  if (c.validDays) {
    return `领取后${c.validDays}天内有效`
  }
  return ''
}

/** 格式化评价时间 */
function formatCommentTime(time: string): string {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return time.slice(0, 10)
}

/** 预览评价图片 */
function previewImage(current: string, urls: string[]) {
  uni.previewImage({
    current,
    urls: urls.filter(Boolean),
  })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.page {
  min-height: 100vh;
  background: $bg;
  position: relative;
  padding-bottom: 80px;
  padding-top: var(--window-top);
}

.merchant-header {
  background: #fff;
  padding: 12px 16px 12px;
}

.merchant-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.merchant-logo-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
}

.merchant-logo {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  flex-shrink: 0;
}

.merchant-detail {
  flex: 1;
  min-width: 0;
}

.merchant-name-row {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.merchant-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: $text-muted;
  position: relative;
}

.merchant-rating .star {
  color: $primary;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.fav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: $radius-md;
  background: rgba(255, 107, 53, 0.08);
  margin-left: 8px;
  flex-shrink: 0;
  transition: all 0.2s;
  color: $text-light;

  &--active {
    background: rgba(255, 75, 51, 0.12);
    color: #FF4B33;
  }
}

.fav-text {
  font-size: 10px;
  color: $primary;
  margin-top: 2px;
  font-weight: 500;
}

.merchant-promo-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.tag-primary {
  background: rgba(255, 107, 53, 0.1);
  color: $primary;
}

.tag-success {
  background: rgba(76, 175, 80, 0.1);
  color: $success;
}

.filter-tabs {
  background: #fff;
  display: flex;
  padding: 0 16px;
  border-bottom: 1px solid $border;
  border-top: 8px solid $bg;
}

.filter-tab {
  padding: 12px 0;
  margin-right: 20px;
  font-size: 14px;
  color: $text-light;
  position: relative;
}

.filter-tab.active {
  color: $primary;
  font-weight: 600;
}

.filter-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: $primary;
  border-radius: 2px;
}

.menu-content,
.tab-content {
  background: $bg;
}

.menu-section {
  background: #fff;
  margin-top: 8px;
  padding: 12px 16px;
}

.menu-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.menu-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid $border;
  position: relative;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item-img-wrap {
  width: 84px;
  height: 84px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.menu-item-img {
  width: 84px;
  height: 84px;
  border-radius: 8px;
  flex-shrink: 0;
}

.menu-item-info {
  flex: 1;
  min-width: 0;
}

.menu-item-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.menu-item-desc {
  font-size: 12px;
  color: $text-muted;
  margin-bottom: 6px;
  line-height: 1.4;
}

.menu-item-stats {
  font-size: 11px;
  color: $text-muted;
  margin-bottom: 6px;
}

.menu-item-stats .star {
  color: $primary;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.menu-item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-item-price {
  color: $primary;
  font-size: 16px;
  font-weight: 700;
}

.menu-item-price .old {
  color: #999;
  font-size: 11px;
  text-decoration: line-through;
  margin-left: 4px;
  font-weight: 400;
}

.qty-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qty-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.qty-btn.minus {
  border: 1px solid $primary;
  background: #fff;
  color: $primary;
}

.qty-btn.plus {
  background: $primary;
  color: #fff;
}

.qty-num {
  min-width: 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}

.add-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: $primary;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.rating-summary {
  background: #fff;
  margin-top: 8px;
  padding: 16px;
  display: flex;
  gap: 16px;
}

.rating-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.rating-score .score {
  font-size: 32px;
  font-weight: 800;
  color: $primary;
}

.rating-score .score-label {
  font-size: 11px;
  color: $text-muted;
}

.rating-tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: center;
}

.rating-tag {
  padding: 4px 10px;
  background: rgba(255, 107, 53, 0.1);
  color: $primary;
  border-radius: 12px;
  font-size: 11px;
}

.comment-list {
  background: #fff;
  margin-top: 8px;
  padding: 0 16px;
}

.comment-item {
  padding: 14px 0;
  border-bottom: 1px solid $border;
}

.comment-user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  overflow: hidden;

  .avatar-img {
    width: 100%;
    height: 100%;
  }
}

.user-name {
  font-size: 13px;
  color: $text-light;
}

.comment-time {
  font-size: 11px;
  color: $text-muted;
  margin-left: auto;
}

.comment-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comment-content .star {
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.comment-dishes {
  font-size: 12px;
  color: $text-muted;
}

.comment-text {
  font-size: 13px;
  color: $text;
  line-height: 1.5;
}

.comment-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.comment-img {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  background: #f5f5f5;
}

.merchant-reply {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.reply-label {
  color: $primary;
  font-weight: 500;
}

.reply-text {
  color: $text-light;
}

.comment-empty {
  background: #fff;
  margin-top: 8px;
  padding: 48px 16px;
  text-align: center;
  font-size: 13px;
  color: $text-muted;
}

.notice-card,
.info-card {
  background: #fff;
  margin: 8px 16px 0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: $shadow;
}

.notice-title,
.info-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}

.notice-text {
  font-size: 13px;
  color: $text-light;
  line-height: 1.6;
}

.info-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: $text-light;
  border-bottom: 1px solid $border;
}

.info-line:last-child {
  border-bottom: none;
}

/* ==================== 领券按钮 ==================== */
.coupon-entry-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border: 1px solid $primary;
  border-radius: 10px;
  font-size: 11px;
  color: $primary;
  font-weight: 600;
  flex-shrink: 0;
  background: rgba(255, 107, 53, 0.06);
}

.coupon-icon {
  font-size: 12px;
}
</style>

<style lang="scss">
/* 优惠券弹窗内容样式（非scoped，因为van-popup teleport到body） */
.merchant-coupon-popup {
  .coupon-popup-header {
    padding: 16px;
    text-align: center;
    border-bottom: 1px solid #ebedf0;
  }

  .coupon-popup-title {
    font-size: 16px;
    font-weight: 700;
    color: #333;
  }

  .coupon-scroll {
    max-height: 60vh;
  }

  .coupon-loading,
  .coupon-empty {
    padding: 48px 16px;
    text-align: center;
    font-size: 13px;
    color: #999;
  }

  .coupon-list {
    padding: 12px 16px;
  }

  .coupon-card {
    display: flex;
    align-items: stretch;
    background: #fff;
    border-radius: 8px;
    margin-bottom: 10px;
    overflow: hidden;
    border: 1px solid rgba(255, 107, 53, 0.2);
    position: relative;
  }

  .coupon-card--disabled {
    border-color: #e0e0e0;
    opacity: 0.7;
  }

  .coupon-card-left {
    width: 90px;
    background: linear-gradient(135deg, #ff6b35 0%, #ff4b33 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 8px;
    flex-shrink: 0;
    position: relative;
  }

  .coupon-card--disabled .coupon-card-left {
    background: linear-gradient(135deg, #bbb 0%, #999 100%);
  }

  .coupon-card-left::after {
    content: '';
    position: absolute;
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
  }

  .coupon-value {
    font-size: 22px;
    font-weight: 800;
    color: #fff;
  }

  .coupon-condition {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 2px;
  }

  .coupon-card-body {
    flex: 1;
    padding: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    min-width: 0;
  }

  .coupon-name {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .coupon-card--disabled .coupon-name {
    color: #999;
  }

  .coupon-expire {
    font-size: 11px;
    color: #999;
  }

  .coupon-card-right {
    display: flex;
    align-items: center;
    padding: 0 12px;
    flex-shrink: 0;
  }

  .coupon-receive-btn {
    padding: 5px 12px;
    background: linear-gradient(135deg, #ff6b35 0%, #ff4b33 100%);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    border-radius: 14px;
    white-space: nowrap;
  }

  .coupon-receive-btn--loading {
    opacity: 0.6;
  }

  .coupon-received-btn {
    padding: 5px 12px;
    background: #f0f0f0;
    color: #999;
    font-size: 12px;
    border-radius: 14px;
    white-space: nowrap;
  }
}
</style>
