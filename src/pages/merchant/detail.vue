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
            <text>起送 ¥{{ card.minOrder }}</text>
            <text>配送 ¥{{ card.deliveryFee }}</text>
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
            <view class="user-avatar"><CategoryIcon name="user" :size="14" /></view>
            <text class="user-name">{{ r.nickname || '匿名用户' }}</text>
          </view>
          <view class="comment-content">
            <view class="star"><CategoryIcon v-for="n in 5" :key="n" name="star" :size="10" /></view>
            <text class="comment-text">{{ r.content || '用户未留下评价' }}</text>
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
        <view class="info-line"><text>配送时间</text><text>{{ card.deliveryTime }}</text></view>
        <view class="info-line"><text>起送价</text><text>¥{{ card.minOrder }}</text></view>
        <view class="info-line"><text>配送费</text><text>¥{{ card.deliveryFee }}</text></view>
        <view class="info-line"><text>商家地址</text><text>{{ detail.address || '' }}</text></view>
      </view>
      <view style="height: 80px;"></view>
    </scroll-view>

    <FloatingCart :count="cartStore.totalCount" @tap="goCart" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMerchantDetail, getMerchantMenu, getMerchantReviews, addFavorite, removeFavorite, isFavorite } from '@/api'
import type { MerchantVO, DishCategoryVO, ReviewVO } from '@/types/api'
import FloatingCart from '@/components/FloatingCart/FloatingCart.vue'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
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

  if (cartStore.merchantId && cartStore.merchantId !== merchantId) {
    uni.showModal({
      title: '提示',
      content: '购物车已有其他商家商品，是否清空并加入当前商家？',
      success: (res) => {
        if (res.confirm) {
          cartStore.clear().then(() => addDish(merchantId, d))
        }
      },
    })
    return
  }
  addDish(merchantId, d)
}

async function addDish(merchantId: number, d: any) {
  await cartStore.addItem({ merchantId, dishId: d.id, specId: d.specId, quantity: 1 })
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
  uni.switchTab({ url: '/pages/cart/index' })
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
}

.user-name {
  font-size: 13px;
  color: $text-light;
}

.comment-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.comment-content .star {
  color: $primary;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.comment-text {
  font-size: 13px;
  color: $text;
  line-height: 1.5;
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
</style>
