/**
 * 全局消息提示工具类（类似 Element Plus ElMessage 风格）
 * 纯 CSS 实现，不依赖任何 UI 库，兼容 H5 / 小程序 / App 三端
 */
import { reactive } from 'vue'

export type MessageType = 'success' | 'error' | 'warning' | 'info'

export interface MessageOptions {
  /** 显示时长（毫秒），默认 2500 */
  duration?: number
  /** 关闭回调 */
  onClose?: () => void
}

export interface MessageItem {
  id: number
  type: MessageType
  text: string
  duration: number
  onClose?: () => void
  /** 离开动画标记 */
  leaving: boolean
  /** 定时器 */
  timer: ReturnType<typeof setTimeout> | null
}

/** 最大文字长度，超过则截断加省略号 */
const MAX_TEXT_LENGTH = 16
/** 错误消息通常包含完整的业务提示（如"您距离商家还有4166米，请在200米范围内操作"），
 *  需要完整展示给用户，截断长度放宽到 80 */
const MAX_ERROR_TEXT_LENGTH = 80
/** 防重复时间窗口（毫秒） */
const DEDUP_WINDOW = 1000
/** 默认显示时长 */
const DEFAULT_DURATION = 2500

/** 模块级响应式消息队列，组件直接 import 使用 */
export const messages = reactive<MessageItem[]>([])

/** 自增 id */
let seed = 0

/** 防重复记录：key = `${type}:${text}`, value = 上次显示时间戳 */
const recentMap = new Map<string, number>()

/**
 * 截断文字
 */
function truncate(text: string, maxLength: number = MAX_TEXT_LENGTH): string {
  if (!text) return ''
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...'
  }
  return text
}

/**
 * 关闭指定消息（带动画）
 */
export function closeMessage(id: number) {
  const idx = messages.findIndex((m) => m.id === id)
  if (idx === -1) return

  const msg = messages[idx]
  if (msg.leaving) return

  // 触发离开动画
  msg.leaving = true

  // 动画结束后移除
  setTimeout(() => {
    const i = messages.findIndex((m) => m.id === id)
    if (i !== -1) {
      const removed = messages.splice(i, 1)[0]
      if (removed.timer) {
        clearTimeout(removed.timer)
        removed.timer = null
      }
      removed.onClose?.()
    }
  }, 300)
}

/**
 * 核心：添加一条消息
 */
function show(type: MessageType, text: string, options: MessageOptions = {}) {
  const rawText = String(text ?? '').trim()
  if (!rawText) return

  const displayText = truncate(
    rawText,
    type === 'error' ? MAX_ERROR_TEXT_LENGTH : MAX_TEXT_LENGTH
  )
  const key = `${type}:${rawText}`
  const now = Date.now()

  // 防重复：相同 type + 原文 1 秒内不重复显示
  const lastTime = recentMap.get(key)
  if (lastTime && now - lastTime < DEDUP_WINDOW) {
    return
  }
  recentMap.set(key, now)

  const id = ++seed
  const duration = options.duration ?? DEFAULT_DURATION

  const item: MessageItem = {
    id,
    type,
    text: displayText,
    duration,
    onClose: options.onClose,
    leaving: false,
    timer: null,
  }

  // 设置自动关闭定时器
  if (duration > 0) {
    item.timer = setTimeout(() => {
      closeMessage(id)
    }, duration)
  }

  messages.push(item)
}

/**
 * 成功消息
 */
function success(text: string, options?: MessageOptions) {
  show('success', text, options)
}

/**
 * 错误消息
 */
function error(text: string, options?: MessageOptions) {
  show('error', text, options)
}

/**
 * 警告消息
 */
function warning(text: string, options?: MessageOptions) {
  show('warning', text, options)
}

/**
 * 提示消息
 */
function info(text: string, options?: MessageOptions) {
  show('info', text, options)
}

/**
 * 手动关闭所有消息
 */
function closeAll() {
  // 从后往前关闭，避免索引问题
  for (let i = messages.length - 1; i >= 0; i--) {
    closeMessage(messages[i].id)
  }
}

export const message = {
  success,
  error,
  warning,
  info,
  closeAll,
  close: closeMessage,
}

export default message
