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
  /** 经度 */
  longitude?: number | string
  /** 纬度 */
  latitude?: number | string
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
  merchantName?: string
  merchantLogo?: string
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
  categoryName?: string
  platformCategoryId?: number | string
  platformCategoryName?: string
  status?: number
  sort?: number
  createTime?: string
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

/** 购物车分组（按商家分组） */
export interface CartGroupVO {
  merchantId: number | string
  merchantName: string
  merchantLogo?: string
  items: CartItemVO[]
  totalAmount: number
  deliveryFee?: number
  packingFee?: number
  payAmount: number
  minOrderAmount?: number
  reachMinAmount?: boolean
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
  totalCount?: number
  groups?: CartGroupVO[]
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
  /** 是否已评价 */
  isRated?: number
  /** 用户名称 */
  userName?: string
  /** 用户电话 */
  userPhone?: string
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

/** 骑手留言 */
export interface RiderMessageVO {
  id?: number
  content?: string
  time?: string
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
    /** 骑手当前经度 */
    lng?: number | string
    /** 骑手当前纬度 */
    lat?: number | string
    /** 骑手距离 */
    distance?: number
  }
  merchant?: {
    name?: string
    address?: string
    phone?: string
    /** 商家经度 */
    lng?: number | string
    /** 商家纬度 */
    lat?: number | string
  }
  /** 用户收货地址信息 */
  userInfo?: {
    address?: string
    /** 用户经度 */
    lng?: number | string
    /** 用户纬度 */
    lat?: number | string
    phone?: string
  }
  /** 骑手当前经度 */
  riderLng?: number | string
  /** 骑手当前纬度 */
  riderLat?: number | string
  /** 商家经度 */
  merchantLng?: number | string
  /** 商家纬度 */
  merchantLat?: number | string
  /** 用户收货地址经度 */
  userLng?: number | string
  /** 用户收货地址纬度 */
  userLat?: number | string
  /** 骑手到目的地距离（米） */
  distance?: number
  /** 骑手到商家距离（米） */
  distanceToMerchant?: number
  /** 骑手到用户距离（米） */
  distanceToUser?: number
  /** 导航目标：merchant=去商家取餐, user=送餐给用户 */
  navigationTarget?: 'merchant' | 'user'
  /** 用餐类型：1=外卖, 2=堂食 */
  diningType?: number
  /** 骑手最近留言 */
  recentMessages?: RiderMessageVO[]
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
  /** threshold 的别名，满减门槛 */
  minPoint?: number
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
  scopeIds?: (number | string)[]
  scopeName?: string
  status?: number
  canReceive?: boolean
  /** 是否已使用（我的优惠券中使用） */
  used?: boolean
}

/** 评价 */
export interface ReviewVO {
  id: number | string
  userId?: number | string
  /** 用户昵称 */
  userNickname?: string
  /** 用户头像 */
  userAvatar?: string
  orderId?: number | string
  merchantId?: number | string
  /** 商家名称 */
  merchantName?: string
  dishId?: number | string
  /** 骑手ID */
  deliveryManId?: number | string
  /** 骑手名称 */
  deliveryManName?: string
  /** 评价菜品名称列表 */
  dishNames?: string[]
  rating: number
  tasteScore?: number
  packingScore?: number
  deliveryScore?: number
  content?: string
  images?: string[]
  tags?: string[]
  anonymous?: number
  /** 商家回复 */
  merchantReply?: string
  /** 商家回复（别名） */
  reply?: string
  /** 商家回复时间 */
  merchantReplyTime?: string
  /** 评价状态：0隐藏 1公开 */
  status?: number
  /** 创建时间 */
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
