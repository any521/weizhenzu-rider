<template>
  <view class="service-page">
    <!-- 顶部标题栏 -->
    <view class="navbar" :style="{ paddingTop: 'var(--status-bar-height, 20px)', height: `calc(var(--status-bar-height, 20px) + 44px)` }">
      <view class="back-btn" @tap="goBack">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </view>
      <text class="navbar-title">客服中心</text>
      <view class="navbar-right" />
    </view>

    <!-- 客服入口 -->
    <view class="service-entries">
      <view v-for="entry in entries" :key="entry.title" class="entry-card" @tap="entry.onTap">
        <view class="entry-icon" :style="{ background: entry.bg }">
          <CategoryIcon :name="entry.icon" :size="28" />
        </view>
        <view class="entry-body">
          <text class="entry-title">{{ entry.title }}</text>
          <text class="entry-desc">{{ entry.desc }}</text>
        </view>
        <text class="entry-arrow">›</text>
      </view>
    </view>

    <!-- 常见问题 -->
    <view class="faq-section">
      <view class="section-title">常见问题</view>
      <view v-if="faqs.length" class="faq-list">
        <view
          v-for="(faq, idx) in faqs"
          :key="idx"
          class="faq-item"
          @tap="toggleFaq(idx)"
        >
          <view class="faq-question">
            <text class="faq-q">Q</text>
            <text class="faq-text">{{ faq.q }}</text>
            <text class="faq-toggle">{{ activeFaq === idx ? '−' : '+' }}</text>
          </view>
          <view v-if="activeFaq === idx" class="faq-answer">
            {{ faq.a }}
          </view>
        </view>
      </view>
      <view v-else class="faq-empty">暂无常见问题</view>
    </view>

    <!-- 在线客服 -->
    <view class="online-bar">
      <view class="online-info">
        <CategoryIcon name="service" :size="24" />
        <text>在线客服 9:00-22:00</text>
      </view>
      <view class="online-btn" @tap="contactOnline">立即咨询</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

const entries = [
  { icon: 'order', title: '订单问题', desc: '催单、取消、配送异常', bg: 'rgba(255, 75, 51, 0.12)', onTap: () => uni.navigateTo({ url: '/pages/order/list' }) },
  { icon: 'refund', title: '退款售后', desc: '退款进度、售后申请', bg: 'rgba(255, 152, 0, 0.12)', onTap: () => uni.navigateTo({ url: '/pages/order/list' }) },
  { icon: 'coupon-card', title: '优惠券', desc: '券的使用与领取', bg: 'rgba(255, 195, 0, 0.12)', onTap: () => uni.switchTab({ url: '/pages/coupon/index' }) },
  { icon: 'address', title: '地址问题', desc: '修改地址、定位异常', bg: 'rgba(33, 150, 243, 0.12)', onTap: () => uni.navigateTo({ url: '/pages/address/list' }) }
]

const faqs = ref<Array<{ q: string; a: string }>>([])
const activeFaq = ref<number | null>(null)

function toggleFaq(idx: number) {
  activeFaq.value = activeFaq.value === idx ? null : idx
}

function contactOnline() {
  uni.showToast({ title: '正在连接在线客服...', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.service-page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 80px;
}

.navbar {
  background: $card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
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

.service-entries {
  padding: 12px 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.entry-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: $card;
  border-radius: $radius-lg;
  padding: 14px;
  box-shadow: $shadow;
}

.entry-icon {
  width: 44px;
  height: 44px;
  border-radius: $radius-round;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $primary-dark;
  flex-shrink: 0;
}

.entry-body {
  flex: 1;
  min-width: 0;
}

.entry-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: $text;
}

.entry-desc {
  display: block;
  font-size: 11px;
  color: $text-muted;
  margin-top: 3px;
}

.entry-arrow {
  font-size: 18px;
  color: $text-muted;
}

.faq-section {
  margin: 0 16px;
  background: $card;
  border-radius: $radius-lg;
  padding: 16px;
  box-shadow: $shadow;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: $text;
  margin-bottom: 12px;
}

.faq-item {
  border-bottom: 1px solid $border;
  padding: 12px 0;
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-question {
  display: flex;
  align-items: center;
  gap: 8px;
}

.faq-q {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: $primary;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.faq-text {
  flex: 1;
  font-size: 14px;
  color: $text;
}

.faq-toggle {
  font-size: 18px;
  color: $text-muted;
}

.faq-answer {
  margin-top: 8px;
  padding: 10px 12px;
  background: $bg;
  border-radius: $radius-md;
  font-size: 13px;
  color: $text-light;
  line-height: 1.6;
}

.faq-empty {
  text-align: center;
  font-size: 13px;
  color: $text-muted;
  padding: 20px 0;
}

.online-bar {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  height: 54px;
  background: $card;
  border-radius: 27px;
  box-shadow: $shadow-md;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 20px;
}

.online-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: $text;
  font-size: 14px;
  font-weight: 500;
}

.online-btn {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 18px;
}
</style>
