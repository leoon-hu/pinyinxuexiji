import { createApp } from 'vue'
import App from '@/App.vue'
import { state } from '@/store/state'
import { progress } from '@/store/progress'
import * as audio from '@/services/audio'
import { setupInstall } from '@/services/install'
import { setupOffline } from '@/store/offline'
import '@/styles/tokens.css'
import '@/styles/base.css'

setupInstall()
createApp(App).mount('#app')
// 离线录音包在后台下（需求 5.6）：预缓存只有页面外壳
setupOffline()

// 开发时把状态挂到 window，方便在控制台 / 自动化脚本里检查
if (import.meta.env.DEV) {
  ;(window as unknown as { __pinyin: unknown }).__pinyin = { state, progress, audio }
}
