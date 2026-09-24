import { createApp } from 'vue'
import App from '@/App.vue'
import { state } from '@/store/state'
import { progress } from '@/store/progress'
import * as audio from '@/services/audio'
import { setupInstall } from '@/services/install'
import '@/styles/tokens.css'
import '@/styles/base.css'

setupInstall()
createApp(App).mount('#app')
// 录音用到才下（需求 5.6）。以前在后台整包下载时往缓存 audio 里记过一条 media-revs.json，现在用不上了，删掉
if (typeof caches !== 'undefined') {
  void caches
    .has('audio')
    .then((has) => (has ? caches.open('audio').then((c) => c.delete(new URL('media-revs.json', location.href.split('#')[0]).href)) : false))
    .catch(() => false)
}

// 开发时把状态挂到 window，方便在控制台 / 自动化脚本里检查
if (import.meta.env.DEV) {
  ;(window as unknown as { __pinyin: unknown }).__pinyin = { state, progress, audio }
}
