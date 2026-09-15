<script setup lang="ts">
import { install, promptInstall, dismissInstall } from '@/services/install'
</script>

<template>
  <Transition name="rise">
    <div v-if="install.way" class="banner" role="dialog" aria-label="添加到主屏幕">
      <div class="emoji">📲</div>
      <div class="text">
        <div class="title">添加到主屏幕</div>
        <div v-if="install.way === 'ios'" class="desc">
          点浏览器的
          <svg class="share" viewBox="0 0 24 24" aria-label="分享"><path d="M8 9H6v12h12V9h-2M12 3v11M8.5 6.5 12 3l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          分享，再选「添加到主屏幕」。装好后全屏打开，离线也能用。
        </div>
        <div v-else class="desc">装好后像 App 一样全屏打开，离线也能用。</div>
      </div>
      <div class="btns">
        <button v-if="install.way === 'native'" class="btn" @click="promptInstall">安装</button>
        <button class="btn plain" @click="dismissInstall">{{ install.way === 'ios' ? '知道了' : '以后再说' }}</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 贴底的小卡片：盖在底部三键上面、弹窗下面；手机上按钮换到下一行 */
.banner {
  position: fixed;
  left: 8px;
  right: 8px;
  bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  margin: 0 auto;
  max-width: 560px;
  background: var(--c-panel);
  border-radius: var(--radius-panel);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  z-index: 5;
}

.emoji {
  font-size: 34px;
  line-height: 1;
}

.text {
  flex: 1 1 200px;
  min-width: 0;
}

.title {
  font-size: 17px;
  font-weight: 600;
}

.desc {
  margin-top: 2px;
  font-size: 14px;
  color: var(--c-muted);
  line-height: 1.5;
}

.share {
  width: 1.15em;
  height: 1.15em;
  vertical-align: -0.2em;
  color: var(--c-blue);
}

.btns {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.btns .btn {
  height: 40px;
  padding: 0 16px;
}

.rise-enter-active,
.rise-leave-active {
  transition:
    transform 0.3s ease-out,
    opacity 0.3s;
}

.rise-enter-from,
.rise-leave-to {
  transform: translateY(24px);
  opacity: 0;
}
</style>
