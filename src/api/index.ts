/**
 * 统一 API 接口 - C 端用户
 */
import { get, post, put, del } from '@/utils/request'
import type {
  LoginVO,
  UserVO,
  AddressVO,
  AddressDTO,
  PageResult,
  PageResultBackend,
  MerchantVO,
  MerchantCardVO,
  MerchantCategoryVO,
  DishVO,
  DishCategoryVO,
  RecommendDishVO,
  CartVO,
  CartItemVO,
  CartGroupVO,
  OrderVO,
  OrderCreateVO,
  PaymentVO,
  RefundVO,
  DeliveryVO,
  ReviewVO,
  CouponVO,
} from '@/types/api'
import {
  addressDtoToVo,
  addressListDtoToVo,
  addressVoToDto,
  pageBackendToFrontend,
  merchantListVoToCard,
} from '@/utils/dataTransform'

// ==================== 认证 ====================
export const sendSmsCode = (phone: string, scene: string = 'LOGIN') =>
  post('/api/user/auth/sms-code', { phone, scene })

export const smsLogin = (phone: string, code: string): Promise<LoginVO> =>
  post('/api/user/auth/login/sms', { phone, code })

export const passwordLogin = (phone: string, password: string): Promise<LoginVO> =>
  post('/api/user/auth/login/password', { phone, password })

/** 发送邮箱验证码 */
export const sendEmailCode = (email: string, scene: string = 'LOGIN') => {
  // BIND_PHONE 场景后端从登录上下文获取真实邮箱，无需前端传 email
  const payload = scene === 'BIND_PHONE' ? { scene } : { email, scene }
  return post('/api/user/auth/email-code', payload)
}

/** 邮箱登录（未注册自动创建账号） */
export const emailLogin = (email: string, code: string): Promise<LoginVO> =>
  post('/api/user/auth/login/email', { email, code })

/** 邮箱注册 */
export const emailRegister = (data: { email: string; code: string; nickname?: string }) =>
  post('/api/user/auth/register/email', data)

/** 绑定手机号（需邮箱验证码二次确认） */
export const bindPhone = (data: { phone: string; code: string }) =>
  post('/api/user/auth/bind-phone', data)

/** 解绑手机号 */
export const unbindPhone = () => del('/api/user/profile/phone')

export const refreshToken = (refreshToken: string) =>
  post('/api/user/auth/refresh', { refreshToken })

export const logout = () => post('/api/user/auth/logout')

// ==================== 用户 ====================
export const getUserProfile = (): Promise<UserVO> => get('/api/user/profile')

export const updateUserProfile = (data: Partial<UserVO>) => put('/api/user/profile', data)

export const updatePassword = (data: { oldPassword: string; newPassword: string }) =>
  put('/api/user/profile/password', data)

/** 上传图片（返回图片URL） */
export const uploadImage = (filePath: string): Promise<{ url: string }> => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('wzz_token') || ''
    const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080'
    uni.uploadFile({
      url: `${BASE_URL}/api/public/files/upload/image`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const body = JSON.parse(res.data)
          if (body.code === 200 && body.data) {
            // 兼容后端返回 {url} 或直接返回 URL 字符串
            const url = typeof body.data === 'string' ? body.data : body.data.url
            resolve({ url })
          } else {
            reject(new Error(body.message || '上传失败'))
          }
        } catch (e) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (err) => reject(err),
    })
  })
}

// ==================== 收货地址 ====================
export const getAddressList = async (): Promise<AddressVO[]> => {
  const list = await get<AddressDTO[]>('/api/user/addresses')
  return addressListDtoToVo(list)
}

export const getAddressDetail = async (id: number | string): Promise<AddressVO> => {
  const dto = await get<AddressDTO>(`/api/user/addresses/${id}`)
  return addressDtoToVo(dto)
}

export const getDefaultAddress = async (): Promise<AddressVO | null> => {
  try {
    const dto = await get<AddressDTO>('/api/user/addresses/default')
    return dto ? addressDtoToVo(dto) : null
  } catch (e) {
    return null
  }
}

export const addAddress = (data: Partial<AddressVO>) =>
  post('/api/user/addresses', addressVoToDto(data))

export const updateAddress = (id: number | string, data: Partial<AddressVO>) =>
  put(`/api/user/addresses/${id}`, addressVoToDto(data))

export const deleteAddress = (id: number | string) => del(`/api/user/addresses/${id}`)

export const setDefaultAddress = (id: number | string) => put(`/api/user/addresses/${id}/default`)

// ==================== 商家 ====================
export const getMerchantCategories = () => get<MerchantCategoryVO[]>('/api/user/merchants/categories')

export interface MerchantPageParams {
  current?: number
  size?: number
  categoryId?: number | string
  keyword?: string
  /** 用餐类型: 2=外卖, 3=自取（对应后端diningType: 1=堂食, 2=外卖, 3=自取） */
  diningType?: number
  /** 用户经度（用于距离计算） */
  lng?: number
  /** 用户纬度（用于距离计算） */
  lat?: number
}

export const getMerchantPage = async (params: MerchantPageParams): Promise<PageResult<MerchantCardVO>> => {
  const backend = await get<PageResultBackend<MerchantVO>>('/api/user/merchants', params)
  const page = pageBackendToFrontend(backend)
  return { ...page, list: merchantListVoToCard(page.list) }
}

export const getMerchantDetail = (id: number | string, lng?: number, lat?: number) =>
  get<MerchantVO>(`/api/user/merchants/${id}`, { lng, lat })

export const getMerchantMenu = (id: number | string) => get<DishCategoryVO[]>(`/api/user/merchants/${id}/menu`)

export const getMerchantReviews = async (merchantId: number | string, params?: { current?: number; size?: number }): Promise<PageResult<ReviewVO>> => {
  const backend = await get<PageResultBackend<ReviewVO>>(`/api/user/merchants/${merchantId}/reviews`, params)
  return pageBackendToFrontend(backend)
}

// ==================== 菜品 ====================
export const getDishPage = async (params: { current?: number; size?: number; platformCategoryId?: number | string; keyword?: string }): Promise<PageResult<DishVO>> => {
  const backend = await get<PageResultBackend<DishVO>>('/api/user/dishes', params)
  return pageBackendToFrontend(backend)
}

export interface FeaturedDishesParams {
  limit?: number
  /** 用餐类型: 2=外卖, 3=自取 */
  diningType?: number
}

export const getFeaturedDishes = (params: FeaturedDishesParams | number = {}) => {
  // 兼容旧的调用方式：getFeaturedDishes(5) 传入数字作为limit
  const queryParams = typeof params === 'number' ? { limit: params } : params
  return get<DishVO[]>('/api/user/dishes/featured', queryParams)
}

export const getDishDetail = (id: number | string) => get<DishVO>(`/api/user/dishes/${id}`)

export const getRecommendDishes = (size = 8) => get<RecommendDishVO[]>('/api/user/recommend/dishes', { size })

export const getDishReviews = async (dishId: number | string, params?: { current?: number; size?: number }): Promise<PageResult<ReviewVO>> => {
  const backend = await get<PageResultBackend<ReviewVO>>(`/api/user/dishes/${dishId}/reviews`, params)
  return pageBackendToFrontend(backend)
}

// ==================== 购物车 ====================
export const getCart = () => get<CartVO>('/api/user/cart')

export interface CartAddPayload {
  merchantId: number | string
  dishId: number | string
  specId?: number | string | null
  quantity: number
}

export const addToCart = (data: CartAddPayload) => post('/api/user/cart', data)

export interface CartUpdatePayload {
  quantity: number
}

export const updateCartItem = (id: number | string, data: CartUpdatePayload) => put(`/api/user/cart/${id}`, data)

export const removeCartItem = (id: number | string) => del(`/api/user/cart/${id}`)

export const clearCart = () => del('/api/user/cart')

// ==================== 订单 ====================
export interface OrderCreatePayload {
  merchantId: number | string
  addressId: number | string
  items: { dishId: number | string; specId?: number | string | null; quantity: number }[]
  userCouponId?: number | string
  remark?: string
  clientToken: string
  diningType?: number
}

export const createOrder = (data: OrderCreatePayload) =>
  post<OrderCreateVO>('/api/user/orders', data, { showLoading: true, loadingText: '提交中' })

// 订单预览：按地址计算真实金额（含超距配送费、打包费），不创建订单
export interface OrderPreviewPayload {
  merchantId: number | string
  addressId: number | string
  items: { dishId: number | string; specId?: number | string | null; quantity: number }[]
  userCouponId?: number | string
  diningType?: number
}

export interface OrderPreviewVO {
  merchantId: number | string
  totalAmount: number
  packingFee: number
  deliveryFee: number
  couponAmount: number
  payAmount: number
  diningType: number
  reachMinAmount: boolean
  minOrderAmount: number
}

export const previewOrder = (data: OrderPreviewPayload) =>
  post<OrderPreviewVO>('/api/user/orders/preview', data)

export const getOrderPage = async (params?: { status?: number; current?: number; size?: number }): Promise<PageResult<OrderVO>> => {
  const backend = await get<PageResultBackend<OrderVO>>('/api/user/orders', params)
  return pageBackendToFrontend(backend)
}

export const getOrderDetail = (id: number | string) => get<OrderVO>(`/api/user/orders/${id}`)

export const cancelOrder = (id: number | string, reason: string) =>
  post(`/api/user/orders/${id}/cancel`, { reason })

export const confirmReceive = (id: number | string) => post(`/api/user/orders/${id}/confirm`)

export const applyOrderRefund = (id: number | string, data: { reason: string; amount: number; images?: string[] }) =>
  createRefund({ orderId: id, ...data })

export const getOrderDelivery = (id: number | string) => get<DeliveryVO>(`/api/user/orders/${id}/delivery`)

// ==================== 支付 ====================
export const createPayment = (orderId: number | string, payType: number) =>
  post<PaymentVO>(`/api/user/payments/orders/${orderId}`, { payType }, { showLoading: true })

export const getPaymentStatus = (paymentNo: string, sync = false) =>
  get<PaymentVO>(`/api/user/payments/${paymentNo}${sync ? '?sync=true' : ''}`)

export const cancelPayment = (paymentNo: string) => post(`/api/user/payments/${paymentNo}/cancel`)

// ==================== 退款 ====================
export interface RefundCreatePayload {
  orderId: number | string
  reason: string
  amount: number
  images?: string[]
}

export const createRefund = (data: RefundCreatePayload) =>
  post<RefundVO>('/api/user/refunds', data)

export const getRefundList = async (params?: { current?: number; size?: number }): Promise<PageResult<RefundVO>> => {
  const backend = await get<PageResultBackend<RefundVO>>('/api/user/refunds', params)
  return pageBackendToFrontend(backend)
}

export const getRefundDetail = (id: number | string) => get<RefundVO>(`/api/user/refunds/${id}`)

export const cancelRefund = (id: number | string) => post(`/api/user/refunds/${id}/cancel`)

// ==================== 评价 ====================
export interface ReviewCreatePayload {
  orderId: number | string
  rating: number
  tasteScore?: number
  packingScore?: number
  deliveryScore?: number
  content?: string
  images?: string[]
  tags?: string[]
  anonymous?: number
}

export const createReview = (data: ReviewCreatePayload) => post('/api/user/reviews', data)

export const getMyReviews = async (params?: { current?: number; size?: number }): Promise<PageResult<ReviewVO>> => {
  const backend = await get<PageResultBackend<ReviewVO>>('/api/user/reviews', params)
  return pageBackendToFrontend(backend)
}

// ==================== 优惠券 ====================
export const getAvailableCoupons = (): Promise<CouponVO[]> => get<CouponVO[]>('/api/user/coupons/available')

export interface UsableCouponParams {
  merchantId?: number | string
  orderAmount?: number
}

export const getMyUsableCoupons = (params?: UsableCouponParams): Promise<any[]> =>
  get<any[]>('/api/user/coupons/usable', params)

export const getMyCoupons = (status?: number) => get('/api/user/coupons', status !== undefined ? { status } : {})

export const getMerchantCoupons = (merchantId: number | string) => get<CouponVO[]>(`/api/user/coupons/merchant/${merchantId}`)

export const receiveCoupon = (id: number | string) => post(`/api/user/coupons/${id}/receive`)

// ==================== 收藏 ====================
export const getFavorites = async (params?: { current?: number; size?: number }): Promise<PageResult<MerchantCardVO>> => {
  const backend = await get<PageResultBackend<MerchantVO>>('/api/user/favorites', params)
  const page = pageBackendToFrontend(backend)
  return { ...page, list: merchantListVoToCard(page.list) }
}

export const addFavorite = (merchantId: number | string) => post(`/api/user/favorites/${merchantId}`)

export const removeFavorite = (merchantId: number | string) => del(`/api/user/favorites/${merchantId}`)

export const isFavorite = (merchantId: number | string) => get<boolean>(`/api/user/favorites/${merchantId}/status`)

// ==================== 消息 ====================
export const getMessageList = (params: any) => get('/api/user/messages', params)

export const markMessageRead = (id: number | string) => put(`/api/user/messages/${id}/read`)

export const markAllMessagesRead = () => put('/api/user/messages/read-all')

// ==================== 导出类型别名（兼容旧代码） ====================
export type { CartItemVO, CartGroupVO }
