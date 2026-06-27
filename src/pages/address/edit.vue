<template>
  <view class="edit">
    <view class="form-card">
      <view class="form-item">
        <text class="label">联系人</text>
        <input v-model="form.name" placeholder="请输入联系人姓名" placeholder-class="placeholder" />
      </view>
      <view class="form-item">
        <text class="label">手机号</text>
        <input v-model="form.phone" type="number" maxlength="11" placeholder="请输入手机号" placeholder-class="placeholder" />
      </view>
      <!-- 地图选点 -->
      <view class="form-item location-item" @tap="chooseLocation">
        <text class="label">选择位置</text>
        <view class="location-info">
          <text v-if="locating" class="locating-text">打开地图中...</text>
          <text v-else-if="form.address && form.longitude && form.latitude" class="loc-success">
            📍 {{ form.region }} {{ form.address }}
          </text>
          <text v-else class="loc-placeholder">点击打开地图选择收货地址</text>
        </view>
        <text class="location-btn">地图选点</text>
      </view>
      <!-- 省市区选择器（地图选点后自动填充，也可手动修改） -->
      <picker
        mode="multiSelector"
        :value="multiIndex"
        :range="multiColumns"
        @change="onMultiChange"
        @columnchange="onColumnChange"
      >
        <view class="form-item">
          <text class="label">省市区</text>
          <text class="region-text" :class="{ placeholder: !form.region }">{{ form.region || '请选择省/市/区' }}</text>
          <text class="arrow">›</text>
        </view>
      </picker>
      <view class="form-item">
        <text class="label">详细地址</text>
        <input v-model="form.address" placeholder="街道、楼栋、门牌号等" placeholder-class="placeholder" />
      </view>
      <!-- 坐标显示 -->
      <view v-if="form.longitude && form.latitude" class="form-item coord-item">
        <text class="label">坐标</text>
        <text class="coord-text">{{ Number(form.longitude).toFixed(6) }}, {{ Number(form.latitude).toFixed(6) }}</text>
      </view>
      <view class="form-item">
        <text class="label">地址标签</text>
        <view class="tag-group">
          <text
            v-for="t in tagOptions"
            :key="t"
            :class="['tag', form.tag === t && 'tag-active']"
            @tap="form.tag = t"
          >{{ t }}</text>
        </view>
      </view>
      <view class="form-item switch-item" @tap="form.default = !form.default">
        <text class="label">设为默认地址</text>
        <switch :checked="form.default" @change="onDefaultChange" color="#FF6B35" />
      </view>
    </view>
    <view :class="['save-btn', saving && 'save-disabled']" @tap="onSave">
      {{ saving ? '保存中...' : '保存地址' }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getAddressDetail, addAddress, updateAddress } from '@/api'
import { getRegionColumns, findRegionByAddress } from '@/data/regions.js'
import type { AddressVO } from '@/types/api'

const form = reactive<Partial<AddressVO>>({
  id: undefined,
  name: '',
  phone: '',
  region: '',
  address: '',
  longitude: undefined,
  latitude: undefined,
  tag: '家',
  default: false,
})
const tagOptions = ['家', '公司', '学校', '其他']
const saving = ref(false)
const locating = ref(false)
const editId = ref<number | string | null>(null)

// 多列选择器索引：[省, 市, 区]
const multiIndex = ref<[number, number, number]>([0, 0, 0])
// 多列选择器数据
const multiColumns = ref<string[][]>(getRegionColumns(0, 0))

/**
 * 根据已选region字符串初始化多列选择器索引
 */
function initMultiIndexFromRegion(region: string) {
  if (!region) {
    multiIndex.value = [0, 0, 0]
    multiColumns.value = getRegionColumns(0, 0)
    return
  }
  const parts = region.split(/\s+/)
  const [provinceName, cityName, districtName] = parts

  const provinces = multiColumns.value[0]
  const pIdx = Math.max(0, provinces.indexOf(provinceName))
  const cities = getRegionColumns(pIdx, 0)[1]
  const cIdx = Math.max(0, cities.indexOf(cityName))
  const districts = getRegionColumns(pIdx, cIdx)[2]
  const dIdx = Math.max(0, districts.indexOf(districtName))

  multiIndex.value = [pIdx, cIdx, dIdx]
  multiColumns.value = [provinces, cities, districts]
}

onLoad((q: any) => {
  if (q?.id) {
    editId.value = q.id
    loadDetail(editId.value)
  }
})

async function loadDetail(id: number | string) {
  try {
    uni.showLoading({ title: '加载中...' })
    const detail = await getAddressDetail(id)
    Object.assign(form, detail)
    if (detail.region) {
      initMultiIndexFromRegion(detail.region)
    }
  } catch (e) {
    console.error('加载地址详情失败', e)
  } finally {
    uni.hideLoading()
  }
}

/**
 * 打开地图选点
 * 跳转到自定义地图选点页面（/pages/address/map）
 * 该页面集成了真实高德地图和POI搜索，选点完成后通过Storage回传数据
 */
function chooseLocation() {
  if (locating.value) return
  locating.value = true

  // 监听地图页面返回的选点结果
  uni.$once('mapPoiSelected', (poi: any) => {
    console.log('地图选点结果', poi)
    if (!poi) {
      locating.value = false
      return
    }

    // 填充坐标
    form.longitude = poi.longitude
    form.latitude = poi.latitude

    // 解析地址
    const fullAddress = poi.address || ''
    const placeName = poi.name || ''

    // 尝试匹配省市区
    const matched = findRegionByAddress(fullAddress)
    if (matched) {
      form.region = `${matched.province} ${matched.city} ${matched.district}`.trim()
      initMultiIndexFromRegion(form.region)
      // 详细地址 = 地点名称 + 地址中除省市区外的部分
      const detailPart = fullAddress
        .replace(matched.province, '')
        .replace(matched.city, '')
        .replace(matched.district, '')
        .replace(/^[\s,，、]+/, '')
        .trim()
      if (placeName && detailPart) {
        form.address = `${placeName} ${detailPart}`
      } else {
        form.address = placeName || detailPart || fullAddress
      }
    } else {
      // 无法自动匹配省市区，仍然填充详细地址
      if (placeName && fullAddress) {
        form.address = fullAddress.includes(placeName)
          ? fullAddress
          : `${placeName} ${fullAddress}`
      } else {
        form.address = placeName || fullAddress
      }
      uni.showToast({
        title: '请确认或手动选择省市区',
        icon: 'none',
        duration: 2000,
      })
    }

    uni.showToast({ title: '位置选择成功', icon: 'success' })
    locating.value = false
  })

  // 跳转到自定义地图选点页面
  uni.navigateTo({
    url: '/pages/address/map',
    fail: (err) => {
      console.error('跳转地图页面失败', err)
      locating.value = false
      // 降级：尝试使用uni.chooseLocation
      fallbackChooseLocation()
    },
  })
}

/**
 * 降级方案：使用uni.chooseLocation
 */
function fallbackChooseLocation() {
  uni.chooseLocation({
    success: (res: any) => {
      console.log('降级地图选点结果', res)
      if (res.latitude && res.longitude) {
        form.longitude = res.longitude
        form.latitude = res.latitude
        const fullAddress = res.address || ''
        const placeName = res.name || ''
        if (placeName && fullAddress) {
          form.address = fullAddress.includes(placeName)
            ? fullAddress
            : `${placeName} ${fullAddress}`
        } else {
          form.address = placeName || fullAddress
        }
        uni.showToast({ title: '位置选择成功', icon: 'success' })
      }
    },
    fail: (err: any) => {
      console.error('地图选点失败', err)
      uni.showModal({
        title: '无法打开地图',
        content: '请检查高德地图key和安全密钥配置，或手动输入地址。',
        showCancel: false,
        confirmColor: '#FF6B35',
      })
    },
    complete: () => {
      locating.value = false
    },
  })
}

/**
 * 降级方案：直接获取当前位置坐标
 */
function fallbackGetLocation() {
  uni.getLocation({
    type: 'gcj02',
    isHighAccuracy: true,
    success: (res) => {
      form.longitude = res.longitude
      form.latitude = res.latitude
      uni.showToast({ title: '已获取当前位置坐标', icon: 'success' })
    },
    fail: () => {
      uni.showModal({
        title: '定位失败',
        content: '请检查是否开启了定位权限，或手动输入地址',
        showCancel: false,
        confirmColor: '#FF6B35',
      })
    },
  })
}

function onColumnChange(e: any) {
  const { column, value } = e.detail
  const idx = [...multiIndex.value] as [number, number, number]

  if (column === 0) {
    idx[0] = value
    idx[1] = 0
    idx[2] = 0
    const newColumns = getRegionColumns(idx[0], 0)
    multiColumns.value = newColumns
  } else if (column === 1) {
    idx[1] = value
    idx[2] = 0
    const newColumns = getRegionColumns(idx[0], idx[1])
    multiColumns.value = newColumns
  } else if (column === 2) {
    idx[2] = value
  }
  multiIndex.value = idx
}

function onMultiChange(e: any) {
  const value = e.detail.value as [number, number, number]
  const provinces = multiColumns.value[0]
  const cities = multiColumns.value[1]
  const districts = multiColumns.value[2]

  const province = provinces[value[0]] || ''
  const city = cities[value[1]] || ''
  const district = districts[value[2]] || ''

  form.region = [province, city, district].filter(Boolean).join(' ')
  multiIndex.value = value
}

function onDefaultChange(e: any) {
  form.default = !!e.detail.value
}

async function onSave() {
  if (saving.value) return
  if (!form.name?.trim()) return uni.showToast({ title: '请输入联系人', icon: 'none' })
  if (!/^1[3-9]\d{9}$/.test(form.phone || '')) return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
  if (!form.region) return uni.showToast({ title: '请选择省市区', icon: 'none' })
  if (!form.address?.trim()) return uni.showToast({ title: '请输入详细地址', icon: 'none' })

  saving.value = true
  try {
    if (editId.value) {
      await updateAddress(editId.value, form)
    } else {
      await addAddress(form)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    console.error('保存地址失败', e)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.edit {
  min-height: 100vh;
  background: $bg;
  padding: calc(var(--status-bar-height, 20px) + 44px + 12px) 16px 24px;
}

.form-card {
  background: #fff;
  border-radius: $radius-md;
  overflow: hidden;
  box-shadow: $shadow;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid $border;
  min-height: 56px;
}

.form-item:last-child {
  border-bottom: none;
}

.label {
  width: 90px;
  color: $text;
  font-size: 14px;
  flex-shrink: 0;
}

input {
  flex: 1;
  font-size: 14px;
  color: $text;
}

.placeholder {
  color: $text-muted;
}

.region-text {
  flex: 1;
  font-size: 14px;
  color: $text;
}

.region-text.placeholder {
  color: $text-muted;
}

.arrow {
  font-size: 18px;
  color: $text-muted;
  margin-left: 8px;
}

/* 定位/地图选点样式 */
.location-item {
  cursor: pointer;
}

.location-info {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.locating-text {
  color: $primary;
}

.loc-success {
  color: $success;
}

.loc-placeholder {
  color: $text-muted;
}

.location-btn {
  flex-shrink: 0;
  margin-left: 8px;
  padding: 6px 14px;
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  font-size: 13px;
  border-radius: 14px;
  font-weight: 500;
}

/* 坐标显示 */
.coord-item {
  background: rgba(255, 107, 53, 0.03);
}

.coord-text {
  flex: 1;
  font-size: 12px;
  color: $text-muted;
  font-family: monospace;
}

.tag-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
}

.tag {
  padding: 6px 16px;
  border: 1px solid $border;
  border-radius: 16px;
  font-size: 13px;
  color: $text-light;
  background: $bg;
}

.tag-active {
  background: rgba(255, 107, 53, 0.1);
  border-color: $primary;
  color: $primary;
  font-weight: 500;
}

.switch-item {
  justify-content: space-between;
}

.save-btn {
  margin-top: 32px;
  height: 50px;
  line-height: 50px;
  text-align: center;
  background: linear-gradient(135deg, $primary, $primary-light);
  color: #fff;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.3);
}

.save-disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
