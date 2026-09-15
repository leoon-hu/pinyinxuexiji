<script setup lang="ts">
defineProps<{ text: string; icon: string }>()
const emit = defineEmits<{ answer: [yes: boolean] }>()
</script>

<template>
  <div class="mask" @click.self="emit('answer', false)">
    <div class="box">
      <div class="icon">{{ icon }}</div>
      <div class="text">{{ text }}</div>
      <div class="btns">
        <button class="no" aria-label="继续" @click="emit('answer', false)">↩️ 继续做</button>
        <button class="yes" aria-label="确定" @click="emit('answer', true)">✓ 不做了</button>
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
  z-index: 20;
}

.box {
  width: min(360px, 100%);
  background: var(--c-panel);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.icon {
  font-size: 48px;
}

.text {
  font-size: 18px;
  margin: 8px 0 16px;
}

.btns {
  display: flex;
  gap: 12px;
}

.btns button {
  flex: 1;
  height: 52px;
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
}

.no {
  background: var(--c-blue);
}

.yes {
  background: var(--c-gray);
}
</style>
