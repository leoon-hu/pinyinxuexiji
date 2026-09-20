<script setup lang="ts">
import AppModal from '@/components/AppModal.vue'
import { closeShare, copyShare, sharePanel } from '@/store/share'

/**
 * 「分享给朋友」弹窗（需求 5.7）：微信 / QQ 里教用右上角「···」；没有系统分享面板时给一段话 + 链接，
 * 已复制就说已复制，也能手动选中。挂在 App.vue，系统分享面板能用的环境不会走到这里。家长自己点开的，不出声。
 */
</script>

<template>
  <AppModal v-if="sharePanel" title="分享给朋友" @close="closeShare()">
    <p class="desc">
      {{ sharePanel.way === 'wechat' ? '点右上角的「···」，选「发送给朋友」或「分享到朋友圈」。' : sharePanel.copied ? '已经复制好了，粘贴给朋友就行：' : '把下面这段话发给朋友就行：' }}
    </p>
    <pre class="message">{{ sharePanel.message }}</pre>
    <button v-if="sharePanel.way === 'copy'" class="btn ok" @click="copyShare()">{{ sharePanel.copied ? '已复制' : '复制' }}</button>
    <button class="btn ok" :class="{ plain: sharePanel.way === 'copy' }" @click="closeShare()">知道了</button>
  </AppModal>
</template>

<style scoped>
.desc {
  margin: 0 0 12px;
  color: var(--c-muted);
  font-size: 15px;
}
/* 分享的那段话：可以选中复制 */
.message {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--c-line);
  background: #fff;
  font: inherit;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  -webkit-user-select: text;
  user-select: text;
}
.ok {
  width: 100%;
  margin-top: 12px;
  height: 48px;
  font-size: 17px;
}
</style>
