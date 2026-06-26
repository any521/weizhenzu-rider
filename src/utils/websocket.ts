/**
 * WebSocket 工具类（uni-app版本）
 * 用于用户端实时接收订单状态变更通知
 */

export interface WSMessage {
  type: string
  msgId?: string
  orderId?: number | string
  orderNo?: string
  merchantId?: number | string
  userId?: number | string
  amount?: number
  payType?: number
  fromStatus?: number
  toStatus?: number
  content?: string
  eventTime?: string
  timestamp?: number
  /** 骑手位置消息专用字段 */
  longitude?: number
  latitude?: number
  lng?: number
  lat?: number
  riderId?: number | string
  riderName?: string
}

type MessageHandler = (msg: WSMessage) => void

// 不需要弹Toast/震动的高频消息类型
const SILENT_MESSAGE_TYPES = new Set<string>(['RIDER_LOCATION'])

// 订单状态文案映射
const STATUS_CONTENT_MAP: Record<string, string> = {
  ORDER_ACCEPTED: '商家已接单',
  ORDER_REJECTED: '商家已拒单',
  ORDER_READY: '商家已出餐',
  ORDER_RIDER_TAKEN: '骑手已接单',
  ORDER_PICKED_UP: '骑手已取餐',
  ORDER_DELIVERED: '订单已送达',
  ORDER_COMPLETED: '订单已完成',
  ORDER_CANCELED: '订单已取消',
  ORDER_REFUNDED: '退款已到账',
  RIDER_LOCATION: '骑手位置更新',
  RIDER_MESSAGE: '骑手留言',
}

class UniWebSocketService {
  private socketTask: UniApp.SocketTask | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private tokenRetryTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectCount = 0
  private maxReconnectCount = 10
  private tokenRetryCount = 0
  private maxTokenRetryCount = 10
  private tokenRetryInterval = 1000
  private reconnectInterval = 5000
  private heartbeatInterval = 30000
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private connected = false
  private manuallyClosed = false
  private connecting = false

  /**
   * 连接WebSocket（从storage读取token）
   */
  connect() {
    const token = this.getToken()
    if (!token) {
      this.scheduleTokenRetry()
      return
    }
    this.doConnect(token)
  }

  /**
   * 使用指定token直接连接（登录成功后可直接传入token，避免storage写入时序问题）
   */
  connectWithToken(token: string) {
    if (!token) {
      this.scheduleTokenRetry()
      return
    }
    // 取消可能存在的token重试定时器
    if (this.tokenRetryTimer) {
      clearTimeout(this.tokenRetryTimer)
      this.tokenRetryTimer = null
    }
    this.tokenRetryCount = 0
    this.doConnect(token)
  }

  /**
   * 内部连接实现
   */
  private doConnect(token: string) {
    if (this.connected || this.connecting) {
      return
    }

    this.cleanup()
    this.connecting = true
    this.manuallyClosed = false

    // 根据当前环境选择ws地址
    const wsUrl = this.buildWsUrl(token)
    console.log('[WS] 正在连接:', wsUrl.replace(/token=[^&]*/, 'token=***'))

    try {
      this.socketTask = uni.connectSocket({
        url: wsUrl,
        complete: () => {},
      })

      this.socketTask.onOpen(() => {
        console.log('[WS] 连接成功')
        this.connected = true
        this.connecting = false
        this.reconnectCount = 0
        this.tokenRetryCount = 0
        this.startHeartbeat()
      })

      this.socketTask.onMessage((res) => {
        try {
          if (res.data === 'pong') return
          const data: WSMessage = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          console.log('[WS] 收到消息:', data)
          this.handleMessage(data)
        } catch (e) {
          console.warn('[WS] 解析消息失败:', res.data)
        }
      })

      this.socketTask.onError((err) => {
        console.error('[WS] 连接错误:', err)
        this.connected = false
        this.connecting = false
      })

      this.socketTask.onClose(() => {
        console.log('[WS] 连接关闭')
        this.connected = false
        this.connecting = false
        this.stopHeartbeat()

        if (!this.manuallyClosed) {
          const token = this.getToken()
          if (token) {
            this.scheduleReconnect()
          } else {
            this.scheduleTokenRetry()
          }
        }
      })
    } catch (e) {
      console.error('[WS] 创建连接失败:', e)
      this.connecting = false
      this.scheduleReconnect()
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.manuallyClosed = true
    this.cleanup()
  }

  /**
   * 是否连接中
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => this.off(type, handler)
  }

  /**
   * 移除消息处理器
   */
  off(type: string, handler: MessageHandler) {
    this.handlers.get(type)?.delete(handler)
  }

  private getToken(): string {
    try {
      return uni.getStorageSync('wzz_token') || ''
    } catch {
      return ''
    }
  }

  private buildWsUrl(token: string): string {
    // #ifdef H5
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws/user/orders?token=${encodeURIComponent(token)}`
    // #endif
    // #ifndef H5
    // APP/小程序环境，使用配置的后端地址
    const baseUrl = (uni.getStorageSync('baseUrl') || 'http://localhost:8080').replace(/^http/, 'ws')
    return `${baseUrl}/ws/user/orders?token=${encodeURIComponent(token)}`
    // #endif
  }

  /**
   * token不存在时的延迟重试（登录后token可能尚未写入storage）
   */
  private scheduleTokenRetry() {
    if (this.manuallyClosed) return
    if (this.tokenRetryTimer) return
    if (this.tokenRetryCount >= this.maxTokenRetryCount) {
      console.warn(`[WS] 等待token重试${this.maxTokenRetryCount}次后仍无token，停止重试`)
      return
    }
    this.tokenRetryCount++
    console.log(`[WS] 无token，${this.tokenRetryInterval / 1000}秒后第${this.tokenRetryCount}次重试...`)
    this.tokenRetryTimer = setTimeout(() => {
      this.tokenRetryTimer = null
      this.connect()
    }, this.tokenRetryInterval)
  }

  private handleMessage(msg: WSMessage) {
    // 通知所有类型处理器
    this.handlers.get('*')?.forEach((h) => h(msg))
    // 通知特定类型处理器
    if (msg.type) {
      this.handlers.get(msg.type)?.forEach((h) => h(msg))

      // 骑手位置高频消息：通过全局事件总线派发，不弹通知
      if (msg.type === 'RIDER_LOCATION') {
        try {
          uni.$emit('riderLocation', msg)
        } catch (e) {
          // ignore
        }
        return
      }

      // 默认处理：显示订单状态变更通知
      this.showNotification(msg)
    }
  }

  /**
   * 显示订单状态通知
   */
  private showNotification(msg: WSMessage) {
    // 高频静默消息不弹通知
    if (SILENT_MESSAGE_TYPES.has(msg.type)) {
      return
    }

    const content = msg.content || STATUS_CONTENT_MAP[msg.type] || '订单状态更新'
    const title = '订单通知'

    // 震动提示
    try {
      uni.vibrateShort({ type: 'light' })
    } catch (e) {
      // ignore
    }

    // 显示Toast通知（不阻断操作）
    try {
      uni.showToast({
        title: content,
        icon: 'none',
        duration: 3000,
      })
    } catch (e) {
      // ignore
    }

    // 如果在订单详情页或订单列表页，触发页面刷新
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (currentPage) {
        const route = (currentPage as any).route || ''
        if (route.includes('order/detail') || route.includes('order/list')) {
          // 通知页面刷新
          uni.$emit('orderStatusChanged', msg)
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.socketTask && this.connected) {
        try {
          this.socketTask.send({ data: 'ping' })
        } catch (e) {
          console.warn('[WS] 发送心跳失败')
        }
      }
    }, this.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectCount >= this.maxReconnectCount) {
      console.warn('[WS] 达到最大重连次数，停止重连')
      return
    }
    if (this.reconnectTimer) return

    // 重连前先检查token
    const token = this.getToken()
    if (!token) {
      this.scheduleTokenRetry()
      return
    }

    this.reconnectCount++
    const delay = Math.min(this.reconnectInterval * this.reconnectCount, 30000)
    console.log(`[WS] ${delay / 1000}秒后尝试第${this.reconnectCount}次重连...`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private cleanup() {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.tokenRetryTimer) {
      clearTimeout(this.tokenRetryTimer)
      this.tokenRetryTimer = null
    }
    if (this.socketTask) {
      try {
        this.socketTask.close({})
      } catch (e) {
        // ignore
      }
      this.socketTask = null
    }
  }
}

export const wsService = new UniWebSocketService()
