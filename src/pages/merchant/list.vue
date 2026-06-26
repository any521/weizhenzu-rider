<template>
  <view class="page">
    <!-- 筛选 chips -->
    <view class="filter-row">
      <text
        v-for="(chip, idx) in chips"
        :key="idx"
        :class="['filter-chip', activeChip === idx && 'active']"
        @tap="onChip(idx)"
      >{{ chip.label }}</text>
      <text class="filter-more">筛选 ▾</text>
    </view>

    <scroll-view
      scroll-y
      class="merchant-list"
      :style="{ height: contentHeight + 'px' }"
      @scrolltolower="loadMore"
    >
      <view v-if="loading" class="loading-wrap">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="!list.length" class="empty-wrap">
        <AppEmpty icon="ticket-empty" title="暂无商家" subtitle="换个条件试试吧" />
      </view>

      <view v-else class="list-body">
        <view
          v-for="m in list"
          :key="m.id"
          class="merchant-card"
          @tap="goDetail(m.id)"
        >
          <view class="merchant-img-wrap">
            <SmartImage
              v-if="m.imageUrl"
              :src="m.imageUrl"
              :bg="m.bg"
              icon="shop"
              :iconSize="28"
              radius="8px"
              mode="aspectFill"
            />
            <view v-else class="merchant-img" :style="{ background: m.bg }">
              <text class="logo-text">{{ m.logo }}</text>
            </view>
          </view>
          <view class="merchant-info">
            <view class="merchant-name-row">
              <text>{{ m.name }}</text>
              <CategoryIcon v-if="m.top" name="star" :size="10" class="top-star" />
            </view>
            <view class="merchant-meta">
              <text class="meta-score">
                <CategoryIcon name="star" :size="9" /> {{ m.rating }}
              </text>
              <text>月售 {{ m.monthlySales > 999 ? '1000+' : m.monthlySales }}</text>
              <text class="meta-right">{{ m.deliveryTime }} · {{ m.distance || '' }}</text>
            </view>
            <view class="merchant-fees">
              <text>起送 ¥{{ m.minOrder }}</text>
              <text>配送约¥{{ m.deliveryFee }}</text>
            </view>
            <view v-if="m.tags?.length" class="merchant-tags">
              <text
                v-for="(tag, idx) in m.tags"
                :key="idx"
                :class="['tag', `tag-${tag.type}`]"
              >{{ tag.text }}</text>
            </view>
            <view v-if="m.promo" class="merchant-promo">{{ m.promo }}</view>
          </view>
          <view class="fav-btn" :class="{ 'fav-active': favoriteIds.has(String(m.id)) }" @tap.stop="toggleFavorite(m)">
            <CategoryIcon :name="favoriteIds.has(String(m.id)) ? 'favorite-filled' : 'favorite'" :size="20" />
          </view>
        </view>
      </view>

      <view style="height: 20px;"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMerchantPage, addFavorite, removeFavorite, getFavorites } from '@/api'
import { useUserStore } from '@/store/user'
import type { MerchantCardVO } from '@/types/api'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import AppEmpty from '@/components/AppEmpty/AppEmpty.vue'

const userStore = useUserStore()
const chips = [
  { label: '综合排序', value: '' },
  { label: '销量优先', value: 'sales' },
  { label: '距离最近', value: 'distance' },
  { label: '评分最高', value: 'rating' },
]
const activeChip = ref(0)
const list = ref<MerchantCardVO[]>([])
const loading = ref(false)
const contentHeight = ref(600)
const categoryId = ref<number | string | undefined>()
const keyword = ref('')
const favoriteIds = ref<Set<string>>(new Set())

onLoad((q: any) => {
  categoryId.value = q?.categoryId ? q.categoryId : undefined
  keyword.value = q?.keyword ? decodeURIComponent(q.keyword) : ''
  uni.setNavigationBarTitle({
    title: q?.name || (keyword.value ? '搜索结果' : '商家列表'),
  })
  uni.getSystemInfo({
    success: (res: any) => {
      contentHeight.value = res.windowHeight - 50
    },
  })
  load()
  loadFavorites()
})

onShow(() => {
  loadFavorites()
})

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { current: 1, size: 20 }
    if (categoryId.value) params.categoryId = categoryId.value
    if (keyword.value) params.keyword = keyword.value
    const page = await getMerchantPage(params)
    list.value = page.list
  } catch (e) {
    console.error('加载商家列表失败', e)
  } finally {
    loading.value = false
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

async function toggleFavorite(m: MerchantCardVO) {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  const id = String(m.id)
  const isFav = favoriteIds.value.has(id)
  try {
    if (isFav) {
      await removeFavorite(m.id)
      favoriteIds.value.delete(id)
      favoriteIds.value = new Set(favoriteIds.value)
      uni.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      await addFavorite(m.id)
      favoriteIds.value.add(id)
      favoriteIds.value = new Set(favoriteIds.value)
      uni.showToast({ title: '已收藏', icon: 'success' })
    }
  } catch (e) {
    console.error('收藏操作失败', e)
  }
}

function onChip(idx: number) {
  activeChip.value = idx
  load()
}

function loadMore() {
  // 当前先做一次性加载，后续可扩展分页
}

function goDetail(id: number | string) {
  uni.navigateTo({ url: `/pages/merchant/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.page {
  min-height: 100vh;
  background: $bg;
}

.filter-row {
  background: #fff;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid $border;
}

.filter-chip {
  padding: 4px 12px;
  background: $bg;
  border-radius: 12px;
  font-size: 12px;
  color: $text-light;
}

.filter-chip.active {
  background: rgba(255, 107, 53, 0.1);
  color: $primary;
}

.filter-more {
  margin-left: auto;
  font-size: 12px;
  color: $text-muted;
}

.merchant-list {
  background: $bg;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba($primary, 0.25);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 8px;
  font-size: 12px;
  color: $text-muted;
}

.empty-wrap {
  padding-top: 60px;
}

.list-body {
  padding: 0 16px;
}

.merchant-card {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid $border;
  position: relative;
}

.merchant-card:last-child {
  border-bottom: none;
}

.fav-btn {
  position: absolute;
  top: 14px;
  right: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  opacity: 0.6;
  transition: all 0.2s;
}

.fav-btn.fav-active {
  color: $danger;
  opacity: 1;
}

.merchant-img-wrap {
  width: 76px;
  height: 76px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.merchant-img {
  width: 76px;
  height: 76px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.logo-text {
  color: #fff;
  font-size: 28px;
  font-weight: 700;
}

.merchant-info {
  flex: 1;
  min-width: 0;
  padding-right: 36px;
}

.merchant-name-row {
  font-size: 15px;
  font-weight: 700;
  color: $text;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.top-star {
  color: $primary;
}

.merchant-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: $text-muted;
  margin-bottom: 4px;
}

.meta-score {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: $secondary;
  font-weight: 700;
}

.meta-right {
  margin-left: auto;
}

.merchant-fees {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: $text-muted;
  margin-bottom: 6px;
}

.merchant-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.tag {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.tag-primary {
  background: rgba(255, 75, 51, 0.08);
  color: $secondary;
}

.tag-success {
  background: rgba(0, 200, 83, 0.08);
  color: $success;
}

.tag-warning {
  background: rgba(255, 152, 0, 0.08);
  color: $warning;
}

.merchant-promo {
  font-size: 11px;
  color: $secondary;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
