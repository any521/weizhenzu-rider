<template>
  <view class="placeholder">
    <view class="p-icon-wrap"><CategoryIcon name="plate" :size="80" color="#ddd" /></view>
    <text class="p-title">{{ title }}</text>
    <text class="p-desc">{{ desc }}</text>
  </view>
</template>

<script setup lang="ts">
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

defineProps<{ title?: string; desc?: string }>()
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
.placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 40px;
  .p-icon-wrap { margin-bottom: 16px; opacity: 0.6; }
  .p-title { font-size: 18px; color: $text; font-weight: 600; margin-bottom: 8px; }
  .p-desc { font-size: 13px; color: $text-muted; text-align: center; }
}
</style>
