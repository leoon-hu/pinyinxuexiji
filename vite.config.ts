import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

/**
 * 离线录音包的清单（需求 5.6，services/offline.ts）：public/ 里要离线用的文件 → 内容哈希（md5 前 10 位），
 * 构建时写成 dist/media.json（不进预缓存，页面在后台照着它把录音下进运行时缓存），dev 服务器也回同一份。
 */
function mediaFile(match: RegExp): Plugin {
  let dir = ''
  const body = (): string => {
    const files: Array<[string, string]> = []
    const walk = (rel: string): void => {
      for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
        const p = rel ? `${rel}/${e.name}` : e.name
        if (e.isDirectory()) walk(p)
        else if (match.test(p)) files.push([p, createHash('md5').update(readFileSync(join(dir, p))).digest('hex').slice(0, 10)])
      }
    }
    walk('')
    files.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `${JSON.stringify({ files: Object.fromEntries(files) })}\n`
  }
  return {
    name: 'media-file',
    configResolved(c) {
      dir = c.publicDir
    },
    configureServer(server) {
      server.middlewares.use('/media.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(body())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'media.json', source: body() })
    },
  }
}

export default defineConfig(({ mode }) => ({
  // 相对路径：构建产物放到任意子目录都能跑；双击 dist/index.html 也能用（音频走 <audio> 元素）
  base: './',
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  plugins: [
    vue(),
    analyticsTag(loadEnv(mode, process.cwd(), 'VITE_')),
    versionFile(VERSION),
    mediaFile(/^audio\/[^/]+\.mp3$/),
    // PWA：iPad「添加到主屏幕」后离线可用。预缓存只有页面外壳（代码 / 字体 / 图标 / 录音清单，几秒装好）——新版本几秒就能换上；
    // 3700 个录音（约 17 MB）不进预缓存：由页面在后台分批下进运行时缓存 audio（services/offline.ts），SW 离线时从它取。
    // 以前录音都在预缓存里，SW 要一个一个下完才算装好（几分钟，慢的手机超过 5 分钟就作废），「检查更新」「重新安装」都要排队等它
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
        // version.json 是「检查更新」要现取的，media.json 是后台下录音时现取的：都不进离线包
        globIgnores: ['version.json', 'media.json'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // 录音：缓存里有就用缓存，没有才取网络并存下（页面后台下载的也在同一个缓存里）。只认不带参数的地址：
            // 后台下载带 ?v=哈希，要绕过这里直接取网络（改过的录音不能被缓存里的旧文件顶上）
            urlPattern: /\/audio\/[^/?#]+\.mp3$/,
            handler: 'CacheFirst',
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
