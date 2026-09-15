<script setup lang="ts">
/** 金币图标用 SVG 画，不同系统的 🪙 emoji 长得不一样 */
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" aria-hidden="true">
    <ellipse cx="12" cy="17" rx="8" ry="3.5" fill="#e0901c" />
    <ellipse cx="12" cy="14" rx="8" ry="3.5" fill="#f5b731" stroke="#e0901c" stroke-width="0.8" />
    <ellipse cx="12" cy="11" rx="8" ry="3.5" fill="#f5b731" stroke="#e0901c" stroke-width="0.8" />
    <ellipse cx="12" cy="8" rx="8" ry="3.5" fill="#ffd45c" stroke="#e0901c" stroke-width="0.8" />
  </svg>
</template>
