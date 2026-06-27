import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  smsLogin, passwordLogin, emailLogin,
  sendSmsCode, sendEmailCode,
  logout as apiLogout, getUserProfile
} from '@/api'
import { getToken, setToken, clearToken, getRefreshToken, setRefreshToken, clearRefreshToken } from '@/utils/request'
import { wsService } from '@/utils/websocket'

const USER_KEY = 'wzz_user_info'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const refreshToken = ref(getRefreshToken())
  const userInfo = ref<any>(uni.getStorageSync(USER_KEY) || null)

  const isLoggedIn = computed(() => !!token.value)
  const userId = computed(() => userInfo.value?.id)
  const nickname = computed(() => userInfo.value?.nickname || '游客')
  const avatar = computed(() => userInfo.value?.avatar || '')
  const phoneBound = computed(() => !!userInfo.value?.phoneBound)

  function initFromStorage() {
    token.value = getToken()
    refreshToken.value = getRefreshToken()
    userInfo.value = uni.getStorageSync(USER_KEY) || null
  }

  async function loginBySms(phone: string, code: string) {
    const res = await smsLogin(phone, code)
    token.value = res.token || ''
    refreshToken.value = res.refreshToken || ''
    setToken(res.token || '')
    setRefreshToken(res.refreshToken || '')
    // 登录成功后拉取完整资料
    const profile = await fetchProfile()
    // 登录成功后建立 WebSocket 连接，接收实时订单推送
    if (res.token) wsService.connectWithToken(res.token)
    return { ...res, ...profile }
  }

  async function loginByPassword(phone: string, password: string) {
    const res = await passwordLogin(phone, password)
    token.value = res.token || ''
    refreshToken.value = res.refreshToken || ''
    setToken(res.token || '')
    setRefreshToken(res.refreshToken || '')
    // 登录成功后拉取完整资料
    const profile = await fetchProfile()
    // 登录成功后建立 WebSocket 连接，接收实时订单推送
    if (res.token) wsService.connectWithToken(res.token)
    return { ...res, ...profile }
  }

  /** 邮箱 + 验证码登录 */
  async function loginByEmail(email: string, code: string) {
    const res = await emailLogin(email, code)
    token.value = res.token || ''
    refreshToken.value = res.refreshToken || ''
    setToken(res.token || '')
    setRefreshToken(res.refreshToken || '')
    const profile = await fetchProfile()
    // 登录成功后建立 WebSocket 连接，接收实时订单推送
    if (res.token) wsService.connectWithToken(res.token)
    return { ...res, ...profile }
  }

  async function fetchProfile() {
    const res: any = await getUserProfile()
    userInfo.value = res
    uni.setStorageSync(USER_KEY, res)
    return res
  }

  async function sendCode(phone: string, scene = 'LOGIN') {
    return sendSmsCode(phone, scene)
  }

  /** 发送邮箱验证码 */
  async function sendEmail(scene = 'LOGIN') {
    const email = userInfo.value?.email
    if (!email) throw new Error('当前账号无邮箱')
    return sendEmailCode(email, scene)
  }

  async function logout() {
    try { await apiLogout() } catch (e) { /* ignore */ }
    // 退出登录前主动断开 WebSocket，避免服务端继续向已注销的 token 推送导致消息丢失
    try { wsService.disconnect() } catch (e) { /* ignore */ }
    token.value = ''
    refreshToken.value = ''
    userInfo.value = null
    clearToken()
    clearRefreshToken()
    uni.removeStorageSync(USER_KEY)
  }

  return {
    token, refreshToken, userInfo, isLoggedIn, userId, nickname, avatar, phoneBound,
    initFromStorage, loginBySms, loginByPassword, loginByEmail,
    fetchProfile, sendCode, sendEmail, logout
  }
})
