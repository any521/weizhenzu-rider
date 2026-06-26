<template>
  <view class="smart-img" :style="wrapperStyle">
    <!-- 占位层：渐变背景 + 图标 -->
    <view class="smart-img-placeholder" :style="{ background: bg }">
      <CategoryIcon :name="icon" :size="iconSize" />
    </view>
    <!-- 实际图片层 -->
    <image
      v-if="resolvedSrc && !errored"
      class="smart-img-real"
      :src="resolvedSrc"
      :mode="mode"
      @error="onError"
      @load="onLoad"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

const props = withDefaults(defineProps<{
  src?: string
  /** 占位图标名（CategoryIcon name） */
  icon?: string
  /** 占位图标大小 */
  iconSize?: number
  /** 图片裁剪模式 */
  mode?: 'aspectFill' | 'aspectFit' | 'scaleToFill' | 'widthFix' | 'heightFix'
  /** 自定义占位渐变背景 */
  bg?: string
  /** 圆角 */
  radius?: string | number
  /** 圆形 */
  round?: boolean
}>(), {
  icon: 'meishi',
  iconSize: 32,
  mode: 'aspectFill',
  bg: 'linear-gradient(135deg, #FF6B35, #FFC107)',
  radius: '8px',
  round: false,
})

const errored = ref(false)

const resolvedSrc = computed(() => {
  const s = props.src
  if (!s) return ''
  const trimmed = s.trim()
  if (!trimmed) return ''
  return trimmed
})

const wrapperStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (props.round) {
    styles['border-radius'] = '50%'
  } else if (props.radius !== undefined) {
    const r = typeof props.radius === 'number' ? `${props.radius}px` : props.radius
    styles['border-radius'] = r
  }
  return styles
})

function onError() {
  errored.value = true
}

function onLoad() {
  errored.value = false
}

// src 变化时重置错误状态
watch(() => props.src, () => {
  errored.value = false
})
</script>

<style lang="scss" scoped>
.smart-img {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.smart-img-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.smart-img-real {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}
</style>
