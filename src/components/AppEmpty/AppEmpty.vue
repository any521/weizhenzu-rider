<template>
  <view class="app-empty">
    <view class="empty-icon">
      <CategoryIcon :name="icon" :size="iconSize" />
    </view>
    <text class="empty-title">{{ title }}</text>
    <text v-if="subtitle" class="empty-subtitle">{{ subtitle }}</text>
    <view v-if="btnText" class="empty-btn" @tap="onAction">{{ btnText }}</view>
  </view>
</template>

<script setup lang="ts">
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

withDefaults(defineProps<{
  icon?: string
  title?: string
  subtitle?: string
  btnText?: string
  iconSize?: number
}>(), {
  icon: 'ticket-empty',
  title: '暂无数据',
  subtitle: '',
  btnText: '',
  iconSize: 64
})

const emit = defineEmits<{
  (e: 'action'): void
}>()

function onAction() {
  emit('action')
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  color: $text-muted;
  opacity: 0.6;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: $text;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 13px;
  color: $text-light;
  line-height: 1.5;
}

.empty-btn {
  margin-top: 20px;
  background: linear-gradient(90deg, $primary, $primary-light);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 28px;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}
</style>