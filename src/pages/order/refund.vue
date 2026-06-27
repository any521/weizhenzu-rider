<template>
  <view class="refund">
    <view class="card">
      <view class="section-title">退款原因</view>
      <view class="reason-list">
        <view
          v-for="(r, idx) in reasons"
          :key="idx"
          :class="['reason-item', selectedReason === idx && 'active']"
          @tap="selectedReason = idx"
        >
          <text>{{ r }}</text>
          <view :class="['radio', selectedReason === idx && 'radio-active']"></view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">退款金额</view>
      <view class="amount-input">
        <text class="symbol">¥</text>
        <input v-model="refundAmount" type="digit" placeholder="请输入退款金额" />
      </view>
      <view class="tip">最多可退 ¥{{ maxAmount.toFixed(2) }}</view>
    </view>

    <view class="card">
      <view class="section-title">补充说明</view>
      <textarea v-model="remark" placeholder="请描述退款原因（选填）" />
    </view>

    <view class="card">
      <view class="section-title">上传凭证<text class="sub-title">（最多 3 张）</text></view>
      <view class="image-list">
        <view v-for="(img, idx) in images" :key="idx" class="image-item">
          <image class="upload-img" :src="img" mode="aspectFill" @tap="previewImage(idx)" />
          <view class="img-delete" @tap.stop="deleteImage(idx)">
            <CategoryIcon name="close" :size="10" />
          </view>
        </view>
        <view v-if="images.length < 3" class="image-item upload-btn" @tap="chooseImage">
          <CategoryIcon name="camera" :size="24" />
          <text class="upload-text">{{ images.length }}/3</text>
        </view>
      </view>
    </view>

    <view class="submit-btn" @tap="onSubmit">提交退款申请</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createRefund, uploadImage } from '@/api'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

const reasons = ref(['商家未接单', '配送超时', '商品质量问题', '错送/漏送', '其他原因'])
const selectedReason = ref(0)
const refundAmount = ref('')
const maxAmount = ref(0)
const remark = ref('')
const images = ref<string[]>([])
const orderId = ref<string | number>('')
const submitting = ref(false)

onLoad((q: any) => {
  if (q?.id) orderId.value = q.id
  if (q?.amount) {
    maxAmount.value = Number(q.amount) || 0
    refundAmount.value = maxAmount.value.toFixed(2)
  }
})

function chooseImage() {
  const remain = 3 - images.value.length
  if (remain <= 0) return
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      images.value = [...images.value, ...res.tempFilePaths].slice(0, 3)
    }
  })
}

function previewImage(idx: number) {
  uni.previewImage({
    current: idx,
    urls: images.value
  })
}

function deleteImage(idx: number) {
  images.value.splice(idx, 1)
}

async function onSubmit() {
  if (!refundAmount.value || Number(refundAmount.value) <= 0) {
    return uni.showToast({ title: '请输入退款金额', icon: 'none' })
  }
  if (Number(refundAmount.value) > maxAmount.value) {
    return uni.showToast({ title: '退款金额不能超过订单金额', icon: 'none' })
  }
  if (!orderId.value) {
    return uni.showToast({ title: '订单信息缺失', icon: 'none' })
  }

  const reasonText = reasons.value[selectedReason.value] + (remark.value ? ` - ${remark.value}` : '')
  submitting.value = true
  uni.showLoading({ title: '提交中...' })
  try {
    // 上传图片到服务器，替换本地临时路径
    const uploadedUrls: string[] = []
    for (const img of images.value) {
      if (img.startsWith('http://') || img.startsWith('https://')) {
        uploadedUrls.push(img)
      } else {
        const upRes = await uploadImage(img)
        uploadedUrls.push(upRes.url)
      }
    }
    const res: any = await createRefund({
      orderId: orderId.value,
      reason: reasonText,
      amount: Number(refundAmount.value),
      images: uploadedUrls
    })
    uni.hideLoading()
    uni.showToast({ title: '已提交申请', icon: 'success' })
    const refundId = res?.id || res?.refundNo || orderId.value
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/refund/detail?id=${refundId}` })
    }, 800)
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

.refund {
  min-height: 100vh;
  background: $bg;
  padding: 12px 16px 40px;
}

.card {
  background: #fff;
  border-radius: $radius-md;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: $shadow;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
  color: $text;
}

.sub-title {
  font-size: 12px;
  color: $text-muted;
  font-weight: 400;
  margin-left: 6px;
}

.reason-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid $border;
  font-size: 14px;
  color: $text;
}

.reason-item:last-child {
  border-bottom: none;
}

.reason-item.active {
  color: $primary;
  font-weight: 600;
}

.radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid $border;
}

.radio-active {
  background: $primary;
  border-color: $primary;
  box-shadow: inset 0 0 0 3px #fff;
}

.amount-input {
  display: flex;
  align-items: center;
  border-bottom: 1px solid $border;
  padding: 10px 0;
}

.symbol {
  font-size: 20px;
  font-weight: 700;
  color: $text;
  margin-right: 8px;
}

input {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
}

.tip {
  font-size: 12px;
  color: $text-muted;
  margin-top: 8px;
}

textarea {
  width: 100%;
  height: 80px;
  font-size: 14px;
  color: $text;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.image-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: $radius-md;
  overflow: hidden;
  background: $bg;
}

.upload-img {
  width: 100%;
  height: 100%;
}

.img-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  border: 1px dashed $border;
  background: #fff;
}

.upload-text {
  font-size: 11px;
  margin-top: 4px;
}

.submit-btn {
  margin-top: 24px;
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
