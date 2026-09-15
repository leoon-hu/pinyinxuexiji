<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import ToneMark from '@/components/ToneMark.vue'
import { TONES, TONE_NAMES, type Tone } from '@/data/pinyin'

const props = defineProps<{
  selected: Tone | null
  playing: Tone | null
  disabled?: boolean
  /** 提醒「再选一个声调」 */
  flash?: boolean
}>()

const emit = defineEmits<{ press: [tone: Tone] }>()

const root = ref<HTMLElement | null>(null)
watch(
  () => props.flash,
  (f) => {
    if (f) void nextTick(() => root.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  },
)
</script>

<template>
  <div ref="root" class="tones">
    <button
      v-for="t in TONES"
      :key="t"
      class="key tone"
      :class="{ selected: selected === t, playing: playing === t, hint: flash }"
      :disabled="disabled"
      :aria-label="TONE_NAMES[t]"
      @click="emit('press', t)"
    >
      <ToneMark :tone="t" :size="34" />
    </button>
  </div>
</template>

<style scoped>
.tones {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap);
}

.tone {
  color: var(--c-tone);
  --sel-bg: #fdeceb;
  height: max(38px, calc(var(--key-h) * 0.8));
}

@media (max-width: 560px) {
  .tone {
    height: max(34px, calc(var(--key-h) * 0.85));
  }
}
</style>
