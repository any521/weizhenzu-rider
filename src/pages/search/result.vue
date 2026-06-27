<template>
  <view class="search-result-page">
    <!-- 顶部搜索栏 -->
    <view class="search-header" :style="{ paddingTop: `calc(var(--status-bar-height, 20px) + 10px)` }">
      <view class="search-input-wrap">
        <CategoryIcon name="search" :size="18" class="search-icon" />
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          :focus="focus"
          placeholder="请输入菜品名称"
          placeholder-class="placeholder"
          confirm-type="search"
          @confirm="onSearch"
        />
        <view v-if="keyword" class="input-clear" @tap="keyword = ''">
          <CategoryIcon name="close" :size="14" />
        </view>
      </view>
      <view class="header-action" @tap="onSearch">搜索</view>
    </view>

    <!-- 分类筛选条 -->
    <view class="filter-bar">
      <scroll-view class="category-scroll" scroll-x show-scrollbar="false">
        <view class="category-scroll-inner">
          <view
            v-for="c in categories"
            :key="c.id"
            :class="['category-pill', activeCategory === c.id && 'active']"
            @tap="onCategory(c.id)"
          >
            {{ c.name }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 结果列表 -->
    <scroll-view
      scroll-y
      class="result-scroll"
      :style="{ height: scrollHeight + 'px' }"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view v-if="loading && !refreshing && !loadingMore" class="loading-wrap">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="resultList.length" class="result-list">
        <view
          v-for="item in resultList"
          :key="item.id"
          class="dish-card"
          @tap="goDishDetail(item.id)"
        >
          <view class="dish-img-wrap">
            <SmartImage
              v-if="item.image || item.images?.[0]"
              :src="item.image || item.images?.[0]"
              bg="linear-gradient(135deg, #FF6B35, #FFC107)"
              icon="meishi"
              :iconSize="28"
              radius="10px"
              mode="aspectFill"
            />
            <view v-else class="dish-img-placeholder">
              <CategoryIcon name="meishi" :size="32" color="#fff" />
            </view>
          </view>
          <view class="dish-info">
            <view class="dish-name-row">
              <text class="dish-name">{{ item.name }}</text>
            </view>
            <text v-if="item.description" class="dish-desc">{{ item.description }}</text>
            <text class="dish-merchant">
              <CategoryIcon name="shop" :size="10" class="merchant-icon" />
              {{ item.merchantName || '未知商家' }}
            </text>
            <view v-if="item.tags?.length" class="dish-tags">
              <text v-for="(tag, idx) in item.tags.slice(0, 3)" :key="idx" class="dish-tag">{{ tag }}</text>
            </view>
            <view class="dish-bottom">
              <view class="dish-meta">
                <text v-if="item.rating" class="dish-score">
                  <CategoryIcon name="star" :size="10" />
                  {{ item.rating }}分
                </text>
                <text class="dish-sales">月售{{ formatSales(item.monthSales || 0) }}</text>
              </view>
              <view class="dish-price-row">
                <text class="dish-price">
                  <text class="price-symbol">¥</text>{{ item.price }}
                </text>
                <text v-if="item.originalPrice && item.originalPrice > item.price" class="dish-original-price">
                  ¥{{ item.originalPrice }}
                </text>
                <view class="add-cart-btn" @tap.stop="onAddCart(item)">
                  <CategoryIcon name="cart" :size="16" color="#fff" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-wrap">
        <AppEmpty icon="ticket-empty" title="暂无菜品" :subtitle="keyword ? `未找到与「${keyword}」相关的菜品` : '该分类下暂无菜品'" />
      </view>

      <!-- 加载更多状态 -->
      <view v-if="loadingMore" class="load-more-wrap">
        <view class="loading-spinner small"></view>
        <text class="load-more-text">加载中...</text>
      </view>
      <view v-else-if="noMore && resultList.length" class="load-more-wrap">
        <text class="no-more-text">没有更多了</text>
      </view>

      <view style="height: 20px;"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import AppEmpty from '@/components/AppEmpty/AppEmpty.vue'
import { getDishPage, getMerchantCategories } from '@/api'
import { useCartStore } from '@/store/cart'
import type { DishVO, MerchantCategoryVO } from '@/types/api'

const cartStore = useCartStore()
const keyword = ref('')
const focus = ref(false)
const loading = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const activeCategory = ref<number | string | 0>(0)
const scrollHeight = ref(600)
const categories = ref<MerchantCategoryVO[]>([{ id: 0, name: '全部' }])
const resultList = ref<DishVO[]>([])
const currentPage = ref(1)
const pageSize = 10

onLoad((q: any) => {
  keyword.value = q?.keyword ? decodeURIComponent(q.keyword) : ''
  if (q?.categoryId) {
    activeCategory.value = q.categoryId
  }
  if (keyword.value || activeCategory.value) onSearch()
})

onMounted(() => {
  loadCategories()
  uni.getSystemInfo({
    success: (res: any) => {
      const statusBar = res.statusBarHeight || 20
      // header(statusBar+64: 含statusBar+10px padding-top + 40px输入框 + 14px padding-bottom) + filterBar(约50px)
      scrollHeight.value = res.windowHeight - statusBar - 64 - 50
    },
  })
})

async function loadCategories() {
  try {
    const list = await getMerchantCategories()
    categories.value = [{ id: 0, name: '全部' }, ...(list || [])]
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

function formatSales(sales: number): string {
  if (sales >= 1000) return (sales / 1000).toFixed(1) + 'k+'
  if (sales >= 100) return '100+'
  return String(sales)
}

async function fetchPage(page: number, isRefresh = false): Promise<{ list: DishVO[]; total: number }> {
  const kw = keyword.value.trim()
  const params: Record<string, any> = {
    current: page,
    size: pageSize,
  }
  if (kw) params.keyword = kw
  if (activeCategory.value) params.platformCategoryId = activeCategory.value
  return await getDishPage(params)
}

async function onSearch() {
  const kw = keyword.value.trim()
  if (!kw && !activeCategory.value) {
    resultList.value = []
    noMore.value = false
    return
  }
  loading.value = true
  currentPage.value = 1
  noMore.value = false
  try {
    const page = await fetchPage(1)
    resultList.value = page.list || []
    if (resultList.value.length < pageSize) {
      noMore.value = true
    }
    saveHistory(kw)
  } catch (e) {
    console.error('搜索菜品失败', e)
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  currentPage.value = 1
  noMore.value = false
  try {
    const page = await fetchPage(1, true)
    resultList.value = page.list || []
    if (resultList.value.length < pageSize) {
      noMore.value = true
    }
  } catch (e) {
    console.error('刷新失败', e)
  } finally {
    refreshing.value = false
  }
}

async function onLoadMore() {
  if (loadingMore.value || noMore.value || loading.value) return
  if (resultList.value.length === 0) return
  loadingMore.value = true
  try {
    const nextPage = currentPage.value + 1
    const page = await fetchPage(nextPage)
    const list = page.list || []
    if (list.length === 0) {
      noMore.value = true
    } else {
      resultList.value = [...resultList.value, ...list]
      currentPage.value = nextPage
      if (list.length < pageSize) {
        noMore.value = true
      }
    }
  } catch (e) {
    console.error('加载更多失败', e)
  } finally {
    loadingMore.value = false
  }
}

function onCategory(id: number | string) {
  activeCategory.value = id
  onSearch()
}

function saveHistory(kw: string) {
  if (!kw) return
  const list: string[] = uni.getStorageSync('wzz_search_history') || []
  const filtered = list.filter((h) => h !== kw)
  filtered.unshift(kw)
  uni.setStorageSync('wzz_search_history', filtered.slice(0, 10))
}

function goDishDetail(id: number | string) {
  uni.navigateTo({ url: `/pages/dish/detail?id=${id}` })
}

async function onAddCart(item: DishVO) {
  try {
    // ID保持字符串传递，避免雪花ID精度丢失，后端StringToLongDeserializer支持字符串转Long
    await cartStore.addItem({
      merchantId: String(item.merchantId),
      dishId: String(item.id),
      quantity: 1,
    })
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (e) {
    console.error('加入购物车失败', e)
    uni.showToast({ title: '加入购物车失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.search-result-page {
  min-height: 100vh;
  background: $bg;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 14px;
  padding-top: calc(var(--status-bar-height, 20px) + 10px);
  background: linear-gradient(180deg, $header-start 0%, $primary 100%);
  position: sticky;
  top: 0;
  z-index: 50;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  height: 40px;
  background: #fff;
  border-radius: 20px;
  padding: 0 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.search-icon {
  color: $text-muted;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: $text;
}

.placeholder {
  color: $text-muted;
  font-size: 14px;
}

.input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: $text-muted;
  color: #fff;
  margin-left: 8px;
}

.header-action {
  font-size: 15px;
  color: #fff;
  font-weight: 500;
  padding: 0 4px;
}

.filter-bar {
  background: #fff;
  border-bottom: 1px solid $border;
}

.category-scroll {
  white-space: nowrap;
}

.category-scroll-inner {
  display: inline-flex;
  gap: 10px;
  padding: 12px 16px;
}

.category-pill {
  display: inline-block;
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  color: $text-light;
  background: $bg;
}

.category-pill.active {
  background: $primary;
  color: #fff;
  font-weight: 600;
}

.result-scroll {
  background: $bg;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba($primary, 0.25);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  &.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
  }
}

.loading-text {
  margin-top: 12px;
  font-size: 13px;
  color: $text-muted;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.result-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 菜品卡片 */
.dish-card {
  display: flex;
  gap: 12px;
  background: $card;
  border-radius: $radius-lg;
  padding: 12px;
  box-shadow: $shadow;
}

.dish-img-wrap {
  width: 96px;
  height: 96px;
  border-radius: $radius-md;
  flex-shrink: 0;
  overflow: hidden;
}

.dish-img-placeholder {
  width: 96px;
  height: 96px;
  border-radius: $radius-md;
  background: linear-gradient(135deg, #FF6B35, #FFC107);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dish-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dish-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dish-name {
  font-size: 15px;
  font-weight: 600;
  color: $text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dish-desc {
  font-size: 12px;
  color: $text-muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dish-merchant {
  font-size: 11px;
  color: $text-light;
  display: flex;
  align-items: center;
  gap: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.merchant-icon {
  flex-shrink: 0;
}

.dish-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dish-tag {
  font-size: 10px;
  color: $primary;
  background: rgba($primary, 0.1);
  padding: 1px 6px;
  border-radius: 8px;
}

.dish-bottom {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.dish-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: $text-muted;
}

.dish-score {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: $secondary;
  font-weight: 600;
}

.dish-sales {
  color: $text-muted;
}

.dish-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dish-price {
  font-size: 18px;
  font-weight: 800;
  color: $secondary;
}

.price-symbol {
  font-size: 12px;
}

.dish-original-price {
  font-size: 11px;
  color: $text-muted;
  text-decoration: line-through;
}

.add-cart-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  box-shadow: 0 2px 6px rgba($primary, 0.35);
  flex-shrink: 0;
}

.load-more-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 0;
}

.load-more-text {
  font-size: 12px;
  color: $text-muted;
}

.no-more-text {
  font-size: 12px;
  color: $text-light;
}

.empty-wrap {
  padding-top: 60px;
}
</style>
