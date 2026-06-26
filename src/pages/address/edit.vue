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
      <!-- 省市区选择器：使用多列picker确保全平台兼容 -->
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
import { getRegionColumns } from '@/data/regions.js'
import type { AddressVO } from '@/types/api'

const form = reactive<Partial<AddressVO>>({
  id: undefined,
  name: '',
  phone: '',
  region: '',
  address: '',
  tag: '家',
  default: false,
})
const tagOptions = ['家', '公司', '学校', '其他']
const saving = ref(false)
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

function onColumnChange(e: any) {
  const { column, value } = e.detail
  const idx = [...multiIndex.value] as [number, number, number]

  if (column === 0) {
    // 省变化 -> 更新市和区
    idx[0] = value
    idx[1] = 0
    idx[2] = 0
    const newColumns = getRegionColumns(idx[0], 0)
    multiColumns.value = newColumns
  } else if (column === 1) {
    // 市变化 -> 更新区
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
