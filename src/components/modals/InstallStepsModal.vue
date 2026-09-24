<script setup lang="ts">
import { computed } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { installSteps, isIOSSafari, isIPad, type InstallKind } from '@/services/install'

/**
 * 「怎么做」步骤弹窗（需求 5.6）：首页提示条与家长设置共用，按环境列编号步骤。
 * 家长自己点开的；「知道了」或点外面关闭，是否静默由调用方决定。
 */
const props = defineProps<{ kind: InstallKind }>()
const emit = defineEmits<{ close: [] }>()
const steps = computed(() => installSteps(props.kind, { iosSafari: isIOSSafari, ipad: isIPad }))
</script>

<template>
  <AppModal title="添加到主屏幕" @close="emit('close')">
    <p class="desc">像 App 一样全屏打开，不用再找网址。</p>
    <ol class="steps">
      <li v-for="(s, i) in steps" :key="s.text" class="step">
        <span class="n">{{ i + 1 }}</span>
        <span class="text">
          {{ s.text }}
          <svg v-if="s.share" class="share" viewBox="0 0 24 24" aria-label="分享"><path d="M8 9H6v12h12V9h-2M12 3v11M8.5 6.5 12 3l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
      </li>
    </ol>
    <button class="btn ok" @click="emit('close')">知道了</button>
  </AppModal>
</template>

<style scoped>
.desc {
  margin: 0 0 14px;
  color: var(--c-muted);
  font-size: 15px;
}
.steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 17px;
  line-height: 1.5;
}
.n {
  flex: none;
  width: 26px;
  height: 26px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--c-amber);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
}
.share {
  width: 1.15em;
  height: 1.15em;
  vertical-align: -0.2em;
  color: var(--c-blue);
}
.ok {
  width: 100%;
  margin-top: 18px;
  height: 48px;
  font-size: 17px;
}
</style>
