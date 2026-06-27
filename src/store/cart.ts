import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from '@/api'
import type { CartVO, CartItemVO, CartGroupVO } from '@/types/api'

export interface AddCartPayload {
  merchantId: number | string
  dishId: number | string
  specId?: number | string | null
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const cart = ref<CartVO | null>(null)
  const loading = ref(false)
  /** 当前用餐类型: 2=外卖, 3=自取（对应后端diningType） */
  const diningType = ref(2)

  function setDiningType(type: number) {
    diningType.value = type
  }

  /** 所有购物车项（扁平化，包含所有商家） */
  const items = computed(() => {
    if (cart.value?.groups && cart.value.groups.length > 0) {
      return cart.value.groups.flatMap(g => g.items)
    }
    return cart.value?.items || []
  })

  /** 按商家分组的购物车 */
  const groups = computed<CartGroupVO[]>(() => {
    if (cart.value?.groups && cart.value.groups.length > 0) {
      return cart.value.groups
    }
    // 兼容旧数据：如果没有groups但有items，则包装成单个group
    if (cart.value?.items && cart.value.items.length > 0) {
      const firstItem = cart.value.items[0]
      return [{
        merchantId: firstItem.merchantId,
        merchantName: cart.value.merchantName || '',
        merchantLogo: (cart.value as any).merchantLogo,
        items: cart.value.items,
        totalAmount: Number(cart.value.totalAmount || 0),
        deliveryFee: Number(cart.value.deliveryFee || 0),
        packingFee: Number(cart.value.packingFee || 0),
        payAmount: Number(cart.value.payAmount || 0),
        minOrderAmount: Number(cart.value.minOrderAmount || 0),
        reachMinAmount: cart.value.reachMinAmount ?? true,
      }]
    }
    return []
  })

  /** 购物车是否为空 */
  const isEmpty = computed(() => items.value.length === 0)

  /** 商家数量 */
  const merchantCount = computed(() => groups.value.length)

  // 兼容旧API：默认取第一个商家信息（FloatingCart/商家菜单等场景）
  const merchantId = computed(() => {
    if (cart.value?.merchantId) return cart.value.merchantId
    if (groups.value.length > 0) return groups.value[0].merchantId
    return undefined
  })
  const merchantName = computed(() => {
    if (cart.value?.merchantName) return cart.value.merchantName
    if (groups.value.length > 0) return groups.value[0].merchantName
    return ''
  })
  const totalCount = computed(() => {
    if (cart.value?.totalCount != null) return cart.value.totalCount
    return items.value.reduce((s, i) => s + i.quantity, 0)
  })
  const totalTypes = computed(() => items.value.length)
  const totalAmount = computed(() => {
    if (groups.value.length > 0) {
      return groups.value.reduce((s, g) => s + Number(g.totalAmount || 0), 0)
    }
    return Number(cart.value?.totalAmount || 0)
  })
  const deliveryFee = computed(() => {
    if (groups.value.length > 0) {
      return groups.value.reduce((s, g) => s + Number(g.deliveryFee || 0), 0)
    }
    return Number(cart.value?.deliveryFee || 0)
  })
  const packingFee = computed(() => {
    if (groups.value.length > 0) {
      return groups.value.reduce((s, g) => s + Number(g.packingFee || 0), 0)
    }
    return Number(cart.value?.packingFee || 0)
  })
  const payAmount = computed(() => {
    if (groups.value.length > 0) {
      return groups.value.reduce((s, g) => s + Number(g.payAmount || 0), 0)
    }
    return Number(cart.value?.payAmount || 0)
  })
  const minOrderAmount = computed(() => Number(cart.value?.minOrderAmount || 0))
  const reachMinAmount = computed(() => {
    if (groups.value.length > 0) {
      return groups.value.every(g => g.reachMinAmount !== false)
    }
    return cart.value?.reachMinAmount ?? totalAmount.value >= minOrderAmount.value
  })

  /** 获取指定商家的分组 */
  function getGroup(mid: number | string): CartGroupVO | undefined {
    return groups.value.find(g => String(g.merchantId) === String(mid))
  }

  /** 获取指定商家的商品列表 */
  function getItemsByMerchant(mid: number | string): CartItemVO[] {
    const g = getGroup(mid)
    return g ? g.items : []
  }

  /** 用于菜品详情/商家详情回显当前数量 */
  const qtyMap = computed(() => {
    const map: Record<string, number> = {}
    items.value.forEach((item) => {
      map[`${item.dishId}-${item.specId || ''}`] = item.quantity
    })
    return map
  })

  function getQty(dishId: number | string, specId?: number | string | null) {
    return qtyMap.value[`${dishId}-${specId || ''}`] || 0
  }

  async function fetchCart(showLoading = false) {
    loading.value = true
    try {
      cart.value = await getCart()
    } catch (e) {
      console.error('获取购物车失败', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(payload: AddCartPayload) {
    await addToCart(payload)
    await fetchCart()
  }

  async function changeQty(cartItemId: number | string, quantity: number) {
    if (quantity <= 0) {
      await removeCartItem(cartItemId)
    } else {
      await updateCartItem(cartItemId, { quantity })
    }
    await fetchCart()
  }

  async function remove(itemId: number | string) {
    await removeCartItem(itemId)
    await fetchCart()
  }

  async function clear() {
    await clearCart()
    cart.value = null
  }

  return {
    cart,
    loading,
    diningType,
    setDiningType,
    items,
    groups,
    isEmpty,
    merchantCount,
    merchantId,
    merchantName,
    totalCount,
    totalTypes,
    totalAmount,
    deliveryFee,
    packingFee,
    payAmount,
    minOrderAmount,
    reachMinAmount,
    qtyMap,
    getGroup,
    getItemsByMerchant,
    getQty,
    fetchCart,
    addItem,
    changeQty,
    remove,
    clear,
  }
})
