<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="dialog" role="dialog" :aria-label="title">
      <header class="head">
        <h2 class="title">{{ title }}</h2>
        <button class="close" aria-label="关闭" @click="emit('close')">×</button>
      </header>
      <div class="body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10;
}

.dialog {
  width: min(520px, 100%);
  max-height: 85vh;
  background: var(--c-panel);
  border-radius: var(--radius-panel);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.head {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-line);
}

.title {
  margin: 0;
  font-size: 18px;
  flex: 1;
}

.close {
  font-size: 26px;
  line-height: 1;
  color: var(--c-muted);
  width: 32px;
  height: 32px;
}

.body {
  padding: 16px;
  overflow-y: auto;
}
</style>
