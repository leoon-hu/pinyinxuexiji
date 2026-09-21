/**
 * 访问统计（需求 5.8，2026-09-21 四个站统一）：自建的 Umami（开源、无 cookie、不存 IP），页面里只多一行 <script defer>。
 * 脚本地址与站点 id 来自构建期环境变量 VITE_UMAMI_SCRIPT / VITE_UMAMI_WEBSITE_ID（.env，不进仓库）：两项都有才加标签，
 * 别人自己部署时不配就什么都不加。标签由 vite.config.ts 在正式构建时写进 index.html；dev 不加。
 * 上报的是页面地址、标题、来源、屏幕尺寸、语言；进度、金币、测验记录都不上报。
 * 没有路由、页面地址不变，所以只有打开时一次页面浏览，用不着补 popstate（另外三个站有）。
 */
export interface AnalyticsConfig {
  script: string
  websiteId: string
}

export function analyticsConfig(env: Record<string, string | undefined>): AnalyticsConfig | null {
  const script = env.VITE_UMAMI_SCRIPT?.trim() ?? ''
  const websiteId = env.VITE_UMAMI_WEBSITE_ID?.trim() ?? ''
  if (!script || !websiteId) return null
  return { script, websiteId }
}

/** 标签的属性（vite 的 transformIndexHtml 直接用） */
export function analyticsAttrs(cfg: AnalyticsConfig): Record<string, string | true> {
  return { defer: true, src: cfg.script, 'data-website-id': cfg.websiteId }
}
