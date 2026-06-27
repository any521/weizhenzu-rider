<template>
  <view class="login-page">
    <view class="brand">
      <view class="brand-logo">味</view>
      <text class="brand-name">味真足</text>
      <text class="brand-slogan">外卖订餐 美味到家</text>
    </view>

    <view class="login-card">
      <view class="tabs">
        <view :class="['tab', mode === 'email' && 'tab-active']" @tap="mode = 'email'">邮箱登录</view>
        <view :class="['tab', mode === 'pwd' && 'tab-active']" @tap="mode = 'pwd'">密码登录</view>
      </view>

      <!-- 邮箱验证码登录 -->
      <view v-if="mode === 'email'" class="form">
        <view class="form-item">
          <text class="form-label">邮箱</text>
          <input v-model="email" class="form-input" type="text" maxlength="64" placeholder="请输入邮箱地址" />
        </view>
        <view class="form-item">
          <text class="form-label">验证码</text>
          <input v-model="code" class="form-input" type="number" maxlength="6" placeholder="请输入邮箱验证码" />
          <view :class="['sms-btn', countdown > 0 && 'sms-btn-disabled']" @tap="onSendEmailCode">
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </view>
        </view>
        <view :class="['submit-btn', !agreed && 'submit-disabled']" @tap="onEmailLogin">登 录</view>
        <view class="hint">未注册的邮箱将自动创建账号</view>
      </view>

      <!-- 密码登录 -->
      <view v-else class="form">
        <view class="form-item">
          <text class="form-label">账号</text>
          <input v-model="phone" class="form-input" maxlength="32" placeholder="手机号或用户名" />
        </view>
        <view class="form-item">
          <text class="form-label">密码</text>
          <input v-model="password" class="form-input" :type="showPwd ? 'text' : 'password'" placeholder="请输入密码" />
          <view class="sms-btn" @tap="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</view>
        </view>
        <view :class="['submit-btn', !agreed && 'submit-disabled']" @tap="onPwdLogin">登 录</view>
      </view>
    </view>

    <view class="agreement">
      <view :class="['agree-box', agreed && 'agree-active']" @tap="agreed = !agreed">
        <CategoryIcon v-if="agreed" name="check" :size="10" />
      </view>
      <text>我已阅读并同意</text>
      <text class="agree-link" @tap="openAgreement('用户协议')">《用户协议》</text>
      <text class="agree-link" @tap="openAgreement('隐私政策')">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { sendEmailCode } from '@/api'
import { isMobile, isEmail } from '@/utils/validator'
import { message } from '@/utils/message'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

type LoginMode = 'email' | 'pwd'
const mode = ref<LoginMode>('email')
const email = ref('')
const phone = ref('')
const code = ref('')
const password = ref('')
const showPwd = ref(false)
const countdown = ref(0)
const agreed = ref(false)
const redirect = ref('')
const userStore = useUserStore()

let timer: any = null

onLoad((q: any) => {
  redirect.value = q?.redirect || '/pages/profile/index'
})

function isValidPhone(p: string) { return isMobile(p) }
function isValidEmail(e: string) { return isEmail(e) }

async function onSendEmailCode() {
  if (countdown.value > 0) return
  if (!isValidEmail(email.value)) {
    return message.warning('请输入正确的邮箱地址')
  }
  try {
    await sendEmailCode(email.value, 'LOGIN')
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

function onEmailLogin() {
  if (!agreed.value) return message.warning('请先同意用户协议和隐私政策')
  if (!isValidEmail(email.value)) return message.warning('邮箱格式错误')
  if (!code.value) return message.warning('请输入验证码')
  if (!/^\d{6}$/.test(code.value)) return message.warning('验证码为6位数字')
  doLogin()
}

function isValidAccount(account: string) {
  return isValidPhone(account) || /^[a-zA-Z0-9_]{2,32}$/.test(account)
}

function onPwdLogin() {
  if (!agreed.value) return message.warning('请先同意用户协议和隐私政策')
  if (!isValidAccount(phone.value)) return message.warning('请输入正确的手机号或用户名')
  if (!password.value) return message.warning('请输入密码')
  doLogin()
}

async function doLogin() {
  try {
    if (mode.value === 'email') {
      await userStore.loginByEmail(email.value, code.value)
    } else {
      await userStore.loginByPassword(phone.value, password.value)
    }
    setTimeout(() => {
      if (redirect.value.startsWith('/pages/index/index') || redirect.value.startsWith('/pages/coupon/index') || redirect.value.startsWith('/pages/order/list') || redirect.value.startsWith('/pages/profile/index')) {
        uni.switchTab({ url: redirect.value })
      } else {
        uni.reLaunch({ url: redirect.value })
      }
    }, 600)
  } catch (e) {
    console.error('登录失败', e)
  }
}

function openAgreement(title: string) {
  uni.showModal({ title, content: `此处为《${title}》内容示例，实际应由运营配置。`, showCancel: false })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, $primary 0%, $primary-light 30%, $bg 30%, $bg 100%);
  padding: calc(var(--status-bar-height, 20px) + 40px) 24px 40px;
}

.brand { text-align: center; margin-bottom: 40px; }
.brand-logo {
  width: 72px; height: 72px; border-radius: 18px; margin: 0 auto 12px;
  background: #fff; color: $primary; display: flex; align-items: center; justify-content: center;
  font-size: 36px; font-weight: 800; box-shadow: $shadow-md;
}
.brand-name { display: block; font-size: 24px; font-weight: 700; color: #fff; letter-spacing: 2px; }
.brand-slogan { display: block; font-size: 13px; color: rgba(255, 255, 255, 0.85); margin-top: 4px; }

.login-card {
  background: #fff; border-radius: $radius-lg; padding: 24px 20px;
  box-shadow: $shadow-md;
}
.tabs { display: flex; border-bottom: 1px solid $border; margin-bottom: 24px; }
.tab {
  flex: 1; text-align: center; padding: 12px 0; font-size: 15px; color: $text-muted;
  position: relative; font-weight: 500;
}
.tab-active { color: $primary; font-weight: 700; }
.tab-active::after {
  content: ''; position: absolute; left: 50%; bottom: -1px; transform: translateX(-50%);
  width: 24px; height: 3px; background: $primary; border-radius: 2px;
}

.form-item {
  display: flex; align-items: center; border-bottom: 1px solid $border;
  padding: 14px 0; margin-bottom: 4px;
}
.form-label { width: 70px; color: $text; font-size: 14px; }
.form-input { flex: 1; font-size: 15px; color: $text; }
.sms-btn {
  padding: 6px 12px; font-size: 13px; color: $primary; border: 1px solid $primary;
  border-radius: 16px; background: #fff;
}
.sms-btn-disabled { color: $text-muted; border-color: $border; }

.submit-btn {
  margin-top: 28px; height: 48px; line-height: 48px; text-align: center;
  background: linear-gradient(135deg, $primary, $primary-light); color: #fff;
  font-size: 16px; font-weight: 600; border-radius: 24px;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}
.hint { text-align: center; font-size: 12px; color: $text-muted; margin-top: 12px; }

.footer { text-align: center; font-size: 11px; color: $text-muted; margin-top: 32px; }

.submit-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 24px;
  font-size: 12px;
  color: $text-muted;
}

.agree-box {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid $text-muted;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agree-active {
  background: $primary;
  border-color: $primary;
}

.agree-link {
  color: $primary;
}
</style>
