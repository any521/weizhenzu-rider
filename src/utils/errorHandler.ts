/**
 * 统一 API 错误处理
 * 负责将网络错误、HTTP 错误、业务错误码分类并统一提示
 */

import { ErrorCode } from '@/types/api'

export interface ApiError {
  type: 'network' | 'http' | 'business' | 'cancel'
  code?: number
  statusCode?: number
  message: string
  raw?: any
}

/**
 * 将任意错误对象转换为结构化的 ApiError
 */
export function normalizeError(error: any): ApiError {
  // 已经是结构化错误
  if (error?.type === 'cancel') {
    return error as ApiError
  }

  if (typeof error === 'string') {
    return { type: 'business', message: error }
  }

  // 账号被禁用
  if (error?.code === ErrorCode.USER_DISABLED) {
    return { type: 'business', code: ErrorCode.USER_DISABLED, statusCode: error?.statusCode, message: '账号已被禁用，请联系客服' }
  }

  // HTTP 状态码 / 通用 code 优先
  if (error?.statusCode === 401 || error?.code === 401 || error?.code === ErrorCode.UNAUTHORIZED) {
    return { type: 'http', code: 401, statusCode: error?.statusCode, message: '登录已过期，请重新登录' }
  }

  if (error?.statusCode === 403 || error?.code === 403) {
    return { type: 'http', code: 403, statusCode: error?.statusCode, message: '暂无权限访问' }
  }

  if (error?.statusCode === 404 || error?.code === 404) {
    return { type: 'http', code: 404, statusCode: error?.statusCode, message: '请求资源不存在' }
  }

  if (error?.statusCode === 500 || error?.code === 500) {
    return { type: 'http', code: 500, statusCode: error?.statusCode, message: '服务器繁忙，请稍后再试' }
  }

  if (error?.statusCode >= 400) {
    return { type: 'http', code: error.statusCode, statusCode: error.statusCode, message: `请求失败（${error.statusCode}）` }
  }

  // 业务错误码
  if (error?.code !== undefined && error?.code !== ErrorCode.SUCCESS) {
    return { type: 'business', code: error.code, message: error.message || `业务异常（${error.code}）` }
  }

  // 网络层错误（uni.request fail）
  const msg = (error?.errMsg || error?.message || '').toString().toLowerCase()
  if (msg.includes('abort') || msg.includes('cancel')) {
    return { type: 'cancel', message: '请求已取消' }
  }
  if (msg.includes('timeout')) {
    return { type: 'network', message: '请求超时，请稍后重试' }
  }
  if (msg.includes('fail') || msg.includes('network') || msg.includes('connect')) {
    return { type: 'network', message: '网络异常，请检查网络' }
  }

  return { type: 'network', message: error?.message || '网络异常' }
}

/**
 * 统一错误提示入口
 * 取消类错误不弹提示
 */
export function handleApiError(error: any): void {
  const err = normalizeError(error)
  if (err.type === 'cancel') return
  uni.showToast({ title: err.message || '请求失败', icon: 'none' })
}
