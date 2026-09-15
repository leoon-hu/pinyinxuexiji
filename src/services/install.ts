/**
 * 「添加到主屏幕」提示。Chrome / Edge / Android 有 beforeinstallprompt，可以弹原生安装框；
 * iOS 没有，只能教家长「分享 → 添加到主屏幕」。已经从主屏幕打开的不提示；关掉后 7 天内不再提示。
 */
import { reactive } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** 只记「几号之前别再提示」，不进备份码：装到主屏幕后是另一份存储，本来就该各自提示 */
const KEY = 'pinyinxuexiji:install'
const SNOOZE_MS = 7 * 24 * 3600 * 1000
/** 页面先画好再冒出来 */
const SHOW_DELAY_MS = 1200

export const install = reactive({
  /** native = 能弹原生安装框；ios = 只能教操作；null = 不显示 */
  way: null as 'native' | 'ios' | null,
})

let deferred: BeforeInstallPromptEvent | null = null

function isStandalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

/** iPadOS 13 起 Safari 的 UA 与桌面 Mac 一样，靠触点数区分 */
function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function snoozed(): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const { until } = JSON.parse(raw) as { until?: number }
    return typeof until === 'number' && Date.now() < until
  } catch {
    return false
  }
}

function snooze(ms = SNOOZE_MS): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ until: Date.now() + ms }))
  } catch {
    // 隐私模式等存不下：下次再提示一次也无妨
  }
}

/** 启动时调一次，要在 beforeinstallprompt 触发之前（页面加载后 Chrome 很快就发） */
export function setupInstall(): void {
  if (isStandalone() || snoozed()) return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    setTimeout(() => (install.way = 'native'), SHOW_DELAY_MS)
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    install.way = null
    snooze(365 * 24 * 3600 * 1000)
  })
  if (isIOS()) setTimeout(() => (install.way = 'ios'), SHOW_DELAY_MS)
}

/** 点「安装」：弹原生安装框；拒绝了就当「以后再说」 */
export async function promptInstall(): Promise<void> {
  const e = deferred
  if (!e) return
  deferred = null
  install.way = null
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome !== 'accepted') snooze()
}

export function dismissInstall(): void {
  install.way = null
  snooze()
}
