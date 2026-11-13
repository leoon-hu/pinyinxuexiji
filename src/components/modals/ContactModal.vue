<script setup lang="ts">
import AppModal from '@/components/AppModal.vue'
import { AUTHOR_CONTACT } from '@/data/sites'

/**
 * 「联系站长」弹窗（需求 5.7）：页脚与家长设置「关于」共用，一句怎么加 + 两张并排的图
 * （站长微信二维码、微信支付的赞助码，图下各一行小字）+ 「知道了」。家长自己点开的，不出声。
 */
const emit = defineEmits<{ close: [] }>()
const qrSrc = `${import.meta.env.BASE_URL}${AUTHOR_CONTACT.qr}`
const paySrc = `${import.meta.env.BASE_URL}${AUTHOR_CONTACT.pay}`
</script>

<template>
  <AppModal :title="AUTHOR_CONTACT.label" @close="emit('close')">
    <p class="desc">{{ AUTHOR_CONTACT.hint }}</p>
    <div class="qrs">
      <figure>
        <img :src="qrSrc" alt="站长微信二维码" width="720" height="987" draggable="false" />
        <figcaption>{{ AUTHOR_CONTACT.qrCaption }}</figcaption>
      </figure>
      <figure>
        <img :src="paySrc" alt="微信支付赞助码" width="720" height="983" draggable="false" />
        <figcaption>{{ AUTHOR_CONTACT.payCaption }}</figcaption>
      </figure>
    </div>
    <button class="btn ok" @click="emit('close')">知道了</button>
  </AppModal>
</template>

<style scoped>
.desc {
  margin: 0 0 14px;
  color: var(--c-muted);
  font-size: 15px;
}
/* 两张图并排：左边站长微信二维码、右边微信支付的赞助码，图下各一行小字；高度按视口限一下，横屏手机上别把「知道了」挤出去 */
.qrs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}
.qrs figure {
  margin: 0;
  text-align: center;
}
.qrs img {
  display: block;
  width: min(240px, 100%, 40vh);
  height: auto;
  margin: 0 auto;
  border-radius: 12px;
  background: #fff;
}
.qrs figcaption {
  margin-top: 6px;
  color: var(--c-muted);
  font-size: 13px;
  line-height: 1.4;
}
.ok {
  width: 100%;
  margin-top: 18px;
  height: 48px;
  font-size: 17px;
}
</style>
