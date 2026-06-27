<template>
  <view class="search-page">
    <!-- 顶部搜索栏 -->
    <view class="search-header">
      <view class="back-btn" @tap="goBack">
        <view class="back-arrow" />
      </view>
      <view class="search-input-wrap">
        <CategoryIcon name="search" :size="18" class="search-icon" />
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          focus
          placeholder="请输入商家或商品名称"
          placeholder-class="placeholder"
          confirm-type="search"
          @input="onInput"
          @confirm="onSearch"
        />
        <view v-if="keyword" class="input-clear" @tap="keyword = ''">
          <CategoryIcon name="close" :size="14" />
        </view>
      </view>
      <view class="header-action" @tap="onSearch">搜索</view>
    </view>

    <!-- 实时联想 -->
    <view v-if="suggestions.length" class="suggest-list">
      <view
        v-for="s in suggestions"
        :key="s"
        class="suggest-item"
        @tap="fillAndSearch(s)"
      >
        <CategoryIcon name="search" :size="14" class="suggest-icon" />
        <text class="suggest-text">{{ s }}</text>
      </view>
    </view>
    <!-- 搜索结果区域 -->
    <view v-if="keyword.trim()" class="result-area">
      <view class="result-tip">
        <text>点击搜索查看“{{ keyword }}”相关结果</text>
      </view>
    </view>

    <!-- 默认内容区 -->
    <view v-else class="default-content">
      <!-- 历史搜索 -->
      <view class="section">
        <view class="section-title">
          <CategoryIcon name="history" :size="16" class="title-icon" />
          <text>历史搜索</text>
          <view v-if="history.length" class="section-action" @tap="clearHistory">
            <CategoryIcon name="close" :size="12" class="action-icon" />
            <text>清空</text>
          </view>
        </view>
        <view v-if="history.length" class="tags">
          <view
            v-for="h in history"
            :key="h"
            class="tag history-tag"
            @tap="fillAndSearch(h)"
          >
            {{ h }}
          </view>
        </view>
        <view v-else class="empty-tip">暂无搜索历史</view>
      </view>

      <!-- 猜你想搜 -->
      <view class="section">
        <view class="section-title">
          <CategoryIcon name="fire" :size="16" class="title-icon" />
          <text>猜你想搜</text>
        </view>
        <view v-if="hotTags.length" class="tags">
          <view
            v-for="t in hotTags"
            :key="t"
            class="tag hot-tag"
            @tap="fillAndSearch(t)"
          >
            {{ t }}
          </view>
        </view>
        <view v-else class="empty-tip">暂无推荐</view>
      </view>

      <!-- 趋势播报 -->
      <view v-if="trendList.length" class="section trend-section">
        <view class="section-title">
          <text class="trend-title">趋势播报</text>
        </view>
        <view class="trend-list">
          <view
            v-for="(item, index) in trendList"
            :key="item.id"
            class="trend-item"
            @tap="fillAndSearch(item.title)"
          >
            <view class="trend-rank" :class="{ 'rank-top': index < 3 }">
              {{ index + 1 }}
            </view>
            <view class="trend-thumb" :style="{ background: item.color }" />
            <view class="trend-body">
              <view class="trend-name">{{ item.title }}</view>
              <view class="trend-meta">
                <text class="trend-heat">{{ item.heat }}万热度</text>
                <text v-if="index < 3" class="trend-tag hot-tag-text">热</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

const keyword = ref('')
const history = ref<string[]>([])
const suggestions = ref<string[]>([])
let suggestTimer: ReturnType<typeof setTimeout> | null = null

const guessPool = ref<string[]>([])
const hotTags = computed(() => guessPool.value.slice(0, 8))

const trendList = ref<Array<{ id: number; title: string; heat: number; color: string }>>([])

onShow(() => {
  history.value = uni.getStorageSync('wzz_search_history') || []
})

function onSearch() {
  const kw = keyword.value.trim()
  if (!kw) return
  const list = history.value.filter(h => h !== kw)
  list.unshift(kw)
  history.value = list.slice(0, 10)
  uni.setStorageSync('wzz_search_history', history.value)
  uni.navigateTo({ url: `/pages/search/result?keyword=${encodeURIComponent(kw)}` })
}

function fillAndSearch(text: string) {
  keyword.value = text
  onSearch()
}

function clearHistory() {
  uni.showModal({
    title: '提示',
    content: '确定清空搜索历史？',
    success: (r) => {
      if (r.confirm) {
        history.value = []
        uni.removeStorageSync('wzz_search_history')
      }
    }
  })
}

function goBack() {
  uni.navigateBack()
}

function onInput() {
  if (suggestTimer) clearTimeout(suggestTimer)
  const kw = keyword.value.trim()
  if (!kw) {
    suggestions.value = []
    return
  }
  suggestTimer = setTimeout(() => {
    // 从历史记录中匹配联想词
    suggestions.value = history.value
      .filter(s => s.includes(kw) || kw.includes(s))
      .slice(0, 8)
  }, 300)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.search-page {
  min-height: 100vh;
  background: $bg;
  font-family: $font-family;
  padding-bottom: 24px;
}

/* 顶部搜索栏 */
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

/* 默认内容区 */
.default-content {
  padding: 0 16px;
}

.section {
  margin-top: 18px;
  background: $card;
  border-radius: $radius-lg;
  padding: 16px;
  box-shadow: $shadow;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: $text;
  margin-bottom: 12px;
}

.title-icon {
  color: $primary;
}

.section-action {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: $text-muted;
  font-weight: 400;
}

.action-icon {
  color: $text-muted;
}

.refresh-icon {
  transition: transform 0.3s ease;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  padding: 7px 14px;
  border-radius: 16px;
  font-size: 13px;
  background: $bg;
  color: $text;
}

.history-tag {
  color: $text-light;
}

.hot-tag {
  color: $text;
}

.empty-tip {
  font-size: 13px;
  color: $text-muted;
  padding: 6px 0;
}

/* 趋势播报 */
.trend-section {
  padding-bottom: 10px;
}

.trend-title {
  font-size: 15px;
  font-weight: 700;
  color: $text;
}

.trend-list {
  display: flex;
  flex-wrap: wrap;
}

.trend-item {
  width: 50%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.trend-rank {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  color: $text-light;
  background: #f0f0f0;
}

.rank-top {
  background: $secondary;
  color: #fff;
}

.trend-thumb {
  width: 40px;
  height: 40px;
  border-radius: $radius-md;
  flex-shrink: 0;
}

.trend-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-name {
  font-size: 13px;
  color: $text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.trend-heat {
  font-size: 11px;
  color: $text-muted;
}

.trend-tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba($secondary, 0.12);
  color: $secondary;
}

/* 搜索结果 */
.result-area {
  padding: 0 16px;
}

.result-tip {
  margin-top: 16px;
  padding: 32px 16px;
  text-align: center;
  font-size: 14px;
  color: $text-light;
  background: $card;
  border-radius: $radius-lg;
  box-shadow: $shadow;
}
</style>
