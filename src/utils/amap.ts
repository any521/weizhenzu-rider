import { message } from './message'

/**
 * 高德地图工具类
 * H5端通过动态script加载高德地图JS API
 * 非H5端使用uni原生能力
 *
 * 重要说明：
 * 1. 2021年12月之后创建的高德key必须配合安全密钥(securityJsCode)使用
 * 2. 或在高德开放平台控制台为该key配置"域名白名单"（如 localhost、127.0.0.1）
 * 3. 否则会报 INVALID_USER_SCODE 错误
 * 4. 控制台地址：https://console.amap.com/dev/key/app
 */

// 高德Web端JS API key（与manifest.json中sdkConfigs.maps.amap.key保持一致）
const AMAP_KEY = '8a7944b39971ba616fe55a9f85dffffa'
// 高德地图 Web端 JS API 安全密钥
// 获取方式：高德开放平台控制台 > 应用管理 > 我的申请 > 对应应用 > 安全密钥
// 如果已在控制台为key配置了"域名白名单"（如 localhost），此处可留空字符串
const AMAP_SECURITY_CODE = '7ace682b77e4a3e373591681eee518aa'
const AMAP_PLUGINS = 'AMap.Geolocation,AMap.Driving,AMap.PlaceSearch,AMap.Geocoder,AMap.GeometryUtil'

let amapLoadPromise: any = null

/**
 * 动态加载高德地图 JS API（仅 H5 端）
 * 多次调用只会加载一次，返回同一个 Promise
 */
export function loadAMap(): Promise<any> {
  // #ifndef H5
  return Promise.reject(new Error('非H5端不支持loadAMap，请使用openNavigation'))
  // #endif

  // #ifdef H5
  if (amapLoadPromise) {
    return amapLoadPromise
  }

  amapLoadPromise = new Promise((resolve, reject) => {
    // 如果已通过其他方式加载
    if (typeof window !== 'undefined' && (window as any).AMap) {
      resolve((window as any).AMap)
      return
    }

    // 设置安全密钥（必须在加载AMap脚本之前设置）
    if (AMAP_SECURITY_CODE && AMAP_SECURITY_CODE !== 'your_security_js_code_here') {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: AMAP_SECURITY_CODE,
      }
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=${AMAP_PLUGINS}`

    script.onload = () => {
      if ((window as any).AMap) {
        resolve((window as any).AMap)
      } else {
        reject(new Error('高德地图加载失败'))
      }
    }
    script.onerror = () => {
      amapLoadPromise = null
      reject(new Error('高德地图脚本加载失败'))
    }

    document.head.appendChild(script)
  })

  return amapLoadPromise
  // #endif
}

/**
 * 计算两点之间的距离（米）
 * 优先使用 AMap.GeometryUtil，兜底使用 Haversine 公式
 */
export function calculateDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  if (
    typeof lng1 !== 'number' ||
    typeof lat1 !== 'number' ||
    typeof lng2 !== 'number' ||
    typeof lat2 !== 'number'
  ) {
    return 0
  }

  // #ifdef H5
  try {
    const AMap = (window as any).AMap
    if (AMap && AMap.GeometryUtil && typeof AMap.GeometryUtil.distance === 'function') {
      const d = AMap.GeometryUtil.distance([lng1, lat1], [lng2, lat2])
      if (typeof d === 'number' && !isNaN(d) && d >= 0) {
        return Math.round(d)
      }
    }
  } catch (e) {
    // 兜底用 Haversine
  }
  // #endif

  return haversineDistance(lng1, lat1, lng2, lat2)
}

/**
 * Haversine 公式计算两点间距离（米）
 */
function haversineDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const EARTH_RADIUS = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(EARTH_RADIUS * c)
}

/**
 * 打开原生地图导航（非H5端）
 */
export function openNavigation(
  lng: number,
  lat: number,
  name?: string,
  address?: string
): void {
  // #ifdef H5
  if (typeof window !== 'undefined') {
    const url = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name || '目的地')}&mode=car&policy=1&src=weizhenzu&coordinate=gaode&callnative=1`
    window.open(url, '_blank')
    return
  }
  // #endif

  uni.openLocation({
    longitude: Number(lng),
    latitude: Number(lat),
    name: name || '位置',
    address: address || '',
    scale: 16,
    fail: (err: any) => {
      console.error('打开地图失败:', err)
      message.error('无法打开地图')
    },
  })
}

/**
 * 格式化距离显示
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}米`
  }
  return `${(meters / 1000).toFixed(1)}公里`
}
