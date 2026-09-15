/**
 * 「安装 拼音学习机」提示（需求 5.6）：与 child-education 下另外三个站（AI加词 / 同步练 / 识字卡片）同一套规则。
 * 能一键安装（beforeinstallprompt）就弹原生安装框；否则电脑不提示；内置浏览器 / iOS / 其它触屏浏览器教操作。
 * 已从主屏幕打开或装过的不提示；关掉 / 拒绝后 3 天内不再提示。
 */
import { computed, reactive } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * prompt = 拿到 beforeinstallprompt，按钮「安装」直接弹系统框；
 * inapp  = 微信 / QQ 等内置浏览器，装不了，教他去浏览器打开；
 * ios    = iPhone / iPad，教他点分享 → 添加到主屏幕；
 * menu   = 其它触屏浏览器，「浏览器菜单 → 添加到主屏幕」
 */
export type InstallKind = 'prompt' | 'inapp' | 'ios' | 'menu'

export interface InstallEnv {
  standalone: boolean
  installed: boolean
  hasPrompt: boolean
  /** 触屏设备（pointer: coarse）；电脑只在能一键安装时提示 */
  touch: boolean
  inApp: boolean
  ios: boolean
}

/** 关掉 / 拒绝之后多久再提示：3 天 */
export const INSTALL_SNOOZE_MS = 3 * 24 * 3600 * 1000
/** 「永不再提示」（装好了）：JSON 存得下的最大整数 */
export const INSTALL_FOREVER = Number.MAX_SAFE_INTEGER
/** 只记「几号之前别再提示」，不进备份码：装到主屏幕后是另一份存储，本来就该各自提示 */
const KEY = 'pinyinxuexiji:install'

/** null = 不显示。判断顺序：能一键安装最优先（电脑也算），内置浏览器要先于 iOS（iOS 微信里 ios 也为真） */
export function installKind(env: InstallEnv, snoozedUntil: number, now: number): InstallKind | null {
  if (env.standalone || env.installed || now < snoozedUntil) return null
  if (env.hasPrompt) return 'prompt'
  if (!env.touch) return null
  if (env.inApp) return 'inapp'
  if (env.ios) return 'ios'
  return 'menu'
}

export interface InstallStep {
  text: string
  /** 后面画分享图标 */
  share?: boolean
}

/** 「怎么做」弹窗的步骤（prompt 不需要）。iOS 不在 Safari 里先换 Safari；iPad 的分享按钮在右上角 */
export function installSteps(kind: InstallKind, opts: { iosSafari: boolean; ipad: boolean }): InstallStep[] {
  switch (kind) {
    case 'inapp':
      return [{ text: '点右上角「···」' }, { text: '选「在浏览器打开」' }, { text: '在浏览器里再按提示安装' }]
    case 'ios':
      return [
        ...(opts.iosSafari ? [] : [{ text: '先用 Safari 打开本站' }]),
        { text: opts.ipad ? '点右上角的分享按钮' : '点底部工具栏的分享按钮', share: true },
        { text: '在菜单里向下找到「添加到主屏幕」' },
        { text: '点右上角「添加」，主屏幕上就会出现图标' },
      ]
    case 'menu':
      return [{ text: '点浏览器的菜单（右上角 ⋮ 或底部 ≡）' }, { text: '选「添加到主屏幕」或「安装应用」' }, { text: '确认添加，桌面上就会出现图标' }]
    default:
      return []
  }
}

// ---- 浏览器环境 ----
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const mq = (q: string): boolean => typeof matchMedia === 'function' && matchMedia(q).matches
/** iPadOS 13 起 Safari 的 UA 与桌面 Mac 一样，靠触点数区分；iPad 的分享按钮在右上角，指引要分开写 */
export const isIPad = /iPad/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isIOS = /iPhone|iPod/.test(ua) || isIPad
const isInApp = /MicroMessenger|\bQQ\/|Weibo|FBAN|FBAV|Instagram|Line\//.test(ua)
/** iOS 上只有 Safari 的分享菜单里有「添加到主屏幕」；Chrome / Edge / Firefox for iOS 与内置浏览器都要先换 Safari */
export const isIOSSafari = isIOS && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPT\/|DuckDuckGo/.test(ua) && !isInApp
const isStandalone =
  mq('(display-mode: standalone)') ||
  mq('(display-mode: fullscreen)') ||
  (typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true)
const isTouch = mq('(pointer: coarse)')

function readUntil(): number {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 0
    const { until } = JSON.parse(raw) as { until?: unknown }
    return typeof until === 'number' && Number.isFinite(until) ? until : 0
  } catch {
    return 0
  }
}

function writeUntil(until: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ until }))
  } catch {
    // 隐私模式等存不下：下次再提示一次也无妨
  }
}

let deferred: BeforeInstallPromptEvent | null = null

export const install = reactive({
  hasPrompt: false,
  until: readUntil(),
  /** 组件挂载时刷新：静默期到了、页面还一直开着也能重新出现 */
  now: Date.now(),
})

/** 当前该显示哪种提示；null = 不显示 */
export const installWay = computed(() =>
  installKind(
    { standalone: isStandalone, installed: install.until === INSTALL_FOREVER, hasPrompt: install.hasPrompt, touch: isTouch, inApp: isInApp, ios: isIOS },
    install.until,
    install.now,
  ),
)

/** 已从主屏幕打开（家长设置里显示「已安装」） */
export const installedStandalone = isStandalone

/** 启动时调一次，要在 beforeinstallprompt 触发之前（页面加载后 Chrome 很快就发） */
export function setupInstall(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // 拦下浏览器自己的小条，时机与文案由提示条统一控制
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    install.hasPrompt = true
  })
  window.addEventListener('appinstalled', markInstalled)
}

function markInstalled(): void {
  deferred = null
  install.hasPrompt = false
  install.until = INSTALL_FOREVER
  writeUntil(INSTALL_FOREVER)
}

/** 点「安装」：弹原生安装框。事件只能用一次；装了记永久，拒绝了当「以后再说」 */
export async function promptInstall(): Promise<'accepted' | 'dismissed'> {
  const e = deferred
  deferred = null
  install.hasPrompt = false
  if (!e) return 'dismissed'
  let outcome: 'accepted' | 'dismissed' = 'dismissed'
  try {
    await e.prompt()
    outcome = (await e.userChoice).outcome
  } catch {
    outcome = 'dismissed'
  }
  if (outcome === 'accepted') markInstalled()
  else dismissInstall()
  return outcome
}

/** 「×」/ 关掉步骤弹窗 / 拒绝：3 天内不再提示 */
export function dismissInstall(): void {
  install.until = Date.now() + INSTALL_SNOOZE_MS
  writeUntil(install.until)
}
