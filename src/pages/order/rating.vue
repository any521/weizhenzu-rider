<template>
  <view class="rating-page">
    <!-- 商家信息 -->
    <view class="merchant-card" v-if="merchant">
      <view class="merchant-logo" :style="{ background: merchant.bg }">
        <text class="logo-text">{{ merchant.logo }}</text>
      </view>
      <view class="merchant-name">{{ merchant.name }}</view>
    </view>

    <!-- 星级评分 -->
    <view class="rating-card">
      <text class="rating-title">给本次服务打个分</text>
      <view class="stars">
        <view
          v-for="i in 5"
          :key="i"
          class="star-item"
          @tap="rating = i"
        >
          <CategoryIcon name="star" :size="36" :class="['star-icon', i <= rating && 'active']" />
        </view>
      </view>
      <text class="rating-text">{{ ratingText }}</text>
    </view>

    <!-- 评价标签 -->
    <view class="tags-card">
      <view
        v-for="tag in tags"
        :key="tag"
        :class="['tag-item', selectedTags.includes(tag) && 'active']"
        @tap="toggleTag(tag)"
      >
        {{ tag }}
      </view>
    </view>

    <!-- 评价内容 -->
    <view class="content-card">
      <textarea
        v-model="content"
        class="content-input"
        placeholder="说说哪里好，帮更多小伙伴选择"
        maxlength="200"
      />
      <text class="content-count">{{ content.length }}/200</text>
    </view>

    <!-- 图片上传 -->
    <view class="upload-card">
      <text class="upload-title">上传图片（最多3张）</text>
      <view class="upload-list">
        <view v-for="(img, idx) in images" :key="idx" class="upload-item">
          <image :src="img" mode="aspectFill" class="upload-img" />
          <view class="upload-delete" @tap="removeImage(idx)">×</view>
        </view>
        <view v-if="images.length < 3" class="upload-add" @tap="chooseImage">
          <text class="add-icon">+</text>
          <text class="add-text">添加图片</text>
        </view>
      </view>
    </view>

    <!-- 匿名 -->
    <view class="anonymous-row" @tap="anonymous = !anonymous">
      <view :class="['checkbox', anonymous && 'checked']">
        <CategoryIcon v-if="anonymous" name="check" :size="12" />
      </view>
      <text>匿名评价</text>
    </view>

    <!-- 提交 -->
    <view class="submit-btn" @tap="onSubmit">提交评价</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import { createReview, getMerchantDetail } from '@/api'
import type { MerchantCardVO, MerchantVO } from '@/types/api'
import { merchantVoToCard } from '@/utils/dataTransform'

const rating = ref(5)
const content = ref('')
const anonymous = ref(false)
const selectedTags = ref<string[]>([])
const images = ref<string[]>([])
const tags = ref<string[]>(['味道赞', '分量足', '包装精美', '送货快', '态度好'])
const merchant = ref<MerchantCardVO | null>(null)
const orderId = ref<string | number>('')
const merchantId = ref<number | string | undefined>(undefined)
const submitting = ref(false)

const ratingText = computed(() => {
  const map = ['', '非常差', '差', '一般', '满意', '非常满意']
  return map[rating.value]
})

onLoad((q: any) => {
  if (q?.id) orderId.value = q.id
  if (q?.merchantId) {
    merchantId.value = q.merchantId
    fetchMerchant(merchantId.value)
  }
})

async function fetchMerchant(id: number | string) {
  try {
    const res = await getMerchantDetail(id)
    merchant.value = merchantVoToCard(res as MerchantVO)
  } catch (e: any) {
    merchant.value = null
  }
}

function toggleTag(tag: string) {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter(t => t !== tag)
  } else {
    selectedTags.value.push(tag)
  }
}

function chooseImage() {
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      images.value.push(...res.tempFilePaths)
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败，请重试', icon: 'none' })
    }
  })
}

function removeImage(idx: number) {
  images.value.splice(idx, 1)
}

async function onSubmit() {
  if (!rating.value) {
    return uni.showToast({ title: '请选择评分', icon: 'none' })
  }
  if (!orderId.value) {
    return uni.showToast({ title: '订单信息缺失', icon: 'none' })
  }

  submitting.value = true
  uni.showLoading({ title: '提交中...' })
  try {
    await createReview({
      orderId: orderId.value,
      rating: rating.value,
      tasteScore: rating.value,
      packingScore: rating.value,
      deliveryScore: rating.value,
      content: content.value,
      images: images.value,
      tags: selectedTags.value,
      anonymous: anonymous.value ? 1 : 0
    })
    uni.hideLoading()
    uni.showToast({ title: '评价成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.rating-page {
  min-height: 100vh;
  background: $bg;
  padding: 12px 16px 40px;
}

.merchant-card {
  background: $card;
  border-radius: $radius-lg;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  box-shadow: $shadow;
}

.merchant-logo {
  width: 48px;
  height: 48px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 24px;
}

.merchant-name {
  font-size: 16px;
  font-weight: 700;
  color: $text;
}

.rating-card {
  background: $card;
  border-radius: $radius-lg;
  padding: 20px 16px;
  text-align: center;
  margin-bottom: 12px;
  box-shadow: $shadow;
}

.rating-title {
  font-size: 15px;
  color: $text;
  font-weight: 600;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 16px 0;
}

.star-item {
  color: #e0e0e0;
}

.star-icon {
  color: #e0e0e0;
  transition: color 0.2s;
}

.star-icon.active {
  color: $secondary;
}

.rating-text {
  font-size: 13px;
  color: $text-muted;
}

.tags-card {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: $card;
  border-radius: $radius-lg;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: $shadow;
}

.tag-item {
  padding: 7px 14px;
  border-radius: 16px;
  font-size: 13px;
  background: $bg;
  color: $text-light;
}

.tag-item.active {
  background: rgba($primary, 0.1);
  color: $primary;
  font-weight: 600;
}

.content-card {
  background: $card;
  border-radius: $radius-lg;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: $shadow;
}

.content-input {
  width: 100%;
  height: 100px;
  font-size: 14px;
  color: $text;
}

.content-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: $text-muted;
  margin-top: 8px;
}

.upload-card {
  background: $card;
  border-radius: $radius-lg;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: $shadow;
}

.upload-title {
  font-size: 14px;
  color: $text;
  font-weight: 600;
  margin-bottom: 12px;
  display: block;
}

.upload-list {
  display: flex;
  gap: 10px;
}

.upload-item,
.upload-add {
  width: 80px;
  height: 80px;
  border-radius: $radius-md;
  overflow: hidden;
  position: relative;
}

.upload-img {
  width: 100%;
  height: 100%;
}

.upload-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: $bg;
  border: 1px dashed $border;
}

.add-icon {
  font-size: 24px;
  color: $text-muted;
  line-height: 1;
}

.add-text {
  font-size: 11px;
  color: $text-muted;
  margin-top: 4px;
}

.anonymous-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: $text;
  margin-bottom: 24px;
}

.checkbox {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid $text-muted;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background: $primary;
  border-color: $primary;
}

.submit-btn {
  height: 50px;
  line-height: 50px;
  text-align: center;
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.3);
}
</style>
