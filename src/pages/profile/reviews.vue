<template>
  <view class="reviews-page">
    <view class="page-header">
      <view class="back-btn" @tap="goBack">
        <view class="back-arrow" />
      </view>
      <text class="page-title">我的评价</text>
      <view class="header-placeholder" />
    </view>

    <view v-if="loading && list.length === 0" class="loading-tip">加载中...</view>

    <view v-else-if="list.length === 0" class="empty">
      <view class="empty-icon">📝</view>
      <view class="empty-text">暂无评价</view>
      <view class="empty-sub">完成订单后可以在这里查看您的评价</view>
    </view>

    <view v-else class="review-list">
      <view v-for="r in list" :key="r.id" class="review-card">
        <view class="card-header">
          <view class="merchant-info">
            <view class="merchant-thumb" :style="{ background: r.bg || '#FF6B35' }">
              <text class="merchant-thumb-text">{{ (r.merchantName || '商').charAt(0) }}</text>
            </view>
            <view class="merchant-meta">
              <view class="merchant-name">{{ r.merchantName || '未知商家' }}</view>
              <view class="review-time">{{ formatTime(r.createdAt) }}</view>
            </view>
          </view>
          <view class="rating-badge">
            <text class="rating-num">{{ r.rating }}</text>
            <text class="rating-unit">分</text>
          </view>
        </view>

        <view v-if="r.dishNames && r.dishNames.length" class="dish-tags">
          <text v-for="(d, i) in r.dishNames" :key="i" class="dish-tag">{{ d }}</text>
        </view>

        <view class="review-content">{{ r.content || '用户未填写评价内容' }}</view>

        <view v-if="r.images && r.images.length" class="review-images">
          <image
            v-for="(img, idx) in r.images"
            :key="idx"
            :src="img"
            class="review-img"
            mode="aspectFill"
            @tap="previewImage(r.images, idx)"
          />
        </view>

        <view v-if="r.tags && r.tags.length" class="review-tags">
          <text v-for="(t, i) in r.tags" :key="i" class="review-tag">{{ t }}</text>
        </view>

        <view v-if="r.merchantReply" class="merchant-reply">
          <view class="reply-label">商家回复</view>
          <view class="reply-content">{{ r.merchantReply }}</view>
          <view v-if="r.merchantReplyTime" class="reply-time">{{ formatTime(r.merchantReplyTime) }}</view>
        </view>
      </view>

      <view v-if="hasMore" class="load-more" @tap="loadMore">{{ loadingMore ? '加载中...' : '加载更多' }}</view>
      <view v-else-if="list.length > 0" class="no-more">没有更多评价了</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { getMyReviews } from '@/api'
import type { ReviewVO } from '@/types/api'

const list = ref<ReviewVO[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const current = ref(1)
const size = 10
const total = ref(0)
const hasMore = ref(false)

onShow(() => {
  current.value = 1
  loadList()
})

onReachBottom(() => {
  if (hasMore.value && !loadingMore.value) {
    loadMore()
  }
})

async function loadList() {
  loading.value = true
  try {
    const res = await getMyReviews({ current: current.value, size })
    list.value = res.list || []
    total.value = res.total || 0
    hasMore.value = list.value.length < total.value
  } catch (e) {
    console.error('加载我的评价失败', e)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    current.value++
    const res = await getMyReviews({ current: current.value, size })
    const more = res.list || []
    list.value.push(...more)
    hasMore.value = list.value.length < total.value
  } catch (e) {
    current.value--
  } finally {
    loadingMore.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function formatTime(t?: string | number | Date): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function previewImage(urls: string[], idx: number) {
  uni.previewImage({ urls, current: urls[idx] })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.reviews-page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  padding-top: calc(var(--status-bar-height, 20px) + 10px);
  padding-bottom: 10px;
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

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
}

.header-placeholder {
  width: 32px;
}

.loading-tip {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: $text-muted;
}

.empty {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 16px;
  color: $text;
  font-weight: 600;
  margin-bottom: 6px;
}

.empty-sub {
  font-size: 13px;
  color: $text-muted;
}

.review-list {
  padding: 12px 16px;
}

.review-card {
  background: $card;
  border-radius: $radius-lg;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: $shadow;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.merchant-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.merchant-thumb {
  width: 40px;
  height: 40px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.merchant-thumb-text {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.merchant-meta {
  flex: 1;
  min-width: 0;
}

.merchant-name {
  font-size: 15px;
  font-weight: 600;
  color: $text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-time {
  font-size: 12px;
  color: $text-muted;
  margin-top: 2px;
}

.rating-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba($primary, 0.1);
}

.rating-num {
  font-size: 18px;
  font-weight: 700;
  color: $primary;
}

.rating-unit {
  font-size: 11px;
  color: $primary;
}

.dish-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.dish-tag {
  font-size: 12px;
  color: $text-light;
  background: $bg;
  padding: 3px 8px;
  border-radius: 4px;
}

.review-content {
  font-size: 14px;
  color: $text;
  line-height: 1.6;
  margin-bottom: 10px;
  word-break: break-all;
}

.review-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.review-img {
  width: 80px;
  height: 80px;
  border-radius: $radius-md;
}

.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.review-tag {
  font-size: 12px;
  color: $primary;
  background: rgba($primary, 0.08);
  padding: 3px 8px;
  border-radius: 12px;
}

.merchant-reply {
  background: $bg;
  border-radius: $radius-md;
  padding: 12px;
  border-left: 3px solid $primary;
}

.reply-label {
  font-size: 12px;
  color: $primary;
  font-weight: 600;
  margin-bottom: 6px;
}

.reply-content {
  font-size: 13px;
  color: $text-light;
  line-height: 1.5;
  word-break: break-all;
}

.reply-time {
  font-size: 11px;
  color: $text-muted;
  margin-top: 6px;
}

.load-more {
  text-align: center;
  padding: 16px 0;
  font-size: 13px;
  color: $primary;
}

.no-more {
  text-align: center;
  padding: 16px 0;
  font-size: 12px;
  color: $text-muted;
}
</style>
