<template>
  <view class="bind-page">
    <!-- 已绑定状态 -->
    <template v-if="isBound">
      <view class="header">
        <view class="header-icon-wrap"><CategoryIcon name="phone" :size="48" color="#FF6B35" /></view>
        <view class="header-title">手机号已绑定</view>
        <view class="header-desc">您已成功绑定手机号，可接收订单通知和骑手联系</view>
      </view>

      <view class="bound-card">
        <view class="bound-phone-row">
          <text class="bound-label">当前手机号</text>
          <text class="bound-phone">{{ maskedPhone }}</text>
        </view>
        <view class="bound-status">
          <text class="status-dot"></text>
          <text class="status-text">已绑定，可正常接收订单通知</text>
        </view>
      </view>

      <view :class="['action-btn', 'action-primary', changing && 'action-disabled']" @tap="startChange">
        {{ changing ? '取消更换' : '更换手机号' }}
      </view>

      <view v-if="!changing" class="action-btn action-danger" @tap="onUnbind">
        解绑手机号
      </view>
    </template>

    <!-- 未绑定 / 更换手机号表单 -->
    <template v-else>
      <view class="header">
        <view class="header-icon-wrap"><CategoryIcon name="phone" :size="48" color="#FF6B35" /></view>
        <view class="header-title">{{ isChangeMode ? '更换手机号' : '绑定手机号' }}</view>
        <view class="header-desc">为保障账户安全与订单联系，下单前请先绑定手机号</view>
      </view>

      <view class="form-card">
        <view class="form-item">
          <text class="form-label">手机号</text>
          <input v-model="phone" class="form-input" type="number" maxlength="11" placeholder="请输入手机号" />
        </view>

        <view class="form-item">
          <text class="form-label">邮箱验证码</text>
          <input v-model="emailCode" class="form-input" type="number" maxlength="6" placeholder="请输入邮箱验证码" />
          <view :class="['sms-btn', countdown > 0 && 'sms-btn-disabled']" @tap="onSendCode">
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </view>
        </view>

        <view class="email-hint">
          <CategoryIcon name="envelope" :size="14" color="#FF6B35" />
          <text>验证码将发送至 {{ maskedEmail }}</text>
        </view>

        <view :class="['submit-btn', submitting && 'submit-disabled']" @tap="onSubmit">
          {{ submitting ? (isChangeMode ? '更换中...' : '绑定中...') : (isChangeMode ? '确认更换' : '确认绑定') }}
        </view>

        <view v-if="isChangeMode" class="cancel-btn" @tap="cancelChange">取消更换</view>
      </view>

      <view class="tips">
        <view class="tip-item">• 绑定手机号后可使用手机号接收订单状态通知</view>
        <view class="tip-item">• 骑手配送时可通过手机号联系您</view>
        <view class="tip-item">• 一个手机号仅可绑定一个账号</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { sendEmailCode, bindPhone, unbindPhone } from '@/api'
import { isMobile } from '@/utils/validator'
import { message } from '@/utils/message'

const userStore = useUserStore()
const phone = ref('')
const emailCode = ref('')
const countdown = ref(0)
const submitting = ref(false)
const changing = ref(false)
const redirect = ref('')

let timer: any = null

const isBound = computed(() => !!userStore.userInfo?.phoneBound && !changing.value)
const isChangeMode = computed(() => changing.value)

const maskedEmail = computed(() => {
  const email = userStore.userInfo?.email || ''
  if (!email) return '当前账号'
  const at = email.indexOf('@')
  if (at <= 1) return email
  return email.charAt(0) + '***' + email.substring(at)
})

const maskedPhone = computed(() => {
  const p = userStore.userInfo?.phone || ''
  if (!p) return ''
  // 后端已经返回脱敏手机号（如 138****8888），如果是完整手机号则脱敏
  if (p.includes('*')) return p
  if (p.length === 11) return p.substring(0, 3) + '****' + p.substring(7)
  return p
})

onLoad((q: any) => {
  redirect.value = q?.redirect || ''
})

onShow(() => {
  // 每次显示时刷新用户信息
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {})
  }
})

function startChange() {
  changing.value = true
  phone.value = ''
  emailCode.value = ''
}

function cancelChange() {
  changing.value = false
  phone.value = ''
  emailCode.value = ''
  if (timer) { clearInterval(timer); timer = null }
  countdown.value = 0
}

async function onSendCode() {
  if (countdown.value > 0) return
  try {
    await sendEmailCode('', 'BIND_PHONE')
    message.success('验证码已发送至邮箱')
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) { clearInterval(timer); timer = null }
    }, 1000)
  } catch (e) {
    console.error('发送邮箱验证码失败', e)
  }
}

async function onSubmit() {
  if (submitting.value) return
  if (!isMobile(phone.value)) {
    return message.warning('请输入正确的手机号')
  }
  if (!/^\d{6}$/.test(emailCode.value)) {
    return message.warning('请输入6位邮箱验证码')
  }

  submitting.value = true
  try {
    await bindPhone({ phone: phone.value, code: emailCode.value })
    await userStore.fetchProfile()

    message.success(isChangeMode.value ? '手机号更换成功' : '手机号绑定成功')

    changing.value = false

    setTimeout(() => {
      if (redirect.value) {
        uni.redirectTo({
          url: redirect.value,
          fail: () => {
            uni.switchTab({ url: '/pages/profile/index' })
          },
        })
      } else {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          uni.navigateBack()
        } else {
          uni.switchTab({ url: '/pages/profile/index' })
        }
      }
    }, 1000)
  } catch (e: any) {
    console.error(isChangeMode.value ? '更换手机号失败' : '绑定手机号失败', e)
  } finally {
    submitting.value = false
  }
}

async function onUnbind() {
  const res = await uni.showModal({
    title: '提示',
    content: '解绑后将无法接收订单通知和骑手联系，确定解绑吗？',
    confirmColor: '#FF4B33',
    confirmText: '确定解绑',
  }).catch(() => ({ confirm: false } as any))
  if (!res.confirm) return

  try {
    uni.showLoading({ title: '解绑中...' })
    await unbindPhone()
    await userStore.fetchProfile()
    uni.hideLoading()
    message.success('已解绑手机号')
  } catch (e: any) {
    uni.hideLoading()
    console.error('解绑手机号失败', e)
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.bind-page {
  min-height: 100vh;
  background: $bg;
  padding: calc(var(--status-bar-height, 20px) + 20px) 16px 24px;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header-icon-wrap {
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  color: $text;
  margin-bottom: 8px;
}

.header-desc {
  font-size: 13px;
  color: $text-muted;
  padding: 0 24px;
  line-height: 1.5;
}

/* 已绑定状态卡片 */
.bound-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 20px;
  box-shadow: $shadow;
  margin-bottom: 24px;
}

.bound-phone-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid $border;
}

.bound-label {
  font-size: 14px;
  color: $text-light;
}

.bound-phone {
  font-size: 22px;
  font-weight: 700;
  color: $text;
  letter-spacing: 1px;
}

.bound-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $success;
}

.status-text {
  font-size: 13px;
  color: $success;
}

/* 表单 */
.form-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 16px 20px;
  box-shadow: $shadow;
}

.form-item {
  display: flex;
  align-items: center;
  border-bottom: 1px solid $border;
  padding: 14px 0;
  margin-bottom: 4px;
}

.form-label {
  width: 90px;
  color: $text;
  font-size: 14px;
}

.form-input {
  flex: 1;
  font-size: 15px;
  color: $text;
}

.sms-btn {
  padding: 6px 12px;
  font-size: 13px;
  color: $primary;
  border: 1px solid $primary;
  border-radius: 16px;
  background: #fff;
  white-space: nowrap;
}

.sms-btn-disabled {
  color: $text-muted;
  border-color: $border;
}

.email-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: $text-muted;
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba($primary, 0.04);
  border-radius: $radius-sm;
}

.email-hint :deep(.category-icon-svg) {
  flex-shrink: 0;
}

.submit-btn {
  margin-top: 24px;
  height: 48px;
  line-height: 48px;
  text-align: center;
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.submit-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.cancel-btn {
  margin-top: 12px;
  height: 44px;
  line-height: 44px;
  text-align: center;
  color: $text-light;
  font-size: 14px;
}

.tips {
  margin-top: 24px;
  padding: 0 8px;
}

.tip-item {
  font-size: 12px;
  color: $text-muted;
  line-height: 1.8;
}

/* 操作按钮 */
.action-btn {
  height: 50px;
  line-height: 50px;
  text-align: center;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.action-primary {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.action-danger {
  background: #fff;
  color: $danger;
  border: 1px solid $danger;
}

.action-disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
