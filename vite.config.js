import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://192.168.192.10:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://192.168.192.10:8080',
        ws: true
      }
    }
  }
})