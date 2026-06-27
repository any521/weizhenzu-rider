/**
 * 格式化工具
 */
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

/** 格式化金额 (分 → 元) */
export const formatMoney = (cents: number | string | undefined | null, withSymbol = true): string => {
  const n = Number(cents || 0) / 100
  return (withSymbol ? '¥' : '') + n.toFixed(2)
}

/** 格式化时间 */
export const formatTime = (date: string | Date | undefined | null, fmt = 'YYYY-MM-DD HH:mm'): string => {
  if (!date) return ''
  return dayjs(date).format(fmt)
}

/** 相对时间 */
export const fromNow = (date: string | Date | undefined | null): string => {
  if (!date) return ''
  const d = dayjs(date)
  const diff = dayjs().diff(d, 'minute')
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff}分钟前`
  if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
  if (diff < 10080) return `${Math.floor(diff / 1440)}天前`
  return d.format('YYYY-MM-DD')
}

/** 手机号脱敏 */
export const maskPhone = (phone: string | undefined | null): string => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/** 订单状态文案（新状态码映射） */
export const ORDER_STATUS_MAP: Record<number, { text: string; type: string; icon: string }> = {
  0:  { text: '待支付',   type: 'warning', icon: 'pay' },
  1:  { text: '待接单',   type: 'warning', icon: 'shop' },
  2:  { text: '商家备餐中', type: 'warning', icon: 'cooking' },
  3:  { text: '骑手已接单', type: 'primary', icon: 'bike' },
  4:  { text: '商家备餐中', type: 'warning', icon: 'cooking' }, // 旧数据兼容：WAITING_RIDER已废弃，统一显示为商家备餐中
  5:  { text: '配送中',   type: 'danger',  icon: 'package' },
  6:  { text: '已送达',   type: 'success', icon: 'check' },
  7:  { text: '已完成',   type: 'default', icon: 'check' },
  8:  { text: '已取消',   type: 'muted',   icon: 'close' },
  9:  { text: '退款中',   type: 'danger',  icon: 'refund' },
  10: { text: '已退款',   type: 'muted',   icon: 'refund' },
  11: { text: '骑手已到店', type: 'primary', icon: 'location' },
}

/** 订单状态文案 */
export const orderStatusText = (status: number): string => {
  return ORDER_STATUS_MAP[status]?.text ?? '未知'
}

/** 订单状态类型（用于颜色） */
export const orderStatusType = (status: number): string => {
  return ORDER_STATUS_MAP[status]?.type ?? 'default'
}

/** 订单状态图标 */
export const orderStatusIcon = (status: number): string => {
  return ORDER_STATUS_MAP[status]?.icon ?? 'package'
}

/** 格式化距离（米 → 友好显示） */
export const formatDistance = (meters: number | undefined | null): string => {
  if (meters == null || isNaN(Number(meters))) return '计算中...'
  const m = Number(meters)
  if (m < 1000) return `${Math.round(m)}米`
  return `${(m / 1000).toFixed(1)}公里`
}
