/**
 * 统一 API 请求封装 - 微信小程序 / H5 / App 通用
 * 基于 Promise 化的 uni.request
 *
 * 特性：
 * 1. 从 import.meta.env 读取 BASE_URL / UPLOAD_URL
 * 2. 自动注入 Authorization 与 X-Trace-Id
 * 3. 401 时自动刷新 token 并重试原请求
 * 4. 请求取消机制（cancelRequest / cancelAllRequests）
 * 5. 网络 / HTTP / 业务错误统一提示
 */

import { handleApiError } from './errorHandler'
import { ErrorCode, type ApiResult, type LoginVO } from '@/types/api'

const env = (import.meta as any).env || {}

export const BASE_URL = (env.VITE_API_BASE_URL as string) || 'http://localhost:8080'
export const UPLOAD_BASE_URL = (env.VITE_UPLOAD_BASE_URL as string) || `${BASE_URL}/api/public/files`

export interface ApiOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  showLoading?: boolean
  loadingText?: string
  /** 请求唯一标识，用于取消请求 */
  id?: string
  /** 内部标记：是否为刷新 token 后的重试请求 */
  _retry?: boolean
}

const TOKEN_KEY = 'wzz_token'
const REFRESH_TOKEN_KEY = 'wzz_refresh_token'

export const getToken = () => uni.getStorageSync(TOKEN_KEY) || ''
export const setToken = (t: string) => uni.setStorageSync(TOKEN_KEY, t)
export const clearToken = () => uni.removeStorageSync(TOKEN_KEY)

export const getRefreshToken = () => uni.getStorageSync(REFRESH_TOKEN_KEY) || ''
export const setRefreshToken = (t: string) => uni.setStorageSync(REFRESH_TOKEN_KEY, t)
export const clearRefreshToken = () => uni.removeStorageSync(REFRESH_TOKEN_KEY)

interface PendingRequest {
  task: UniApp.RequestTask
  reject: (reason?: any) => void
}

const pendingRequests = new Map<string, PendingRequest>()

let isRefreshing = false
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (reason?: any) => void }> = []

function generateTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function generateReqId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function removePending(id: string) {
  pendingRequests.delete(id)
}

function clearAuthAndGoLogin(message = '请重新登录') {
  clearToken()
  clearRefreshToken()
  uni.removeStorageSync('wzz_user_info')
  uni.showToast({ title: message, icon: 'none' })
  setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 800)
}

/**
 * 刷新 token 核心逻辑
 * 同一时间只发起一次刷新请求，其余请求排队等待新 token
 */
function doRefresh(): Promise<string> {
  const rt = getRefreshToken()
  if (!rt) {
    return Promise.reject(new Error('no refresh token'))
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }))
  }

  isRefreshing = true

  return new Promise<string>((resolve, reject) => {
    uni.request({
      url: BASE_URL + '/api/user/auth/refresh',
      method: 'POST',
      data: { refreshToken: rt },
      header: {
        'Content-Type': 'application/json',
        'X-Trace-Id': generateTraceId(),
      },
      success: (res) => {
        const body = (res.data as ApiResult<LoginVO>) || ({} as ApiResult<LoginVO>)
        if (res.statusCode === 200 && body.code === ErrorCode.SUCCESS && body.data?.token && body.data?.refreshToken) {
          setToken(body.data.token)
          setRefreshToken(body.data.refreshToken)
          resolve(body.data.token)
        } else {
          reject(new Error(body.message || 'refresh failed'))
        }
      },
      fail: (err) => reject(err),
      complete: () => {
        isRefreshing = false
      },
    })
  })
    .then((token) => {
      const queue = refreshQueue
      refreshQueue = []
      queue.forEach((p) => p.resolve(token))
      return token
    })
    .catch((err) => {
      const queue = refreshQueue
      refreshQueue = []
      queue.forEach((p) => p.reject(err))
      throw err
    })
}

/**
 * 请求去重：对于 POST/PUT/DELETE 请求，如果短时间内有相同请求（URL+data相同），直接返回 pending 的 Promise
 * 防止 uni.request 在 H5 平台或网络层重复发送请求
 */
const pendingDuplicateMap = new Map<string, Promise<any>>()

function getRequestFingerprint(url: string, method: string, data: any): string {
  try {
    return `${method}:${url}:${typeof data === 'string' ? data : JSON.stringify(data || {})}`
  } catch {
    return `${method}:${url}:${Date.now()}`
  }
}

/**
 * 核心请求方法
 */
export function request<T = any>(options: ApiOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showLoading = false,
    loadingText = '加载中',
    id = generateReqId(),
    _retry = false,
  } = options

  if (showLoading) uni.showLoading({ title: loadingText, mask: true })

  const token = getToken()
  const fullUrl = url.startsWith('http') ? url : BASE_URL + url
  const traceId = generateTraceId()

  // 对于写操作（POST/PUT/DELETE），进行请求去重
  const upperMethod = method.toUpperCase()
  const fingerprint = upperMethod !== 'GET' && !_retry
    ? getRequestFingerprint(fullUrl, upperMethod, data)
    : null

  if (fingerprint) {
    const existing = pendingDuplicateMap.get(fingerprint)
    if (existing) {
      // 已有相同请求在进行中，直接返回该 Promise（不重复发送请求）
      if (showLoading) uni.hideLoading()
      return existing as Promise<T>
    }
  }

  const requestPromise = new Promise<T>((resolve, reject) => {
    const task = uni.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      success: async (res) => {
        removePending(id)
        if (showLoading) uni.hideLoading()

        const status = res.statusCode
        const body = (res.data as ApiResult<T>) || ({} as ApiResult<T>)

        // 业务成功
        if (status >= 200 && status < 300 && body.code === ErrorCode.SUCCESS) {
          resolve(body.data)
          return
        }

        // 账号被禁用：直接登出，不进行 token 刷新
        if (body.code === ErrorCode.USER_DISABLED) {
          clearAuthAndGoLogin('账号已被禁用，请联系客服')
          reject(body)
          return
        }

        // 认证失效：刷新 token 并重试（仅允许重试一次，防止死循环）
        const isAuthError = status === 401 || body.code === ErrorCode.UNAUTHORIZED

        if (isAuthError) {
          if (_retry) {
            clearAuthAndGoLogin('登录已过期，请重新登录')
            reject(body)
            return
          }

          const refreshTokenExists = !!getRefreshToken()
          if (refreshTokenExists) {
            try {
              await doRefresh()
              const retried = await request<T>({ ...options, id: generateReqId(), _retry: true })
              resolve(retried)
              return
            } catch (e) {
              clearAuthAndGoLogin('登录已过期，请重新登录')
              reject(e)
              return
            }
          } else {
            clearAuthAndGoLogin('请先登录')
            reject(body)
            return
          }
        }

        // 业务错误 / HTTP 错误统一提示
        const err =
          status >= 200 && status < 300
            ? { type: 'business' as const, code: body.code, message: body.message || '请求失败' }
            : { type: 'http' as const, statusCode: status, message: body.message || `请求失败（${status}）` }

        handleApiError(err)
        reject(err)
      },
      fail: (err) => {
        removePending(id)
        if (showLoading) uni.hideLoading()

        const errMsg = (err as any).errMsg || ''
        if (errMsg.includes('abort')) {
          reject({ type: 'cancel', message: '请求已取消' })
          return
        }

        const networkErr = { type: 'network' as const, raw: err, message: errMsg || '网络异常' }
        handleApiError(networkErr)
        reject(networkErr)
      },
    })

    pendingRequests.set(id, { task, reject })
  })

  // 注册去重 Promise 并在完成后清理
  if (fingerprint) {
    pendingDuplicateMap.set(fingerprint, requestPromise)
    // 无论成功或失败，都清理去重 Map
    requestPromise.finally(() => {
      pendingDuplicateMap.delete(fingerprint)
    })
  }

  return requestPromise
}

/**
 * 取消指定请求
 */
export function cancelRequest(id?: string) {
  if (!id) {
    cancelAllRequests()
    return
  }
  const p = pendingRequests.get(id)
  if (p) {
    p.task.abort()
    pendingRequests.delete(id)
  }
}

/**
 * 取消所有正在进行的请求
 */
export function cancelAllRequests() {
  pendingRequests.forEach((p) => {
    try {
      p.task.abort()
    } catch (e) {
      // ignore
    }
  })
  pendingRequests.clear()
}

/**
 * GET 请求便捷方法
 */
export const get = <T = any>(url: string, data?: any, opts: Partial<ApiOptions> = {}) =>
  request<T>({ url, method: 'GET', data, ...opts })

/**
 * POST 请求便捷方法
 */
export const post = <T = any>(url: string, data?: any, opts: Partial<ApiOptions> = {}) =>
  request<T>({ url, method: 'POST', data, ...opts })

/**
 * PUT 请求便捷方法
 */
export const put = <T = any>(url: string, data?: any, opts: Partial<ApiOptions> = {}) =>
  request<T>({ url, method: 'PUT', data, ...opts })

/**
 * DELETE 请求便捷方法
 */
export const del = <T = any>(url: string, data?: any, opts: Partial<ApiOptions> = {}) =>
  request<T>({ url, method: 'DELETE', data, ...opts })
