<template>
  <view class="msg-container">
    <view
      v-for="msg in messages"
      :key="msg.id"
      class="msg-item"
      :class="[`msg-item--${msg.type}`, { 'msg-item--leaving': msg.leaving }]"
      @tap="handleTap(msg.id)"
    >
      <view class="msg-icon">
        <text v-if="msg.type === 'success'" class="msg-icon-text">✓</text>
        <text v-else-if="msg.type === 'error'" class="msg-icon-text">✗</text>
        <text v-else-if="msg.type === 'warning'" class="msg-icon-text">!</text>
        <text v-else class="msg-icon-text">i</text>
      </view>
      <text class="msg-text">{{ msg.text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { messages, closeMessage } from '@/utils/message'

// H5 端标记（条件编译在构建时移除不匹配的分支）
let IS_H5 = false
// #ifdef H5
IS_H5 = true
// #endif

/**
 * H5 端点击消息关闭，APP/小程序端不处理（自动消失）
 */
function handleTap(id: number) {
  if (IS_H5) {
    closeMessage(id)
  }
}
</script>

<style lang="scss" scoped>
.msg-container {
  position: fixed;
  top: calc(var(--status-bar-height, 20px) + 20px);
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.msg-item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  min-width: 280px;
  max-width: 90%;
  padding: 10px 16px;
  margin-bottom: 8px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: msg-enter 0.3s ease-out forwards;

  &--leaving {
    animation: msg-leave 0.3s ease-out forwards;
  }

  &--success .msg-icon {
    background: #67c23a;
  }
  &--error .msg-icon {
    background: #f56c6c;
  }
  &--warning .msg-icon {
    background: #e6a23c;
  }
  &--info .msg-icon {
    background: #ff4b33;
  }
}

.msg-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.msg-icon-text {
  color: #ffffff;
  font-size: 13px;
  font-weight: bold;
  line-height: 1;
}

.msg-text {
  flex: 1;
  font-size: 14px;
  color: #303133;
  word-break: break-all;
  white-space: pre-wrap;
  line-height: 1.5;
}

@keyframes msg-enter {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes msg-leave {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
</style>
