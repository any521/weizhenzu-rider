<template>
  <view class="my-coupon-page">
    <!-- 顶部标题栏 -->
    <view class="coupon-header">
      <text class="header-title">我的卡券</text>
    </view>

    <!-- 状态 Tab -->
    <view class="coupon-tabs">
      <view
        v-for="t in tabs"
        :key="t.value"
        :class="['coupon-tab', status === t.value && 'tab-active']"
        @tap="status = t.value"
      >
        {{ t.label }} ({{ counts[t.value] }})
      </view>
    </view>

    <!-- 卡券列表 -->
    <scroll-view scroll-y class="coupon-scroll" :style="{ height: scrollHeight + 'px' }">
      <view v-if="!list.length" class="empty-wrap">
        <AppEmpty 
          icon="ticket-empty" 
          :title="`暂无${statusLabel}优惠券`" 
          btn-text="去领券" 
          :icon-size="96"
          @action="goHome" 
        />
      </view>

      <view v-else class="coupon-list">
        <view
          v-for="c in list"
          :key="c.id"
          :class="['coupon-card', c.status === 'used' && 'used', c.status === 'expired' && 'expired']"
        >
          <view class="coupon-left" :style="{ background: leftBg(c) }">
            <view class="coupon-amount">
              <text v-if="c.type === 'amount'" class="coupon-symbol">¥</text>
              <text class="coupon-value">{{ c.value }}</text>
              <text v-if="c.type === 'discount'" class="coupon-unit">折</text>
            </view>
            <text class="coupon-condition">{{ c.condition }}</text>
          </view>
          <view class="coupon-right">
            <view>
              <text class="coupon-title">{{ c.name }}</text>
              <text class="coupon-desc">{{ c.desc }}</text>
            </view>
            <view class="coupon-meta">
              <text>{{ c.expire }} 到期</text>
              <view v-if="c.status === 'unused'" class="coupon-btn" @tap="useCoupon(c)">去使用</view>
              <text v-else class="coupon-status">{{ c.status === 'used' ? '已使用' : '已过期' }}</text>
            </view>
            <text v-if="c.status === 'used'" class="stamp">已使用</text>
            <text v-if="c.status === 'expired'" class="stamp expired-stamp">已过期</text>
          </view>
        </view>
      </view>
      <view style="height: 20px;"></view>
    </scroll-view>

    <!-- #ifdef H5 -->
    <GlobalTabbar />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyCoupons } from '@/api'
import { useTabStore } from '@/store/tab'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'
import AppEmpty from '@/components/AppEmpty/AppEmpty.vue'
import GlobalTabbar from '@/components/GlobalTabbar/GlobalTabbar.vue'

const tabStore = useTabStore()
const status = ref<'unused' | 'used' | 'expired'>('unused')
const coupons = ref<any[]>([])
const scrollHeight = ref(600)

const tabs = [
  { label: '未使用', value: 'unused' as const },
  { label: '已使用', value: 'used' as const },
  { label: '已过期', value: 'expired' as const }
]

const list = computed(() => coupons.value.filter(c => c.status === status.value))

const counts = computed(() => ({
  unused: coupons.value.filter(c => c.status === 'unused').length,
  used: coupons.value.filter(c => c.status === 'used').length,
  expired: coupons.value.filter(c => c.status === 'expired').length
}))

const statusLabel = computed(() => {
  const map: Record<string, string> = { unused: '未使用', used: '已使用', expired: '已过期' }
  return map[status.value]
})

onShow(() => {
  tabStore.setActiveTab('/pages/coupon/index')
})

onMounted(() => {
  uni.getSystemInfo({
    success: (res: any) => {
      scrollHeight.value = res.windowHeight - 44 - 48
    }
  })
  loadCoupons()
})

async function loadCoupons() {
  try {
    const res: any = await getMyCoupons()
    // 兼容多种返回格式：{list: []}、{records: []}、直接数组
    let list: any[] = []
    if (Array.isArray(res)) {
      list = res
    } else if (Array.isArray(res?.list)) {
      list = res.list
    } else if (Array.isArray(res?.records)) {
      list = res.records
    }
    coupons.value = list.map((c: any) => {
      // 安全解析日期（兼容 Safari：将 "2024-01-15 10:30:00" 转为 "2024-01-15T10:30:00"）
      const parseDate = (s: string) => {
        if (!s) return null
        const t = s.replace(' ', 'T')
        const d = new Date(t)
        return isNaN(d.getTime()) ? null : d
      }
      const endDate = parseDate(c.validEnd)
      // 前端二次确认：未使用但已过期的券，状态修正为过期
      let mappedStatus: 'unused' | 'used' | 'expired'
      const now = Date.now()
      if (c.status === 0) {
        // 后端 0 = 未使用，但需二次检查是否已过期（防止定时任务未及时更新）
        if (endDate && endDate.getTime() < now) {
          mappedStatus = 'expired'
        } else {
          mappedStatus = 'unused'
        }
      } else if (c.status === 1) {
        mappedStatus = 'used'
      } else {
        mappedStatus = 'expired'
      }
      // 格式化到期时间：只显示到日期
      let expireText = ''
      if (endDate) {
        const y = endDate.getFullYear()
        const m = String(endDate.getMonth() + 1).padStart(2, '0')
        const d = String(endDate.getDate()).padStart(2, '0')
        expireText = `${y}.${m}.${d}`
      }
      return {
        id: c.id,
        couponId: c.couponId,
        type: c.type === 2 ? 'discount' : 'amount',
        value: c.type === 2 ? (c.discount ? c.discount * 10 : 0) : (c.amount || 0),
        condition: c.threshold && c.threshold > 0 ? `满 ${c.threshold} 元可用` : '无门槛',
        name: c.couponName || '优惠券',
        desc: c.typeDesc || c.scopeDesc || '',
        expire: expireText,
        status: mappedStatus,
        scope: c.scope, // 1全场 2指定商家 3指定类目
        scopeIds: c.scopeIds || [],
        bg: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
      }
    })
  } catch (e) {
    console.error('加载优惠券失败', e)
    coupons.value = []
  }
}

function leftBg(c: any) {
  if (c.status !== 'unused') return '#CCCCCC'
  if (c.bg) return c.bg
  return 'linear-gradient(135deg, #FF4B33 0%, #FF6B6B 100%)'
}

function useCoupon(c: any) {
  // scope: 1=全场通用 2=指定商家 3=指定类目
  if (c.scope === 2 && c.scopeIds && c.scopeIds.length > 0) {
    // 商家专属券，直接跳转到商家详情页
    const merchantId = c.scopeIds[0]
    uni.switchTab({
      url: '/pages/index/index',
      complete: () => {
        setTimeout(() => {
          uni.navigateTo({ url: `/pages/merchant/detail?id=${merchantId}` })
        }, 100)
      }
    })
  } else {
    // 全场通用或指定类目，跳转到首页
    uni.switchTab({ url: '/pages/index/index' })
  }
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.my-coupon-page {
  min-height: 100vh;
  background: $bg;
}

.coupon-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, $header-start, $header-end);
}

.header-title {
  font-size: 17px;
  font-weight: 700;
  color: $text;
}

.coupon-tabs {
  display: flex;
  background: $card;
  border-bottom: 1px solid $border;
}

.coupon-tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 14px;
  color: $text-light;
  position: relative;
  font-weight: 500;
}

.tab-active {
  color: $primary;
  font-weight: 700;
}

.tab-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 3px;
  background: $primary;
  border-radius: 2px;
}

.coupon-scroll {
  background: $bg;
}

.empty-wrap {
  padding-top: 100px;
}

.coupon-list {
  padding: 12px;
}

.coupon-card {
  background: #fff;
  margin-bottom: 12px;
  border-radius: 12px;
  display: flex;
  overflow: hidden;
  box-shadow: $shadow;
  position: relative;
}

.coupon-left {
  width: 110px;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  position: relative;
}

.coupon-left::before,
.coupon-left::after {
  content: '';
  position: absolute;
  right: -6px;
  width: 12px;
  height: 12px;
  background: $bg;
  border-radius: 50%;
}

.coupon-left::before { top: -6px; }
.coupon-left::after { bottom: -6px; }

.coupon-amount {
  display: flex;
  align-items: baseline;
}

.coupon-symbol {
  font-size: 18px;
}

.coupon-value {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}

.coupon-unit {
  font-size: 14px;
}

.coupon-condition {
  font-size: 11px;
  margin-top: 4px;
  text-align: center;
  opacity: 0.95;
}

.coupon-right {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-left: 1px dashed #F0F0F0;
  position: relative;
}

.coupon-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: $text;
}

.coupon-desc {
  display: block;
  font-size: 12px;
  color: $text-muted;
  margin-top: 4px;
}

.coupon-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: $text-muted;
  margin-top: 10px;
}

.coupon-btn {
  background: linear-gradient(90deg, $primary, $primary-light);
  color: #fff;
  border: none;
  padding: 5px 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(255, 75, 51, 0.2);
}

.coupon-status {
  color: $text-muted;
  font-size: 12px;
}

.coupon-card.used .coupon-left,
.coupon-card.expired .coupon-left {
  background: #CCCCCC !important;
}

.stamp {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%) rotate(-15deg);
  color: rgba(255, 75, 51, 0.28);
  font-size: 22px;
  font-weight: 800;
  border: 3px solid rgba(255, 75, 51, 0.28);
  padding: 4px 10px;
  border-radius: 6px;
}

.expired-stamp {
  color: rgba(153, 153, 153, 0.35);
  border-color: rgba(153, 153, 153, 0.35);
}
</style>
