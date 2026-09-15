<script setup lang="ts">
import { state, replay, clear, confirm, canReplay, canClear, canConfirm, confirmLabel } from '@/store/session'
</script>

<template>
  <div class="bar">
    <button class="act replay" :disabled="!canReplay" @click="replay">
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 5.5a8 8 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      重听
    </button>
    <button class="act clear" :disabled="!canClear" @click="clear">
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d="M9 4h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9l-6-8 6-8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        <path d="M12 9l6 6M18 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      清除
    </button>
    <button class="act confirm" :class="{ ready: canConfirm, flash: state.flashConfirm }" :disabled="!canConfirm" @click="confirm">
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ confirmLabel }}
    </button>
  </div>
</template>

<style scoped>
.bar {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr;
  gap: 30px;
}

.act {
  height: 60px;
  border-radius: 6px;
  color: #fff;
  font-size: 28px;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    filter 0.12s,
    background 0.15s;
}

.act:not(:disabled):active {
  filter: brightness(0.92);
}

.replay {
  background: var(--c-amber);
}

.clear {
  background: var(--c-blue);
}

.confirm {
  background: var(--c-gray);
}

.confirm.ready {
  background: var(--c-green);
}

.replay:disabled {
  opacity: 0.8;
}

/* 清除在测验里没用：明显灰掉，别让孩子去戳 */
.clear:disabled {
  opacity: 0.35;
}

/* 高级测验揭晓后提醒按确定 */
.confirm.flash {
  animation: act-flash 0.8s ease-in-out infinite;
}

@keyframes act-flash {
  0%,
  100% {
    transform: scale(1);
    box-shadow: none;
  }
  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 4px var(--c-amber);
  }
}

@media (min-width: 700px) and (min-height: 900px) and (orientation: portrait) {
  .act {
    height: 72px;
    font-size: 30px;
  }
}

@media (max-width: 560px) {
  .bar {
    position: sticky;
    bottom: 0;
    gap: 10px;
    padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
    background: linear-gradient(to top, var(--c-panel) 70%, rgba(255, 248, 237, 0));
    z-index: 2;
  }

  .act {
    height: 46px;
    font-size: 20px;
    gap: 4px;
  }

  .act svg {
    width: 22px;
    height: 22px;
  }
}
</style>
