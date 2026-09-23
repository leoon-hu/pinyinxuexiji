/**
 * 后台下离线录音包（services/offline.ts，需求 5.6）：页面打开后等一会儿开始（让首屏和第一次点读先走），
 * 断网 / 失败停下，联网或回到前台接着下；没下完的一轮过一分钟再补一次。只有一份在跑。
 * 没有 Service Worker 的打开方式（微信内置浏览器、file://、无痕）下了也用不上，不下；省流量模式不主动下。
 */
import { reactive } from 'vue'
import { mediaStatus, prefetchMedia, saveData, type MediaProgress } from '@/services/offline'

/** 页面打开后等这么久才开始 */
export const START_DELAY_MS = 4000
/** 这一轮没下全（个别文件失败）过这么久再补 */
export const RETRY_MS = 60_000

export const offline = reactive<{ supported: boolean; running: boolean; progress: MediaProgress | null }>({
  supported:
    typeof window !== 'undefined' && typeof caches !== 'undefined' && 'serviceWorker' in navigator && location.protocol !== 'file:',
  running: false,
  progress: null,
})

let timer: ReturnType<typeof setTimeout> | null = null

async function run(): Promise<void> {
  if (offline.running || saveData()) return
  offline.running = true
  try {
    offline.progress = await prefetchMedia(undefined, { onProgress: (p) => (offline.progress = p) })
  } finally {
    offline.running = false
  }
  const p = offline.progress
  if (p && !p.stopped && p.total > 0 && p.cached < p.total) schedule(RETRY_MS)
}

function schedule(delay: number): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void run()
  }, delay)
}

/** main.ts 启动时调一次 */
export function setupOffline(): void {
  if (!offline.supported) return
  // 先不联网看一眼上一轮下到哪了（断网打开时也显示得对），再等一会儿开始补
  void mediaStatus().then((p) => {
    if (p && !offline.progress) offline.progress = p
  })
  schedule(START_DELAY_MS)
  window.addEventListener('online', () => schedule(1000))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && offline.progress?.stopped) schedule(1000)
  })
}
