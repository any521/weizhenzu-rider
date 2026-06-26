<template>
  <view class="edit-profile">
    <!-- 顶部标题栏 -->
    <view class="navbar">
      <view class="back-btn" @tap="goBack">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </view>
      <text class="navbar-title">个人资料</text>
      <view class="navbar-right" @tap="onSave">
        <text class="save-btn" :class="{ disabled: saving }">{{ saving ? '保存中...' : '保存' }}</text>
      </view>
    </view>

    <!-- 头像区域 -->
    <view class="avatar-section" @tap="onChooseAvatar">
      <text class="section-label">头像</text>
      <view class="avatar-wrap">
        <image v-if="form.avatar" class="avatar-img" :src="form.avatar" mode="aspectFill" />
        <view v-else class="avatar-placeholder">
          <CategoryIcon name="avatar" :size="32" />
        </view>
        <text class="avatar-arrow">›</text>
      </view>
    </view>

    <!-- 表单区域 -->
    <view class="form-group">
      <view class="form-cell">
        <text class="cell-label">昵称</text>
        <input
          class="cell-input"
          v-model="form.nickname"
          placeholder="请输入昵称"
          placeholder-class="input-placeholder"
          maxlength="20"
        />
      </view>

      <view class="form-cell" @tap="onChooseGender">
        <text class="cell-label">性别</text>
        <view class="cell-right">
          <text class="cell-value" :class="{ placeholder: !genderText }">{{ genderText || '请选择' }}</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>

      <picker mode="date" :value="form.birthday" start="1900-01-01" :end="todayStr" @change="onBirthdayChange" @cancel="onBirthdayCancel">
        <view class="form-cell">
          <text class="cell-label">生日</text>
          <view class="cell-right">
            <text class="cell-value" :class="{ placeholder: !form.birthday }">{{ form.birthday || '请选择' }}</text>
            <text class="cell-arrow">›</text>
          </view>
        </view>
      </picker>
    </view>

    <!-- 账号信息（只读） -->
    <view class="form-group">
      <view v-if="userStore.userInfo?.phone" class="form-cell">
        <text class="cell-label">手机号</text>
        <view class="cell-right">
          <text class="cell-value readonly">{{ maskPhone(userStore.userInfo.phone) }}</text>
        </view>
      </view>
      <view v-if="userStore.userInfo?.email" class="form-cell">
        <text class="cell-label">邮箱</text>
        <view class="cell-right">
          <text class="cell-value readonly">{{ userStore.userInfo.email }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onMounted } from 'vue'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import { useUserStore } from '@/store/user'
import { updateUserProfile, uploadImage } from '@/api'

const userStore = useUserStore()
const saving = ref(false)

const form = reactive({
  nickname: '',
  avatar: '',
  gender: undefined as number | undefined,
  birthday: '',
})

const todayStr = computed(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

const genderText = computed(() => {
  if (form.gender === 1) return '男'
  if (form.gender === 2) return '女'
  if (form.gender === 0) return '保密'
  return ''
})

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

onMounted(() => {
  const info = userStore.userInfo
  if (info) {
    form.nickname = info.nickname || ''
    form.avatar = info.avatar || ''
    form.gender = info.gender
    form.birthday = info.birthday || ''
  }
})

function goBack() {
  uni.navigateBack()
}

function onChooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      if (!tempFilePath) return
      uni.showLoading({ title: '上传中...', mask: true })
      try {
        const { url } = await uploadImage(tempFilePath)
        form.avatar = url
        uni.hideLoading()
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (e: any) {
        uni.hideLoading()
        uni.showToast({ title: e?.message || '上传失败', icon: 'none' })
      }
    },
  })
}

function onChooseGender() {
  uni.showActionSheet({
    itemList: ['男', '女', '保密'],
    success: (res) => {
      const map = [1, 2, 0]
      form.gender = map[res.tapIndex]
    },
  })
}

function onBirthdayChange(e: any) {
  form.birthday = e.detail.value
}

function onBirthdayCancel() {
  // do nothing
}

async function onSave() {
  if (saving.value) return
  if (!form.nickname.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const payload: any = {
      nickname: form.nickname.trim(),
    }
    if (form.avatar !== undefined) payload.avatar = form.avatar
    if (form.gender !== undefined) payload.gender = form.gender
    if (form.birthday) payload.birthday = form.birthday

    await updateUserProfile(payload)
    await userStore.fetchProfile()
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 600)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.edit-profile {
  min-height: 100vh;
  background: $bg;
}

.navbar {
  height: calc(var(--status-bar-height, 20px) + 44px);
  padding-top: var(--status-bar-height, 20px);
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
  width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn {
  font-size: 15px;
  font-weight: 600;
  color: $primary;
}

.save-btn.disabled {
  color: $text-muted;
}

.avatar-section {
  background: $card;
  margin-top: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-label {
  font-size: 15px;
  color: $text;
}

.avatar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar-img {
  width: 60px;
  height: 60px;
  border-radius: $radius-round;
}

.avatar-placeholder {
  width: 60px;
  height: 60px;
  border-radius: $radius-round;
  background: $bg;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
}

.avatar-arrow {
  font-size: 18px;
  color: $text-muted;
}

.form-group {
  background: $card;
  margin-top: 12px;
  padding: 0 16px;
}

.form-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid $border;
}

.form-cell:last-child {
  border-bottom: none;
}

.cell-label {
  font-size: 15px;
  color: $text;
  flex-shrink: 0;
}

.cell-input {
  flex: 1;
  text-align: right;
  font-size: 15px;
  color: $text;
  margin-left: 16px;
}

.input-placeholder {
  color: $text-muted;
}

.cell-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cell-value {
  font-size: 15px;
  color: $text;
}

.cell-value.placeholder {
  color: $text-muted;
}

.cell-value.readonly {
  color: $text-muted;
}

.cell-arrow {
  font-size: 16px;
  color: $text-muted;
}
</style>
