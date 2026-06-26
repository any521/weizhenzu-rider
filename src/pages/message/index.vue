<template>
  <view class="messages">
    <!-- 顶部 Tab 与全部已读 -->
    <view class="message-header">
      <view class="msg-tabs">
        <view
          v-for="t in tabs"
          :key="t.value"
          :class="['msg-tab', activeTab === t.value && 'active']"
          @tap="activeTab = t.value"
        >
          {{ t.label }}
        </view>
      </view>
      <view class="read-all" @tap="markAllRead">
        <CategoryIcon name="check" :size="12" />
        <text>全部已读</text>
      </view>
    </view>

    <view v-if="!filteredList.length" class="empty">
      <view class="empty-icon-wrap"><CategoryIcon name="bell" :size="60" color="#ccc" /></view>
      <text class="empty-text">暂无消息</text>
    </view>
    <view v-else class="message-list">
      <view
        v-for="m in filteredList"
        :key="m.id"
        :class="['msg-item', m.unread ? 'msg-unread' : 'msg-read']"
        @tap="onRead(m)"
      >
        <view class="m-icon-wrap">
          <view :class="['m-icon-circle', `m-icon-${m.type}`]">
            <CategoryIcon :name="typeIcon(m.type)" :size="20" color="#fff" />
          </view>
          <text v-if="m.unread" class="m-dot"></text>
        </view>
        <view class="m-body">
          <view class="m-top">
            <text class="m-title">{{ m.title }}</text>
            <text class="m-time">{{ m.time }}</text>
          </view>
          <text class="m-content">{{ m.content }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMessageList, markMessageRead, markAllMessagesRead } from '@/api'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

const tabs = [
  { label: '全部', value: 'all' },
  { label: '订单', value: 'order' },
  { label: '优惠', value: 'coupon' },
  { label: '系统', value: 'system' }
]
const activeTab = ref('all')
const list = ref<any[]>([])

onShow(() => load())

async function load() {
  try {
    const res: any = await getMessageList({ pageNum: 1, pageSize: 50 })
    const records = res?.list || res?.records || []
    list.value = records.map((m: any) => ({
      id: m.id,
      title: m.title || '',
      content: m.content || '',
      time: m.createdAt || m.time || '',
      unread: m.status === 0 || m.unread === true,
      type: m.type || 'system'
    }))
  } catch (e) {
    console.error('加载消息失败', e)
    list.value = []
  }
}

const filteredList = computed(() => {
  if (activeTab.value === 'all') return list.value
  return list.value.filter(m => m.type === activeTab.value)
})

function typeIcon(type: string) {
  const map: Record<string, string> = {
    order: 'package',
    coupon: 'coupon-card',
    system: 'bell',
    promo: 'fire'
  }
  return map[type] || 'megaphone'
}

async function onRead(m: any) {
  if (m.unread) {
    try {
      await markMessageRead(m.id)
      m.unread = false
    } catch (e) {
      uni.showToast({ title: '标记失败，请重试', icon: 'none' })
    }
  }
}

async function markAllRead() {
  const unreadList = filteredList.value.filter(m => m.unread)
  if (!unreadList.length) {
    uni.showToast({ title: '没有未读消息', icon: 'none' })
    return
  }
  try {
    await markAllMessagesRead()
    unreadList.forEach(m => { m.unread = false })
    uni.showToast({ title: '已全部已读', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.messages {
  min-height: 100vh;
  background: $bg;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: $card;
  border-bottom: 1px solid $border;
}

.msg-tabs {
  display: flex;
  gap: 16px;
}

.msg-tab {
  font-size: 14px;
  color: $text-light;
  position: relative;
  padding-bottom: 4px;
}

.msg-tab.active {
  color: $primary;
  font-weight: 700;
}

.msg-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 3px;
  background: $primary;
  border-radius: 2px;
}

.read-all {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-muted;
}

.empty {
  text-align: center;
  padding: 80px 0;
  color: $text-muted;
  .empty-icon-wrap { display: flex; justify-content: center; margin-bottom: 12px; opacity: 0.5; }
}

.message-list {
  padding: 12px 16px;
}

.msg-item {
  display: flex;
  background: #fff;
  margin-bottom: 10px;
  border-radius: $radius-md;
  padding: 14px;
  box-shadow: $shadow;
}

.msg-unread {
  border-left: 3px solid $primary;
}

.msg-read {
  border-left: 3px solid transparent;
}

.m-icon-wrap {
  position: relative;
  margin-right: 12px;
}

.m-icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary, $primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.m-icon-order {
  background: linear-gradient(135deg, #4CAF50, #66BB6A);
}

.m-icon-coupon {
  background: linear-gradient(135deg, #FF9800, #FFB74D);
}

.m-icon-system {
  background: linear-gradient(135deg, #2196F3, #42A5F5);
}

.m-icon-promo {
  background: linear-gradient(135deg, #F44336, #EF5350);
}

.m-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: #FF3B30;
  border-radius: 50%;
  border: 2px solid #fff;
}

.m-body {
  flex: 1;
  min-width: 0;
}

.m-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.m-title {
  font-size: 15px;
  font-weight: 600;
  color: $text;
}

.m-time {
  font-size: 11px;
  color: $text-muted;
}

.m-content {
  display: block;
  font-size: 13px;
  color: $text-light;
  line-height: 1.5;
}
</style>
