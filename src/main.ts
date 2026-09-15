import { createApp } from 'vue'
import App from '@/App.vue'
import { state } from '@/store/state'
import { progress } from '@/store/progress'
import * as audio from '@/services/audio'
import '@/styles/tokens.css'
import '@/styles/base.css'

createApp(App).mount('#app')

// 开发时把状态挂到 window，方便在控制台 / 自动化脚本里检查
if (import.meta.env.DEV) {
  ;(window as unknown as { __pinyin: unknown }).__pinyin = { state, progress, audio }
}
