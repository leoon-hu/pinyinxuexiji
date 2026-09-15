<script setup lang="ts">
import type { Tone } from '@/data/pinyin'

/** 声调符号统一用线段画，按键、屏幕、小按钮里粗细一致 */
withDefaults(defineProps<{ tone: Tone; size?: number }>(), { size: 28 })

const PATHS: Record<Tone, string> = {
  1: 'M4 13 H28',
  2: 'M8 22 L24 4',
  3: 'M6 6 L16 20 L26 6',
  4: 'M8 4 L24 22',
}
</script>

<template>
  <svg viewBox="0 0 32 26" :width="size" :height="size * 0.8125" aria-hidden="true">
    <path :d="PATHS[tone]" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
