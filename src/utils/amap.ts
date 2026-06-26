/**
 * 高德地图工具类
 * H5端通过动态script加载高德地图JS API
 * 非H5端使用uni原生能力
 */

const AMAP_KEY = '6c5dac8fc9af3ca41f8b49736264c10e'
const AMAP_PLUGINS = 'AMap.Geolocation,AMap.Driving'

let amapLoadPromise: Promise<any> | null = null

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
  const EARTH_RADIUS = 6371000 // 地球半径（米）
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
 * @param lng 经度
 * @param lat 纬度
 * @param name 地点名称
 * @param address 地址
 */
export function openNavigation(
  lng: number,
  lat: number,
  name?: string,
  address?: string
): void {
  // #ifdef H5
  if (typeof window !== 'undefined' && (window as any).AMap) {
    // H5 端跳转到高德地图 Web 导航
    const url = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name || '目的地')}&mode=car&policy=1&src=weizhenzu&coordinate=gaode&callnative=1`
    window.open(url, '_blank')
    return
  }
  // H5 端未加载AMap时降级使用uni.openLocation（部分H5浏览器支持）
  // #endif

  uni.openLocation({
    longitude: Number(lng),
    latitude: Number(lat),
    name: name || '位置',
    address: address || '',
    scale: 16,
    fail: (err: any) => {
      console.error('打开地图失败:', err)
      uni.showToast({ title: '无法打开地图', icon: 'none' })
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
