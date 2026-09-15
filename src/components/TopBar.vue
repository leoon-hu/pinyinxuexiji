<script setup lang="ts">
import { ref } from 'vue'
import CoinIcon from '@/components/CoinIcon.vue'
import { progress } from '@/store/progress'

const emit = defineEmits<{ open: [panel: 'gift' | 'parent'] }>()

/** 齿轮要按住 1.2 秒才打开家长区，避免孩子误触 */
const HOLD_MS = 1200
const holding = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function holdStart(): void {
  holding.value = true
  timer = setTimeout(() => {
    holding.value = false
    timer = null
    emit('open', 'parent')
  }, HOLD_MS)
}

function holdEnd(): void {
  holding.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}
</script>

<template>
  <header class="top">
    <button class="coins" title="金币" @click="emit('open', 'gift')">
      <CoinIcon :size="26" />
      <span class="num">{{ progress.coins }}</span>
    </button>
    <button class="gift" title="礼物" @click="emit('open', 'gift')">🎁</button>
    <span class="spacer" />
    <button
      class="gear"
      :class="{ holding }"
      title="家长设置（按住）"
      @pointerdown.prevent="holdStart"
      @pointerup="holdEnd"
      @pointerleave="holdEnd"
      @pointercancel="holdEnd"
      @contextmenu.prevent
    >
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path
          d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.6 3.5c0-.5 0-1-.1-1.4l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.4-1.4L15.3 2h-4l-.4 2.7c-.9.3-1.7.8-2.4 1.4l-2.4-1-2 3.4 2 1.6a8 8 0 0 0 0 2.8l-2 1.6 2 3.4 2.4-1c.7.6 1.5 1.1 2.4 1.4l.4 2.7h4l.4-2.7c.9-.3 1.7-.8 2.4-1.4l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.4z"
          fill="currentColor"
        />
      </svg>
      <span class="hold-ring" :style="{ '--hold': `${HOLD_MS}ms` }" />
    </button>
  </header>
</template>

<style scoped>
.top {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 56px;
  padding: 0 6px;
}

.coins {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 12px 0 8px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--c-coin);
  font-size: 20px;
  font-weight: 700;
}

.gift {
  font-size: 26px;
  line-height: 1;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spacer {
  flex: 1;
}

.gear {
  position: relative;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
}

.hold-ring {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 3px solid transparent;
}

.gear.holding .hold-ring {
  border-color: var(--c-amber);
  animation: hold-grow var(--hold, 1200ms) linear forwards;
}

/* 平板竖屏：放大 */
@media (min-width: 700px) and (min-height: 900px) and (orientation: portrait) {
  .top {
    height: 64px;
  }

  .coins {
    height: 46px;
    font-size: 24px;
  }

  .gift,
  .gear {
    width: 52px;
    height: 52px;
  }

  .gift {
    font-size: 32px;
  }

  .gear svg {
    width: 30px;
    height: 30px;
  }
}

/* 手机：竖排在显示屏左边（App.vue 把它塞进 ScreenPanel 的插槽） */
@media (max-width: 560px) {
  .top {
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    min-height: 120px;
    width: 64px;
    gap: 4px;
    padding: 0;
  }

  .coins {
    height: 32px;
    padding: 0 8px 0 6px;
    font-size: 16px;
    background: var(--c-key);
    box-shadow: var(--shadow-chip);
  }

  .gift,
  .gear {
    width: 36px;
    height: 36px;
  }

  .gift {
    font-size: 24px;
  }

  .spacer {
    display: none;
  }

  /* 在奶油色面板上，白色齿轮看不见 */
  .gear {
    color: var(--c-gray);
  }
}

@keyframes hold-grow {
  from {
    transform: scale(0.3);
    opacity: 0.4;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
