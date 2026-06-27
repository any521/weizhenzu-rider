<template>
  <view class="favorites-page">
    <!-- 顶部标题栏 -->
    <view class="navbar">
      <view class="back-btn" @tap="goBack">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </view>
      <text class="navbar-title">我的收藏</text>
      <view class="navbar-right" />
    </view>

    <view v-if="loading" class="loading-wrap">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="!list.length" class="empty-wrap">
      <AppEmpty icon="favorite" title="暂无收藏商家" subtitle="去发现更多美食吧" btn-text="去逛逛" @action="goHome" />
    </view>

    <view v-else class="favorites-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="favorite-card"
        @tap="goMerchant(item.id)"
      >
        <view class="merchant-logo-wrap">
          <SmartImage
            v-if="item.imageUrl"
            :src="item.imageUrl"
            :bg="item.bg"
            icon="shop"
            :iconSize="24"
            radius="8px"
            mode="aspectFill"
          />
          <view v-else class="merchant-logo" :style="{ background: item.bg }">
            <text class="logo-text">{{ item.logo }}</text>
          </view>
        </view>
        <view class="merchant-body">
          <view class="merchant-name">{{ item.name }}</view>
          <view class="merchant-meta">
            <text class="meta-score">{{ item.rating }} 分</text>
            <text class="meta-sale">月售 {{ item.monthlySales }}+</text>
            <text class="meta-time">{{ item.deliveryTime }}</text>
          </view>
          <view class="merchant-fees">
            <text>起送 ¥{{ item.minOrder }}</text>
            <text>配送 ¥{{ item.deliveryFee }}</text>
          </view>
        </view>
        <view class="merchant-actions">
          <view class="action-like" :class="{ liked: item.liked }" @tap.stop="toggleLike(item)">
            <CategoryIcon :name="item.liked ? 'favorite-filled' : 'favorite'" :size="22" />
          </view>
          <view class="action-btn" @tap.stop="goMerchant(item.id)">去下单</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import SmartImage from '@/components/SmartImage/SmartImage.vue'
import AppEmpty from '@/components/AppEmpty/AppEmpty.vue'
import { getFavorites, addFavorite, removeFavorite } from '@/api'
import type { MerchantCardVO } from '@/types/api'

interface FavoriteItem extends MerchantCardVO {
  liked: boolean
}

const list = ref<FavoriteItem[]>([])
const loading = ref(false)

onMounted(() => {
  loadFavorites()
})

async function loadFavorites() {
  loading.value = true
  try {
    const page = await getFavorites({ current: 1, size: 50 })
    list.value = (page.list || []).map((item) => ({ ...item, liked: true }))
  } catch (e) {
    console.error('加载收藏失败', e)
  } finally {
    loading.value = false
  }
}

async function toggleLike(item: FavoriteItem) {
  try {
    if (item.liked) {
      await removeFavorite(item.id)
      uni.showToast({ title: '已取消收藏', icon: 'none' })
      list.value = list.value.filter((i) => i.id !== item.id)
    } else {
      await addFavorite(item.id)
      item.liked = true
      uni.showToast({ title: '已收藏', icon: 'success' })
    }
  } catch (e) {
    console.error('收藏操作失败', e)
  }
}

function goBack() {
  uni.navigateBack()
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goMerchant(id: number | string) {
  uni.navigateTo({ url: `/pages/merchant/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.favorites-page {
  min-height: 100vh;
  background: $bg;
  padding-top: calc(var(--status-bar-height, 20px) + 44px);
}

.navbar {
  height: calc(var(--status-bar-height, 20px) + 44px);
  padding-top: var(--status-bar-height, 20px);
  background: $card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text;
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 700;
  color: $text;
}

.navbar-right {
  width: 44px;
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

.empty-wrap {
  padding-top: 60px;
}

.favorites-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.favorite-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: $card;
  border-radius: $radius-lg;
  padding: 14px;
  box-shadow: $shadow;
}

.merchant-logo-wrap {
  width: 64px;
  height: 64px;
  border-radius: $radius-md;
  flex-shrink: 0;
  overflow: hidden;
}

.merchant-logo {
  width: 64px;
  height: 64px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  font-size: 28px;
}

.merchant-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.merchant-name {
  font-size: 15px;
  font-weight: 600;
  color: $text;
}

.merchant-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-score {
  font-size: 14px;
  font-weight: 700;
  color: $secondary;
}

.meta-sale,
.meta-time,
.merchant-fees {
  font-size: 12px;
  color: $text-muted;
}

.merchant-fees {
  display: flex;
  gap: 10px;
}

.merchant-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.action-like {
  color: $text-muted;
}

.action-like.liked {
  color: $danger;
}

.action-btn {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 14px;
}
</style>
