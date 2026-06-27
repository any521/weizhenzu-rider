<template>
  <view class="map-page">
    <!-- 顶部搜索栏 -->
    <view class="map-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="back-btn" @tap="goBack">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </view>
      <view class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索小区、写字楼、商户"
          confirm-type="search"
          @confirm="onSearch"
        />
        <view v-if="keyword" class="clear-btn" @tap="clearKeyword">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </view>
      </view>
    </view>

    <!-- 地图容器 -->
    <view class="map-container" ref="mapContainerRef">
      <!-- #ifdef H5 -->
      <view ref="amapMountRef" class="amap-mount"></view>
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <map
        class="map-view"
        :latitude="center.latitude"
        :longitude="center.longitude"
        :markers="markers"
        :scale="16"
        @regionchange="onRegionChange"
        show-location
      ></map>
      <!-- #endif -->
      <!-- 中心标记 -->
      <view class="center-marker">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="#FF6B35" stroke="#fff" stroke-width="1.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#fff" stroke="none"/>
        </svg>
      </view>
      <!-- 定位按钮 -->
      <view class="locate-btn" @tap="moveToCurrent">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        </svg>
      </view>
    </view>

    <!-- POI 列表 -->
    <scroll-view scroll-y class="poi-list" :style="{ height: listHeight + 'px' }">
      <view v-if="searching" class="poi-empty">
        <text>搜索中...</text>
      </view>
      <view v-else-if="!poiList.length" class="poi-empty">
        <text>{{ keyword ? '未找到相关地点' : '请搜索或拖动地图选择地址' }}</text>
      </view>
      <view
        v-for="(poi, idx) in poiList"
        :key="idx"
        :class="['poi-item', selectedIndex === idx && 'active']"
        @tap="selectPoi(idx)"
      >
        <view class="poi-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF6B35" stroke="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </view>
        <view class="poi-body">
          <view class="poi-name">{{ poi.name }}</view>
          <view class="poi-address">{{ poi.address }}</view>
        </view>
        <view v-if="selectedIndex === idx" class="poi-check">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </view>
      </view>
    </scroll-view>

    <!-- 底部确认 -->
    <view class="map-footer">
      <view class="footer-info">
        <text class="footer-name">{{ selected.name || '请选择地址' }}</text>
        <text class="footer-address">{{ selected.address || '' }}</text>
      </view>
      <view class="confirm-btn" @tap="confirm">确认选点</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { loadAMap } from '@/utils/amap'

const statusBarHeight = ref(20)
const amapMountRef = ref<any>(null)
const keyword = ref('')
const searching = ref(false)
const selectedIndex = ref(0)
const poiList = ref<any[]>([])
const listHeight = ref(260)

const center = ref({ latitude: 34.746611, longitude: 113.625328 }) // 默认郑州
const selectedPoi = ref<any>(null)

const selected = computed(() => poiList.value[selectedIndex.value] || selectedPoi.value || {})

const markers = computed(() => {
  if (!selectedPoi.value) return []
  return [{
    id: 1,
    latitude: selectedPoi.value.latitude,
    longitude: selectedPoi.value.longitude,
    title: selectedPoi.value.name,
  }]
})

let AMapInstance: any = null
let mapInstance: any = null
let placeSearch: any = null
let geocoder: any = null

onMounted(() => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 20
    const headerH = 52
    const mapH = 280
    const footerH = 90 + (sysInfo.safeAreaInsets?.bottom || 0)
    listHeight.value = sysInfo.windowHeight - statusBarHeight.value - headerH - mapH - footerH
  } catch (e) {}

  // 先获取位置，再初始化地图（避免并发导致DOM未就绪）
  getCurrentLocation()
  initMap()
})

async function initMap() {
  // #ifdef H5
  try {
    AMapInstance = await loadAMap()
    // 等待Vue渲染完成
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 通过ref获取uni-app的view挂载点，然后查找真实的DOM元素
    const mountEl = amapMountRef.value as any
    let mountDom: HTMLElement | null = null
    if (mountEl) {
      // uni-app H5端，view编译为uni-view元素
      mountDom = mountEl.$el || mountEl
      // 如果是uni-view自定义元素，获取其shadowRoot或子元素
      if (mountDom && mountDom.tagName && mountDom.tagName.toLowerCase().startsWith('uni-')) {
        // 尝试获取内部的div，如果没有则创建一个
        let innerDiv = mountDom.querySelector('.amap-inner-div')
        if (!innerDiv) {
          innerDiv = document.createElement('div')
          innerDiv.className = 'amap-inner-div'
          innerDiv.style.width = '100%'
          innerDiv.style.height = '100%'
          mountDom.appendChild(innerDiv)
        }
        mountDom = innerDiv
      }
    }

    // 兜底：通过class查找
    if (!mountDom || !mountDom.offsetWidth) {
      mountDom = document.querySelector('.amap-mount') as HTMLElement
      if (mountDom && mountDom.tagName && mountDom.tagName.toLowerCase().startsWith('uni-')) {
        let innerDiv = mountDom.querySelector('.amap-inner-div')
        if (!innerDiv) {
          innerDiv = document.createElement('div')
          innerDiv.className = 'amap-inner-div'
          innerDiv.style.width = '100%'
          innerDiv.style.height = '100%'
          mountDom.appendChild(innerDiv)
        }
        mountDom = innerDiv
      }
    }

    if (!mountDom) {
      console.error('地图挂载点不存在')
      return
    }

    mapInstance = new AMapInstance.Map(mountDom, {
      zoom: 16,
      center: [center.value.longitude, center.value.latitude],
      resizeEnable: true,
    })

    // 地图拖动结束后，反向地理编码获取地址
    mapInstance.on('moveend', () => {
      const c = mapInstance.getCenter()
      center.value = { latitude: c.getLat(), longitude: c.getLng() }
      reverseGeocode(c.getLng(), c.getLat())
    })

    // 初始化搜索插件
    AMapInstance.plugin(['AMap.PlaceSearch', 'AMap.Geocoder'], () => {
      placeSearch = new AMapInstance.PlaceSearch({
        pageSize: 20,
        pageIndex: 1,
        city: '全国',
      })
      geocoder = new AMapInstance.Geocoder()
    })
  } catch (e) {
    console.error('地图初始化失败', e)
    uni.showToast({ title: '地图加载失败，请检查网络', icon: 'none' })
  }
  // #endif
}

function getCurrentLocation() {
  uni.getLocation({
    type: 'gcj02',
    isHighAccuracy: true,
    success: (res) => {
      center.value = { latitude: res.latitude, longitude: res.longitude }
      moveToCurrent()
    },
    fail: () => {
      console.log('获取定位失败，使用默认位置')
    },
  })
}

function moveToCurrent() {
  // #ifdef H5
  if (mapInstance) {
    mapInstance.setCenter([center.value.longitude, center.value.latitude])
    reverseGeocode(center.value.longitude, center.value.latitude)
  }
  // #endif
}

function onRegionChange(e: any) {
  // #ifndef H5
  if (e.type === 'end' && e.detail && e.detail.centerLocation) {
    center.value = {
      latitude: e.detail.centerLocation.latitude,
      longitude: e.detail.centerLocation.longitude,
    }
    reverseGeocode(center.value.longitude, center.value.latitude)
  }
  // #endif
}

function onSearch() {
  if (!keyword.value.trim()) return
  searching.value = true
  poiList.value = []

  // #ifdef H5
  if (!AMapInstance || !placeSearch) {
    searching.value = false
    return
  }
  placeSearch.search(keyword.value, (status: string, result: any) => {
    searching.value = false
    if (status === 'complete' && result.info === 'OK' && result.poiList) {
      poiList.value = result.poiList.pois.map((poi: any) => ({
        name: poi.name,
        address: poi.address || poi.cityname + poi.adname,
        latitude: poi.location.getLat(),
        longitude: poi.location.getLng(),
      }))
      if (poiList.value.length) {
        selectedIndex.value = 0
        selectPoi(0)
      }
    } else {
      uni.showToast({ title: '未找到相关地点', icon: 'none' })
    }
  })
  // #endif

  // #ifndef H5
  searching.value = false
  uni.showToast({ title: '请在H5端使用搜索功能', icon: 'none' })
  // #endif
}

function reverseGeocode(lng: number, lat: number) {
  // #ifdef H5
  if (!AMapInstance || !geocoder) return
  geocoder.getAddress([lng, lat], (status: string, result: any) => {
    if (status === 'complete' && result.info === 'OK') {
      const addr = result.regeocode
      selectedPoi.value = {
        name: addr.formattedAddress || '当前位置',
        address: addr.formattedAddress || '',
        latitude: lat,
        longitude: lng,
      }
      poiList.value = [{
        name: addr.formattedAddress || '当前位置',
        address: addr.formattedAddress || '',
        latitude: lat,
        longitude: lng,
      }]
      selectedIndex.value = 0
    }
  })
  // #endif
}

function selectPoi(idx: number) {
  selectedIndex.value = idx
  const poi = poiList.value[idx]
  if (poi) {
    selectedPoi.value = poi
    center.value = { latitude: poi.latitude, longitude: poi.longitude }
    // #ifdef H5
    if (mapInstance) {
      mapInstance.setCenter([poi.longitude, poi.latitude])
    }
    // #endif
  }
}

function clearKeyword() {
  keyword.value = ''
  poiList.value = []
}

function confirm() {
  const poi = selected.value
  if (!poi.name) {
    uni.showToast({ title: '请选择地址', icon: 'none' })
    return
  }
  // 通过Storage传递
  uni.setStorageSync('wzz_map_selected_poi', poi)
  // 通过事件通知edit页面
  uni.$emit('mapPoiSelected', poi)
  uni.showToast({ title: '已选择地址', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 600)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.map-page {
  min-height: 100vh;
  background: $bg;
  display: flex;
  flex-direction: column;
}

.map-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px;
  background: $card;
  border-bottom: 1px solid $border;
  position: relative;
  z-index: 10;
}

.back-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: $bg;
  border-radius: 18px;
  padding: 0 12px;
  height: 36px;
}

.search-icon {
  color: $text-muted;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: $text;
  margin: 0 8px;
}

.clear-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
}

.map-container {
  height: 280px;
  position: relative;
  background: #e8f4f8;
  flex-shrink: 0;
}

.amap-mount,
.map-view {
  width: 100%;
  height: 100%;
}

.center-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 5;
}

.locate-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 5;
}

.poi-list {
  background: $bg;
  flex: 1;
}

.poi-empty {
  text-align: center;
  padding: 60px 0;
  font-size: 13px;
  color: $text-muted;
}

.poi-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: $card;
  margin: 0 16px 10px;
  border-radius: $radius-lg;
  padding: 14px;
  box-shadow: $shadow;
  border: 1px solid transparent;
}

.poi-item.active {
  border-color: $primary;
}

.poi-icon {
  color: $primary;
  flex-shrink: 0;
}

.poi-body {
  flex: 1;
  min-width: 0;
}

.poi-name {
  font-size: 14px;
  font-weight: 600;
  color: $text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poi-address {
  font-size: 12px;
  color: $text-muted;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poi-check {
  color: $primary;
  flex-shrink: 0;
}

.map-footer {
  background: $card;
  border-top: 1px solid $border;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.footer-info {
  flex: 1;
  min-width: 0;
}

.footer-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: $text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-address {
  display: block;
  font-size: 12px;
  color: $text-muted;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-btn {
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 11px 22px;
  border-radius: 22px;
  flex-shrink: 0;
}
</style>
