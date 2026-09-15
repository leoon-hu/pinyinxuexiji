<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { install, installWay, promptInstall, dismissInstall } from '@/services/install'
import InstallStepsModal from '@/components/modals/InstallStepsModal.vue'

/**
 * 页面顶部的「安装 拼音学习机」提示条（需求 5.6）：给家长看的静态一条，不配语音；
 * 四个站同一套规则与结构：图标 + 粗体标题 + 一句说明 + 主按钮（安装 / 怎么做）+ ×。
 */
const sheet = ref(false)
const iconSrc = `${import.meta.env.BASE_URL}icon-192.png`
// 每次挂载重新取当前时间：静默期到了就重新出现
onMounted(() => (install.now = Date.now()))

function dismiss(): void {
  sheet.value = false
  dismissInstall()
}

async function primary(): Promise<void> {
  if (installWay.value === 'prompt') await promptInstall()
  else sheet.value = true
}
</script>

<template>
  <aside v-if="installWay" class="banner" role="note" aria-label="安装 拼音学习机">
    <img class="icon" :src="iconSrc" alt="" draggable="false" />
    <div class="text">
      <strong class="title">安装 拼音学习机</strong>
      <span class="desc">全屏打开，没有网也能用</span>
    </div>
    <button class="btn primary" @click="primary">{{ installWay === 'prompt' ? '安装' : '怎么做' }}</button>
    <button class="close" aria-label="关闭安装提示" @click="dismiss">×</button>
  </aside>
  <InstallStepsModal v-if="sheet && installWay && installWay !== 'prompt'" :kind="installWay" @close="dismiss" />
</template>

<style scoped>
/* 顶栏之上的一条：和面板同色，键盘被往下挤一点，关掉即恢复 */
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 0;
  padding: 8px 4px 8px 12px;
  background: var(--c-panel);
  border-radius: var(--radius-panel);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
.icon {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
}
.text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
}
.title {
  font-size: 15px;
  font-weight: 600;
}
.desc {
  font-size: 13px;
  color: var(--c-muted);
}
.primary {
  flex: none;
  height: 40px;
  padding: 0 16px;
  border-radius: 20px;
}
.close {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: none;
  color: var(--c-muted);
  font-size: 24px;
  line-height: 1;
}
</style>
