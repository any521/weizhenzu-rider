<template>
  <view class="detail-page">
    <!-- 顶部导航栏 -->
    <view class="detail-navbar">
      <view class="nav-back" @tap="goBack">
        <view class="back-arrow" />
      </view>
      <text class="nav-title">菜品详情</text>
      <view class="nav-fav" @tap="toggleDishFavorite">
        <CategoryIcon :name="isDishFavorited ? 'heart-filled' : 'heart-empty'" :size="22" :color="isDishFavorited ? '#FF4B33' : '#fff'" />
      </view>
    </view>

    <view class="detail-hero">
      <view class="detail-product-img-wrap">
        <SmartImage
          :src="display.imageUrl"
          :bg="display.bg"
          icon="meishi"
          :iconSize="60"
          radius="50%"
          round
          mode="aspectFill"
        />
      </view>
    </view>

    <view class="detail-content">
      <view class="detail-name">{{ display.name }}</view>
      <view class="detail-sales">
        <view class="star"><CategoryIcon name="star" :size="10" /> {{ display.rating }}</view>
        <text> · 月售 {{ display.sales }} · </text>
        <text>好评率 {{ display.goodRate }}%</text>
      </view>
      <view class="detail-price-row">
        <view class="detail-price">
          ¥{{ display.price }}
          <text v-if="display.originalPrice" class="old">¥{{ display.originalPrice }}</text>
        </view>
        <text v-for="(tag, idx) in display.tags" :key="idx" :class="['detail-tag', tag.type === 'success' && 'success']">{{ tag.text }}</text>
      </view>

      <view v-if="specList.length" class="detail-section">
        <view class="detail-section-title">选择规格</view>
        <view class="detail-spec-row">
          <text
            v-for="(spec, idx) in specList"
            :key="idx"
            :class="['detail-spec-item', activeSpec === idx && 'active']"
            @tap="activeSpec = idx"
          >{{ spec.name }}</text>
        </view>
      </view>

      <view v-if="flavorList.length" class="detail-section">
        <view class="detail-section-title">口味选择</view>
        <view class="detail-spec-row">
          <text
            v-for="(flavor, idx) in flavorList"
            :key="idx"
            :class="['detail-spec-item', activeFlavor === idx && 'active']"
            @tap="activeFlavor = idx"
          >{{ flavor }}</text>
        </view>
      </view>

      <view class="detail-section">
        <view class="detail-section-title">商品描述</view>
        <view class="detail-desc">{{ display.description || '暂无描述' }}</view>
      </view>

      <view class="detail-section">
        <view class="detail-section-title">购买数量</view>
        <view class="detail-qty-row">
          <text class="stock-text">库存充足</text>
          <view class="detail-qty">
            <text class="detail-qty-btn" @tap="onDec">−</text>
            <text class="detail-qty-num">{{ qty }}</text>
            <text class="detail-qty-btn" @tap="onInc">+</text>
          </view>
        </view>
      </view>
      <view style="height: 100px;"></view>
    </view>

    <view class="detail-bottom">
      <button class="add-cart-btn" @tap="addCart">加入购物车 ¥{{ totalPrice }}</button>
      <button class="buy-btn" @tap="buyNow">立即购买</button>
    </view>

    <FloatingCart :count="cartStore.totalCount" @tap="goCart" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getDishDetail } from '@/api'
import type { DishVO, DishSpecVO } from '@/types/api'
import FloatingCart from '@/components/FloatingCart/FloatingCart.vue'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import { useCartStore } from '@/store/cart'
import { dishVoToCard } from '@/utils/dataTransform'

const dish = ref<Partial<DishVO>>({})
const activeSpec = ref(0)
const activeFlavor = ref(0)
const qty = ref(1)
const cartStore = useCartStore()
const currentDishId = ref<string | number>('')
const DISH_FAV_KEY = 'wzz_dish_favorites'

// 菜品收藏状态（本地存储）
const isDishFavorited = ref(false)

function loadDishFavStatus() {
  try {
    const favs: string[] = uni.getStorageSync(DISH_FAV_KEY) || []
    isDishFavorited.value = favs.includes(String(currentDishId.value))
  } catch (e) {
    isDishFavorited.value = false
  }
}

function toggleDishFavorite() {
  try {
    let favs: string[] = uni.getStorageSync(DISH_FAV_KEY) || []
    const id = String(currentDishId.value)
    if (favs.includes(id)) {
      favs = favs.filter(f => f !== id)
      isDishFavorited.value = false
      uni.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      favs.unshift(id)
      if (favs.length > 100) favs = favs.slice(0, 100)
      isDishFavorited.value = true
      uni.showToast({ title: '收藏成功', icon: 'success' })
    }
    uni.setStorageSync(DISH_FAV_KEY, favs)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function goBack() {
  uni.navigateBack()
}

const display = computed(() => {
  const card = dishVoToCard(dish.value as DishVO)
  return {
    name: card.name,
    bg: card.bg,
    imageUrl: card.imageUrl,
    rating: card.rating.toFixed(1),
    sales: card.sales,
    goodRate: 98,
    price: card.price,
    originalPrice: card.originalPrice,
    tags: card.tags,
    description: dish.value.description || '',
  }
})

const specList = computed<DishSpecVO[]>(() => dish.value.specs?.length ? dish.value.specs : [])
const flavorList = computed<string[]>(() => {
  const tags = dish.value.tags || []
  return tags.length ? tags.slice(0, 4) : []
})

const selectedSpecId = computed(() => {
  if (!specList.value.length) return undefined
  return specList.value[activeSpec.value]?.id
})

const totalPrice = computed(() => {
  const base = Number(dish.value.price || 0)
  const diff = selectedSpecId.value
    ? (specList.value.find((s) => s.id === selectedSpecId.value)?.priceDiff || 0)
    : 0
  return ((base + diff) * qty.value).toFixed(2)
})

onLoad((q: any) => {
  const id = q?.id
  if (id) {
    currentDishId.value = id
    loadData(id)
    loadDishFavStatus()
  }
})

onMounted(() => {
  cartStore.fetchCart()
})

async function loadData(id: string | number) {
  try {
    dish.value = await getDishDetail(id as any)
  } catch (e) {
    console.error('加载菜品详情失败', e)
    uni.showToast({ title: '加载菜品详情失败', icon: 'none' })
  }
}

function onInc() {
  qty.value++
}
function onDec() {
  if (qty.value > 1) qty.value--
}
async function addCart() {
  const merchantId = dish.value.merchantId
  const dishId = dish.value.id
  if (!merchantId || !dishId) {
    uni.showToast({ title: '商品信息不完整', icon: 'none' })
    return
  }
  await cartStore.addItem({
    merchantId,
    dishId,
    specId: selectedSpecId.value,
    quantity: qty.value,
  })
  uni.showToast({ title: '已加入购物车', icon: 'success' })
}
function buyNow() {
  const merchantId = dish.value.merchantId
  const dishId = dish.value.id
  if (!merchantId || !dishId) {
    uni.showToast({ title: '商品信息不完整', icon: 'none' })
    return
  }
  // 如果有规格，必须选择规格
  if (specList.value.length > 0 && selectedSpecId.value == null) {
    uni.showToast({ title: '请选择规格', icon: 'none' })
    return
  }
  const specId = selectedSpecId.value || ''
  const quantity = qty.value
  const url = `/pages/order/checkout?buyNow=1&merchantId=${merchantId}&dishId=${dishId}&specId=${specId}&quantity=${quantity}&diningType=${cartStore.diningType}`
  uni.navigateTo({ url })
}
function goCart() {
  uni.navigateTo({ url: '/pages/cart/index' })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.detail-page {
  min-height: 100vh;
  background: $secondary;
  position: relative;
}

.detail-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: calc(var(--status-bar-height, 20px) + 44px);
  padding-top: var(--status-bar-height, 20px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
  backdrop-filter: blur(10px);
}

.nav-back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  width: 10px;
  height: 10px;
  border-left: 2px solid #333;
  border-bottom: 2px solid #333;
  transform: rotate(45deg);
  margin-left: 6px;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.nav-fav {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-hero {
  background: $secondary;
  padding: calc(var(--status-bar-height, 20px) + 60px) 16px 24px;
  text-align: center;
}

.detail-product-img-wrap {
  width: 200px;
  height: 200px;
  margin: 16px auto 0;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.detail-product-img {
  width: 200px;
  height: 200px;
  margin: 16px auto 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.detail-content {
  background: #fff;
  border-radius: 24px 24px 0 0;
  margin-top: -16px;
  padding: 24px 16px 0;
  min-height: 60vh;
}

.detail-name {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.detail-sales {
  font-size: 12px;
  color: $text-muted;
  margin-bottom: 16px;
}

.detail-sales .star {
  color: $primary;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.detail-price-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.detail-price {
  color: $primary;
  font-size: 28px;
  font-weight: 800;
}

.detail-price .old {
  color: #999;
  font-size: 14px;
  text-decoration: line-through;
  margin-left: 4px;
  font-weight: 400;
}

.detail-tag {
  background: rgba(255, 107, 53, 0.1);
  color: $primary;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.detail-tag.success {
  background: rgba(76, 175, 80, 0.1);
  color: $success;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.detail-spec-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-spec-item {
  padding: 6px 14px;
  border: 1px solid $border;
  border-radius: 16px;
  font-size: 13px;
  color: $text-light;
}

.detail-spec-item.active {
  background: rgba(255, 107, 53, 0.1);
  color: $primary;
  border-color: $primary;
  font-weight: 600;
}

.detail-desc {
  font-size: 13px;
  color: $text-light;
  line-height: 1.6;
  padding: 12px 14px;
  background: $bg;
  border-radius: 10px;
}

.detail-qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.stock-text {
  font-size: 12px;
  color: $text-muted;
}

.detail-qty {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-qty-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid $primary;
  background: #fff;
  color: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.detail-qty-num {
  font-size: 16px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.detail-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: #fff;
  border-top: 1px solid $border;
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
  z-index: 50;
}

.add-cart-btn {
  flex: 1;
  height: 44px;
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 700;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.buy-btn {
  flex: 1;
  height: 44px;
  background: linear-gradient(135deg, $primary-light, #FFB74D);
  color: #fff;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 700;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
