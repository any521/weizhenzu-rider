/**
 * 前后端数据转换工具
 * 处理请求数据的序列化、响应数据的反序列化以及字段映射差异
 */

import type {
  AddressVO,
  AddressDTO,
  PageResult,
  PageResultBackend,
  MerchantVO,
  MerchantCardVO,
  DishVO,
  DishCardVO,
  DishCategoryVO,
  RecommendDishVO,
} from '@/types/api'

/**
 * 将后端地址 DTO 转换为前端地址 VO
 */
export function addressDtoToVo(dto: AddressDTO): AddressVO {
  const region = [dto.province, dto.city, dto.district].filter(Boolean).join(' ')
  return {
    id: dto.id || '',
    name: dto.contactName,
    phone: dto.contactPhone,
    region,
    address: dto.detail,
    tag: dto.tag,
    default: dto.isDefault === 1,
  }
}

/**
 * 将前端地址 VO 转换为后端地址 DTO
 */
export function addressVoToDto(vo: Partial<AddressVO>): AddressDTO {
  const parts = (vo.region || '').split(/\s+/)
  const province = parts[0] || ''
  const city = parts[1] || ''
  const district = parts.slice(2).join(' ') || ''

  return {
    id: vo.id,
    contactName: vo.name || '',
    contactPhone: vo.phone || '',
    province,
    city,
    district,
    detail: vo.address || '',
    tag: vo.tag,
    isDefault: vo.default ? 1 : 0,
  }
}

/**
 * 批量转换后端地址列表
 */
export function addressListDtoToVo(list?: AddressDTO[]): AddressVO[] {
  return (list || []).map(addressDtoToVo)
}

/**
 * 布尔值转后端 0/1 数值
 */
export function boolToNumber(value?: boolean): number {
  return value ? 1 : 0
}

/**
 * 后端 0/1 数值转布尔值
 */
export function numberToBool(value?: number): boolean {
  return value === 1
}

/**
 * 将后端分页结构转换为前端分页结构
 */
export function pageBackendToFrontend<T>(backend: PageResultBackend<T>): PageResult<T> {
  return {
    list: backend.records || [],
    total: backend.total || 0,
    pageNum: backend.current || 1,
    pageSize: backend.size || 10,
    pages: backend.pages || 0,
  }
}

const MERCHANT_BG_LIST = [
  'linear-gradient(135deg, #FF6B35, #FFC107)',
  'linear-gradient(135deg, #4CAF50, #8BC34A)',
  'linear-gradient(135deg, #E91E63, #FF8A65)',
  'linear-gradient(135deg, #2196F3, #03A9F4)',
  'linear-gradient(135deg, #9C27B0, #BA68C8)',
  'linear-gradient(135deg, #FF5722, #FF8A65)',
  'linear-gradient(135deg, #FFC107, #FFD54F)',
]

/**
 * 将ID（字符串或数字）转换为安全的哈希索引，用于选择背景色等
 * 避免直接对大数字ID取模导致精度丢失
 */
function idToIndex(id: number | string | undefined, length: number): number {
  if (id === undefined || id === null || id === '') return 0
  const s = String(id)
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % length
}

function merchantBg(id?: number | string): string {
  return MERCHANT_BG_LIST[idToIndex(id, MERCHANT_BG_LIST.length)]
}

/**
 * 判断字符串是否为 URL（http/https 或 / 开头的路径）
 */
function isUrl(str?: string): boolean {
  if (!str) return false
  const s = str.trim()
  if (!s) return false
  return /^https?:\/\//i.test(s) || s.startsWith('/')
}

/**
 * 从商家对象中提取图片URL（兼容 coverUrl/cover/avatar/image/logo(URL) 等字段）
 */
function extractMerchantImage(m?: MerchantVO): string {
  if (!m) return ''
  // 优先使用明确的图片字段
  const candidates = [m.coverUrl, m.cover, m.avatar, m.image]
  for (const c of candidates) {
    if (isUrl(c)) return c!.trim()
  }
  // logo 字段如果是URL也使用
  if (isUrl(m.logo)) return m.logo!.trim()
  return ''
}

function merchantLogo(m?: MerchantVO): string {
  if (m?.logo && !isUrl(m.logo)) return m.logo
  // 根据名称首字生成兜底 Logo
  return (m?.name || '店').charAt(0)
}

function formatDistance(meters?: number): string {
  if (meters === undefined || meters === null) return ''
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * 将后端商家 VO 转换为前端商家卡片 VO
 */
export function merchantVoToCard(m?: MerchantVO): MerchantCardVO {
  const item = m || ({} as MerchantVO)
  return {
    id: item.id || '',
    name: item.name || '未知商家',
    logo: merchantLogo(item),
    bg: merchantBg(item.id),
    imageUrl: extractMerchantImage(item),
    rating: Number(item.rating || 0),
    monthlySales: item.monthSales || 0,
    minOrder: Number(item.minOrderAmount || 0),
    deliveryFee: Number(item.deliveryFee || 0),
    deliveryTime: item.deliveryTime || item.expectedTime || '30分钟',
    distance: formatDistance(item.distance),
    tags: (item.promos || []).map((p) => ({ type: 'primary', text: p.text })),
    promo: (item.promos || []).map((p) => p.text).join(' ') || '',
    perCapita: item.perCapita,
    top: Number(item.rating || 0) >= 4.8,
    supportDelivery: item.supportDelivery,
    supportPickup: item.supportPickup,
  }
}

export function merchantListVoToCard(list?: MerchantVO[]): MerchantCardVO[] {
  return (list || []).map(merchantVoToCard)
}

const DISH_BG_LIST = [
  'linear-gradient(135deg, #FF6B35, #FFC107)',
  'linear-gradient(135deg, #4CAF50, #8BC34A)',
  'linear-gradient(135deg, #E91E63, #FF8A65)',
  'linear-gradient(135deg, #2196F3, #03A9F4)',
  'linear-gradient(135deg, #9C27B0, #BA68C8)',
]

function dishBg(id?: number | string): string {
  return DISH_BG_LIST[idToIndex(id, DISH_BG_LIST.length)]
}

/**
 * 将后端菜品 VO 转换为前端菜品卡片 VO
 */
export function dishVoToCard(d?: DishVO, qty = 0): DishCardVO {
  const item = d || ({} as DishVO)
  const imgUrl = isUrl(item.image) ? item.image!.trim() : ''
  return {
    id: item.id || '',
    merchantId: item.merchantId || '',
    name: item.name || '未知菜品',
    desc: item.description || '',
    sales: item.monthSales || item.totalSales || 0,
    rating: Number(item.rating || 0),
    price: Number(item.price || 0),
    originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
    tags: (item.tags || []).map((t) => ({ type: 'primary', text: t })),
    bg: dishBg(item.id),
    imageUrl: imgUrl,
    qty,
  }
}

/**
 * 将后端菜品分类列表转换为前端菜单分类（带 qty 字段）
 */
export function menuCategoriesToCard(
  categories?: DishCategoryVO[],
  qtyMap?: Record<string, number>,
): { title: string; dishes: DishCardVO[]; icon: string }[] {
  const icons = ['fire', 'star', 'hotpot', 'salad', 'burger', 'coffee']
  return (categories || []).map((c, idx) => ({
    title: c.name || '其他',
    icon: icons[idx % icons.length],
    dishes: (c.dishes || []).map((d) => dishVoToCard(d, qtyMap?.[`${d.id}-${''}`] || 0)),
  }))
}

/**
 * 将后端推荐菜品列表转换为前端卡片（提取 imageUrl）
 */
export function recommendDishesToCard(list?: RecommendDishVO[]): RecommendDishVO[] {
  return (list || []).map((d) => {
    const imgUrl = isUrl(d.image) ? d.image!.trim() : ''
    return {
      ...d,
      imageUrl: imgUrl,
      bg: d.bg || dishBg(d.id),
    }
  })
}
