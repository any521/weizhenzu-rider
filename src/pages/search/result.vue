<template>
  <view class="search-result-page">
    <!-- 顶部搜索栏 -->
    <view class="search-header" :style="{ paddingTop: `calc(var(--status-bar-height, 20px) + 10px)` }">
      <view class="back-btn" @tap="goBack">
        <view class="back-arrow" />
      </view>
      <view class="search-input-wrap">
        <CategoryIcon name="search" :size="18" class="search-icon" />
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          :focus="focus"
          placeholder="请输入商家或商品名称"
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

    <!-- 筛选条 -->
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
      <view class="sort-bar">
        <view
          v-for="s in sorts"
          :key="s.value"
          :class="['sort-item', sort === s.value && 'sort-active']"
          @tap="onSort(s.value)"
        >
          {{ s.label }}
        </view>
      </view>
    </view>

    <!-- 结果列表 -->
    <scroll-view scroll-y class="result-scroll" :style="{ height: scrollHeight + 'px' }">
      <view v-if="loading" class="loading-wrap">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="resultList.length" class="result-list">
        <view
          v-for="item in resultList"
          :key="item.id"
          class="merchant-card"
          @tap="goMerchant(item.id)"
        >
          <view class="merchant-img-wrap">
            <SmartImage
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :bg="item.bg"
              icon="shop"
              :iconSize="30"
              radius="8px"
              mode="aspectFill"
            />
            <view v-else class="merchant-img" :style="{ background: item.bg }">
              <text class="logo-text">{{ item.logo }}</text>
            </view>
          </view>
          <view class="merchant-info">
            <view class="merchant-name">{{ item.name }}</view>
            <view class="merchant-row">
              <text class="merchant-score">{{ item.rating }} 分</text>
              <text class="merchant-sale">月售 {{ item.monthlySales }}+</text>
              <text class="merchant-time">{{ item.deliveryTime }}</text>
            </view>
            <view class="merchant-row">
              <text class="merchant-fee">起送 ¥{{ item.minOrder }}</text>
              <text class="merchant-fee">配送 ¥{{ item.deliveryFee }}</text>
            </view>
            <view v-if="item.tags?.length" class="merchant-tags">
              <text v-for="(tag, idx) in item.tags" :key="idx" class="merchant-tag">{{ tag.text }}</text>
            </view>
          </view>
          <view class="fav-btn" :class="{ 'fav-active': favoriteIds.has(String(item.id)) }" @tap.stop="toggleFavorite(item)">
            <CategoryIcon :name="favoriteIds.has(String(item.id)) ? 'favorite-filled' : 'favorite'" :size="20" />
          </view>
        </view>
      </view>

      <view v-else class="empty-wrap">
        <AppEmpty icon="ticket-empty" title="暂无相关结果" :subtitle="`未找到与“${keyword}”相关的商家`" />
      </view>

      <view style="height: 20px;"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import AppEmpty from '@/components/AppEmpty/AppEmpty.vue'
import { getMerchantPage, getMerchantCategories, addFavorite, removeFavorite, getFavorites } from '@/api'
import { useUserStore } from '@/store/user'
import type { MerchantCardVO, MerchantCategoryVO } from '@/types/api'

const userStore = useUserStore()
const keyword = ref('')
const focus = ref(false)
const loading = ref(false)
const activeCategory = ref<number | string | 0>(0)
const sort = ref('default')
const scrollHeight = ref(600)
const categories = ref<MerchantCategoryVO[]>([{ id: 0, name: '全部' }])
const resultList = ref<MerchantCardVO[]>([])
const favoriteIds = ref<Set<string>>(new Set())

const sorts = [
  { label: '综合', value: 'default' },
  { label: '销量', value: 'sales' },
  { label: '评分', value: 'rating' },
  { label: '距离', value: 'distance' },
]

onLoad((q: any) => {
  keyword.value = q?.keyword ? decodeURIComponent(q.keyword) : ''
  if (q?.categoryId) {
    activeCategory.value = q.categoryId
  }
  if (keyword.value || activeCategory.value) onSearch()
})

onMounted(() => {
  loadCategories()
  loadFavorites()
  uni.getSystemInfo({
    success: (res: any) => {
      const statusBar = res.statusBarHeight || 20
      // header(statusBar+50) + filterBar(约88px)
      scrollHeight.value = res.windowHeight - statusBar - 50 - 88
    },
  })
})

onShow(() => {
  loadFavorites()
})

async function loadCategories() {
  try {
    const list = await getMerchantCategories()
    categories.value = [{ id: 0, name: '全部' }, ...(list || [])]
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

async function loadFavorites() {
  if (!userStore.isLoggedIn) {
    favoriteIds.value = new Set()
    return
  }
  try {
    const page = await getFavorites({ current: 1, size: 100 })
    const ids = new Set<string>()
    ;(page.list || []).forEach((m) => ids.add(String(m.id)))
    favoriteIds.value = ids
  } catch (e) {
    console.error('加载收藏状态失败', e)
  }
}

async function toggleFavorite(item: MerchantCardVO) {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  const id = String(item.id)
  const isFav = favoriteIds.value.has(id)
  try {
    if (isFav) {
      await removeFavorite(item.id)
      favoriteIds.value.delete(id)
      favoriteIds.value = new Set(favoriteIds.value)
      uni.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      await addFavorite(item.id)
      favoriteIds.value.add(id)
      favoriteIds.value = new Set(favoriteIds.value)
      uni.showToast({ title: '已收藏', icon: 'success' })
    }
  } catch (e) {
    console.error('收藏操作失败', e)
  }
}

watch(keyword, () => {
  if (!keyword.value.trim() && !activeCategory.value) resultList.value = []
})

async function onSearch() {
  const kw = keyword.value.trim()
  if (!kw && !activeCategory.value) {
    resultList.value = []
    return
  }
  loading.value = true
  try {
    const params: Record<string, any> = { current: 1, size: 20 }
    if (kw) params.keyword = kw
    if (activeCategory.value) params.categoryId = activeCategory.value
    if (sort.value !== 'default') params.sortBy = sort.value
    const page = await getMerchantPage(params)
    resultList.value = page.list || []
    saveHistory(kw)
  } catch (e) {
    console.error('搜索商家失败', e)
  } finally {
    loading.value = false
  }
}

function onCategory(id: number) {
  activeCategory.value = id
  onSearch()
}

function onSort(value: string) {
  sort.value = value
  onSearch()
}

function saveHistory(kw: string) {
  if (!kw) return
  const list: string[] = uni.getStorageSync('wzz_search_history') || []
  const filtered = list.filter((h) => h !== kw)
  filtered.unshift(kw)
  uni.setStorageSync('wzz_search_history', filtered.slice(0, 10))
}

function goBack() {
  uni.navigateBack()
}

function goMerchant(id: number | string) {
  uni.navigateTo({ url: `/pages/merchant/detail?id=${id}` })
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

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  width: 10px;
  height: 10px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(45deg);
  margin-left: 6px;
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
  padding: 10px 16px;
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

.sort-bar {
  display: flex;
  justify-content: space-around;
  padding: 10px 16px;
  border-top: 1px solid $border;
}

.sort-item {
  font-size: 13px;
  color: $text-light;
  position: relative;
}

.sort-item.sort-active {
  color: $primary;
  font-weight: 700;
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
  gap: 12px;
}

.merchant-card {
  display: flex;
  gap: 12px;
  background: $card;
  border-radius: $radius-lg;
  padding: 14px;
  box-shadow: $shadow;
  position: relative;
}

.fav-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  opacity: 0.5;
  transition: all 0.2s;
}

.fav-btn.fav-active {
  color: $danger;
  opacity: 1;
}

.merchant-img-wrap {
  width: 84px;
  height: 84px;
  border-radius: $radius-md;
  flex-shrink: 0;
  overflow: hidden;
}

.merchant-img {
  width: 84px;
  height: 84px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
}

.merchant-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-right: 32px;
}

.merchant-name {
  font-size: 15px;
  font-weight: 600;
  color: $text;
}

.merchant-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.merchant-score {
  font-size: 14px;
  font-weight: 700;
  color: $secondary;
}

.merchant-sale,
.merchant-time,
.merchant-fee {
  font-size: 12px;
  color: $text-muted;
}

.merchant-tags {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.merchant-tag {
  font-size: 10px;
  color: $primary;
  background: rgba($primary, 0.1);
  padding: 2px 6px;
  border-radius: 8px;
}

.empty-wrap {
  padding-top: 60px;
}
</style>
