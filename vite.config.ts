import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { analyticsAttrs, analyticsConfig } from './src/services/analytics'

/**
 * 访问统计标签（需求 5.8，services/analytics.ts）：.env 里 VITE_UMAMI_SCRIPT / VITE_UMAMI_WEBSITE_ID 都有时，正式构建把
 * 一行 <script defer> 写进 index.html 的 <head>；dev 不加，没配置什么都不加。
 */
function analyticsTag(env: Record<string, string>): Plugin {
  const cfg = analyticsConfig(env)
  return {
    name: 'analytics-tag',
    apply: 'build',
    transformIndexHtml: () => (cfg ? [{ tag: 'script', attrs: analyticsAttrs(cfg), injectTo: 'head' }] : []),
  }
}

/**
 * 当前版本（需求 5.7「版本与更新」，services/version.ts）：构建时刻的北京时间「2026-09-23 14:05」（与构建机器的时区无关）。
 * 页面里是 __APP_VERSION__；同一份写进 dist/version.json 给页脚的「检查更新」比对（不进离线包，见 globIgnores），
 * dev 服务器也回同一份。
 */
function buildVersion(d = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
}
function versionFile(version: string): Plugin {
  const body = `${JSON.stringify({ version })}\n`
  return {
    name: 'version-file',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(body)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: body })
    },
  }
}
const VERSION = buildVersion()

export default defineConfig(({ mode }) => ({
  // 相对路径：构建产物放到任意子目录都能跑；双击 dist/index.html 也能用（音频走 <audio> 元素）
  base: './',
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  plugins: [
    vue(),
    analyticsTag(loadEnv(mode, process.cwd(), 'VITE_')),
    versionFile(VERSION),
    // PWA：可以「添加到主屏幕」全屏打开。预缓存只有页面外壳（代码 / 字体 / 图标 / 录音清单，几秒装好）——新版本几秒就能换上；
    // 3700 个录音（约 17 MB）不预先下载，也不在后台整包下载（需求 5.6：以后素材还会多，不保证离线）：用到哪个才取哪个，
    // 取过的存进运行时缓存 audio，下次先用缓存
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false,
      manifest: {
        name: '拼音学习机',
        short_name: '拼音学习机',
        description: '拼音点读、拼读、跟读、测验，适合儿童或学习汉语者',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f6c3cb',
        theme_color: '#f6c3cb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,jpg,json}'],
        // version.json 是「检查更新」要现取的，不进预缓存
        globIgnores: ['version.json'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // 录音：用到才取。缓存里有就先用缓存（马上出声），同时在后台再取一次存进去（走浏览器的 HTTP 缓存，
            // 多数时候不上网）；没有就取网络并存下。文件名不带内容哈希，用 CacheFirst 的话录音重做过也会一直播缓存里的旧文件，
            // 这样最迟过了 HTTP 缓存期（几天）就换成新的。老版本在后台整包下好的录音也在这个缓存里，照样用
            urlPattern: /\/audio\/[^/?#]+\.mp3$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'audio', cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
}))
