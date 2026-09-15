<script setup lang="ts">
import { ref } from 'vue'
import AppModal from '@/components/AppModal.vue'

/** 家长锁：一道两位数加法，刚学拼音的孩子算不出，家长秒答 */
const emit = defineEmits<{ pass: []; close: [] }>()

const a = 10 + Math.floor(Math.random() * 40)
const b = 10 + Math.floor(Math.random() * 40)
const answer = ref('')
const tries = ref(0)
const wrong = ref(false)

function submit(): void {
  if (Number(answer.value) === a + b) {
    emit('pass')
    return
  }
  tries.value += 1
  wrong.value = true
  answer.value = ''
  if (tries.value >= 3) emit('close')
}
</script>

<template>
  <AppModal title="请爸爸妈妈来" @close="emit('close')">
    <p class="q">{{ a }} + {{ b }} = ?</p>
    <form class="row" @submit.prevent="submit">
      <input v-model="answer" class="input" type="number" inputmode="numeric" autofocus placeholder="答案" />
      <button class="btn" type="submit">确定</button>
    </form>
    <p v-if="wrong" class="warn">不对，再算一次（还有 {{ 3 - tries }} 次）</p>
  </AppModal>
</template>

<style scoped>
.q {
  font-size: 32px;
  text-align: center;
  margin: 8px 0 16px;
}

.row {
  display: flex;
  gap: 10px;
}

.row .input {
  flex: 1;
  font-size: 22px;
  text-align: center;
}

.warn {
  color: var(--c-bad);
  font-size: 14px;
  text-align: center;
  margin: 12px 0 0;
}
</style>
