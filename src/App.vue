<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useTabStore } from '@/store/tab'
import { wsService } from '@/utils/websocket'

onLaunch(() => {
  console.log('App Launch - 味真足')
  // 启动时尝试恢复登录态
  const userStore = useUserStore()
  userStore.initFromStorage()

  // 登录后连接WebSocket
  if (userStore.isLoggedIn) {
    setTimeout(() => wsService.connect(), 500)
  }

  // 设置状态栏高度 CSS 变量（H5 下 uni-app 不会自动注入）
  try {
    const sysInfo = uni.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    // #ifdef H5
    document.documentElement.style.setProperty('--status-bar-height', statusBarHeight + 'px')
    // #endif
    // #ifndef H5
    // 小程序/App 端 uni-app 会自动注入 --status-bar-height，这里确保有 fallback
    // #endif
  } catch (e) {
    console.warn('获取系统信息失败', e)
  }
})

onShow(() => {
  console.log('App Show')
  const pages = getCurrentPages()
  const route = pages.length ? `/${pages[pages.length - 1].route}` : '/pages/index/index'
  useTabStore().setActiveTab(route)

  // App从后台切回前台时，检查WebSocket连接
  const userStore = useUserStore()
  if (userStore.isLoggedIn && !wsService.isConnected()) {
    wsService.connect()
  }
})

onHide(() => {
  console.log('App Hide')
  // App切后台不断开WebSocket，保持消息接收
})
</script>

<style lang="scss">
/* 全局样式 - 红色调外卖风格 */
@use '@/styles/variables.scss' as *;

page {
  background: $bg;
  color: $text;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
}

view, text, button, input, textarea { box-sizing: border-box; }

/* 隐藏滚动条 */
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; -ms-overflow-style: none; }

/* Vant 主题色覆盖 */
:root {
  --van-primary-color: #FF4B33;
  --van-button-primary-background: #FF4B33;
  --van-button-primary-border-color: #FF4B33;
  --van-tabbar-item-active-color: #FF4B33;
  --van-nav-bar-icon-color: #FFFFFF;
  --van-nav-bar-title-text-color: #FFFFFF;
}

/* H5 下隐藏原生 tabbar，使用页面内自定义 GlobalTabbar */
/* #ifdef H5 */
uni-tabbar.uni-tabbar-bottom,
.uni-placeholder {
  display: none !important;
  height: 0 !important;
  overflow: hidden !important;
}

uni-page-body,
uni-page-wrapper {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
}
/* #endif */
</style>
