<script setup lang="ts">
import AppModal from '@/components/AppModal.vue'
import { AUTHOR_CONTACT } from '@/data/sites'

/**
 * 「联系站长」弹窗（需求 5.7）：页脚与家长设置「关于」共用，一句怎么加 + 站长微信二维码 + 「知道了」。
 * 家长自己点开的，不出声。
 */
const emit = defineEmits<{ close: [] }>()
const qrSrc = `${import.meta.env.BASE_URL}${AUTHOR_CONTACT.qr}`
</script>

<template>
  <AppModal :title="AUTHOR_CONTACT.label" @close="emit('close')">
    <p class="desc">{{ AUTHOR_CONTACT.hint }}</p>
    <img class="qr" :src="qrSrc" alt="站长微信二维码" width="720" height="987" draggable="false" />
    <button class="btn ok" @click="emit('close')">知道了</button>
  </AppModal>
</template>

<style scoped>
.desc {
  margin: 0 0 14px;
  color: var(--c-muted);
  font-size: 15px;
}
/* 二维码一张，居中；高度按视口限一下，横屏手机上别把「知道了」挤出去 */
.qr {
  display: block;
  width: min(240px, 100%, 40vh);
  height: auto;
  margin: 0 auto;
  border-radius: 12px;
  background: #fff;
}
.ok {
  width: 100%;
  margin-top: 18px;
  height: 48px;
  font-size: 17px;
}
</style>
