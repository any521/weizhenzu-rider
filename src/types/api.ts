/**
 * 通用 API 类型定义
 */

/** 通用接口返回结构 */
export interface ApiResult<T = any> {
  code: number
  message: string
  data: T
}

/** 前端分页查询返回结构（list/pageNum/pageSize） */
export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
  pages?: number
}

/** 后端原始分页结构（records/current/size） */
export interface PageResultBackend<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages?: number
}

/** 登录成功返回（与后端 LoginVO 保持一致） */
export interface LoginVO {
  token: string
  refreshToken: string
  userId: number | string
  nickname: string
  avatar?: string
  userType?: number
}

/** 用户信息（前端展示用） */
export interface UserVO {
  id: number | string
  nickname: string
  phone?: string
  email?: string
  phoneBound?: boolean
  avatar?: string
  gender?: number
  birthday?: string
  vip?: string
  level?: string
  stats?: Record<string, number>
}

/** 收货地址（前端展示用） */
export interface AddressVO {
  id: number | string
  name: string
  phone: string
  region: string
  address: string
  tag?: string
  default?: boolean
}

/** 收货地址请求 DTO（与后端 AddressDTO 保持一致） */
export interface AddressDTO {
  id?: number | string
  contactName: string
  contactPhone: string
  province: string
  city: string
  district: string
  detail: string
  longitude?: number
  latitude?: number
  tag?: string
  isDefault?: number
}

/** 商家分类 */
export interface MerchantCategoryVO {
  id: number | string
  name: string
  icon?: string
  color?: string
}

/** 商家促销标签 */
export interface PromoItem {
  type: number
  text: string
}

/** 商家信息（后端 MerchantVO 映射） */
export interface MerchantVO {
  id: number | string
  name: string
  logo?: string
  /** 商家封面/头像图片URL（后端可能返回 coverUrl/cover/avatar/image 等字段） */
  coverUrl?: string
  cover?: string
  avatar?: string
  image?: string
  categoryId?: number | string
  categoryName?: string
  description?: string
  notice?: string
  province?: string
  city?: string
  district?: string
  address?: string
  longitude?: number
  latitude?: number
  deliveryRadius?: number
  minOrderAmount?: number
  deliveryFee?: number
  packingFee?: number
  openTime?: string
  isOpen?: number
  status?: number
  rating?: number
  monthSales?: number
  distance?: number
  expectedTime?: string
  deliveryTime?: string
  perCapita?: number
  promos?: PromoItem[]
  categories?: DishCategoryVO[]
  /** 是否支持外卖: 1=支持, 0=不支持 */
  supportDelivery?: number
  /** 是否支持自取: 1=支持, 0=不支持 */
  supportPickup?: number
}

/** 前端商家卡片展示用 */
export interface MerchantCardVO {
  id: number | string
  name: string
  logo: string
  bg: string
  /** 商家图片URL（封面/头像），有值时优先显示图片 */
  imageUrl?: string
  rating: number
  monthlySales: number
  minOrder: number
  deliveryFee: number
  deliveryTime: string
  distance: string
  tags: { type: string; text: string }[]
  promo: string
  perCapita?: number
  top?: boolean
  /** 是否支持外卖: 1=支持, 0=不支持 */
  supportDelivery?: number
  /** 是否支持自取: 1=支持, 0=不支持 */
  supportPickup?: number
}

/** 菜品规格 */
export interface DishSpecVO {
  id: number | string
  dishId: number | string
  name: string
  priceDiff: number
  stock: number
  status?: number
}

/** 菜品信息 */
export interface DishVO {
  id: number | string
  merchantId: number | string
  name: string
  description?: string
  image?: string
  images?: string[]
  price: number
  originalPrice?: number
  stock?: number
  monthSales?: number
  totalSales?: number
  rating?: number
  tags?: string[]
  spicy?: number
  status?: number
  sort?: number
  specs?: DishSpecVO[]
}

/** 前端菜品卡片展示用 */
export interface DishCardVO {
  id: number | string
  merchantId: number | string
  name: string
  desc: string
  sales: number
  rating: number
  price: number
  originalPrice?: number
  tags: { type: string; text: string }[]
  bg: string
  /** 菜品图片URL，有值时优先显示图片 */
  imageUrl?: string
  qty: number
}

/** 菜品分类（含菜品列表） */
export interface DishCategoryVO {
  id: number | string
  merchantId?: number | string
  name: string
  sort?: number
  status?: number
  dishes?: DishVO[]
}

/** 推荐菜品 */
export interface RecommendDishVO {
  id: number | string
  name: string
  merchantId: number | string
  merchantName: string
  image?: string
  price: number
  monthSales?: number
  rating?: number
  reason?: string
  bg?: string
  /** 菜品图片URL，有值时优先显示图片 */
  imageUrl?: string
}

/** 购物车项 */
export interface CartItemVO {
  id: number | string
  merchantId: number | string
  dishId: number | string
  dishName: string
  dishImage?: string
  specId?: number | string
  specName?: string
  unitPrice: number
  quantity: number
  subtotal: number
}

/** 购物车 */
export interface CartVO {
  merchantId?: number | string
  merchantName?: string
  items: CartItemVO[]
  totalAmount: number
  deliveryFee?: number
  packingFee?: number
  payAmount?: number
  minOrderAmount?: number
  reachMinAmount?: boolean
}

/** 订单项 */
export interface OrderItemVO {
  id?: number | string
  dishId: number | string
  dishName?: string
  dishImage?: string
  specId?: number | string
  specName?: string
  price: number
  quantity: number
  subtotal?: number
}

/** 订单创建响应 */
export interface OrderCreateVO {
  id: number | string
  orderNo: string
  status: number
  statusDesc: string
  payAmount: number
  expireTime?: string
}

/** 订单详情 */
export interface OrderVO {
  id: number | string
  orderNo: string
  merchantId?: number | string
  merchantName?: string
  merchantLogo?: string
  status: number
  statusDesc: string
  payStatus?: number
  payType?: number
  items: OrderItemVO[]
  goodsAmount?: number
  deliveryFee?: number
  packingFee?: number
  discountAmount?: number
  payAmount: number
  remark?: string
  address?: AddressDTO
  createdAt?: string
  payTime?: string
  deliverTime?: string
  receiveTime?: string
  cancelTime?: string
  cancelReason?: string
  riderName?: string
  riderPhone?: string
  expectedTime?: string
}

/** 支付信息 */
export interface PaymentVO {
  paymentNo: string
  orderId?: number | string
  payType: number
  payUrl?: string
  paid?: boolean
  thirdPartyNo?: string
  expireTime?: string
  status?: number
}

/** 退款详情 */
export interface RefundVO {
  id: number | string
  refundNo: string
  orderId?: number | string
  status: number
  statusDesc: string
  amount: number
  reason: string
  applyTime?: string
  images?: string[]
  reply?: string
  replyTime?: string
  cancelable?: boolean
  timeline?: { text: string; time?: string; done?: boolean }[]
}

/** 配送轨迹 */
export interface DeliveryStepVO {
  name: string
  time?: string
  done: boolean
}

/** 配送跟踪 */
export interface DeliveryVO {
  orderId: number | string
  status: number
  statusDesc: string
  steps: DeliveryStepVO[]
  rider?: {
    id?: number
    name?: string
    avatar?: string
    phone?: string
    rating?: number
  }
  merchant?: {
    name?: string
    address?: string
    phone?: string
  }
  address?: AddressDTO
  expectedTime?: string
}

/** 优惠券 */
export interface CouponVO {
  id: number | string
  name: string
  type: number
  typeDesc?: string
  amount?: number
  threshold?: number
  discount?: number
  maxDiscount?: number
  totalCount?: number
  receivedCount?: number
  usedCount?: number
  perLimit?: number
  validType?: number
  validStart?: string
  validEnd?: string
  validDays?: number
  scope?: number
  status?: number
  canReceive?: boolean
}

/** 评价 */
export interface ReviewVO {
  id: number | string
  userId?: number | string
  nickname?: string
  avatar?: string
  orderId?: number | string
  merchantId?: number | string
  dishId?: number | string
  rating: number
  tasteScore?: number
  packingScore?: number
  deliveryScore?: number
  content?: string
  images?: string[]
  tags?: string[]
  anonymous?: number
  reply?: string
  createdAt?: string
}

/** 通用业务错误码（与后端 ResultCode 保持一致） */
export enum ErrorCode {
  SUCCESS = 200,
  FAIL = 500,
  PARAM_ERROR = 400,

  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,

  // 用户业务 1xxxx
  USER_NOT_FOUND = 10001,
  USER_DISABLED = 10002,
  PHONE_FORMAT_ERROR = 10003,
  SMS_CODE_ERROR = 10004,
  SMS_CODE_FREQUENT = 10005,

  // 邮箱与手机号绑定业务
  EMAIL_FORMAT_ERROR = 10006,
  EMAIL_NOT_FOUND = 10007,
  EMAIL_EXISTS = 10008,
  PHONE_NOT_BOUND = 10009,
  PHONE_ALREADY_BOUND = 10010,
  EMAIL_SEND_FAIL = 10011,
  ACCOUNT_AUDITING = 10012,
}
