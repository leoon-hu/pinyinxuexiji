/// <reference types="vite/client" />

/** 当前版本 = 构建时刻（北京时间「2026-09-23 14:05」，vite.config.ts 的 buildVersion），页脚的版本卡片用 */
declare const __APP_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
