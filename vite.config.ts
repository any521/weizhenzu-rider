import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // WebSocket 代理：H5 环境下 buildWsUrl 用 window.location.host 连接 ws://localhost:5173/ws/...
      // 必须配置 /ws 代理并启用 ws:true，否则 Vite dev server 不转发 WS 握手，导致连接超时
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api', 'import', 'strict-unary'],
      }
    }
  }
})
