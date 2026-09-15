<script setup lang="ts">
import { computed } from 'vue'
import ToneMark from '@/components/ToneMark.vue'
import type { Tone } from '@/data/pinyin'
import { state, setMode, screenAction } from '@/store/session'
import { advancedStats } from '@/store/progress'
import { MODE_LABEL, MODE_ICON, type Mode, type Piece } from '@/store/state'

const emit = defineEmits<{ open: [panel: 'log'] }>()

const MODES: Mode[] = ['read', 'spell', 'basic', 'advanced']

const PIECE_LABEL: Record<Piece['kind'], string> = {
  initial: '声母', medial: '介母', final: '韵母', tone: '声调', whole: '整体认读',
}

const screen = computed(() => state.screen)

/** 高级测验：今天已检测 / 正确 / 错误（点开看逐题记录） */
const stats = computed(() => (state.mode === 'advanced' ? advancedStats() : null))

/** 大字：j q x y 后去点的 u 单独标橙 */
const bigParts = computed(() => {
  const big = screen.value.big
  if (!screen.value.uHint) return [{ text: big, u: false }]
  const idx = big.search(/[uūúǔù]/)
  if (idx < 0) return [{ text: big, u: false }]
  return [
    { text: big.slice(0, idx), u: false },
    { text: big[idx]!, u: true },
    { text: big.slice(idx + 1), u: false },
  ]
})

const pieceTone = (p: Piece): Tone | null => (p.kind === 'tone' && p.text ? (Number(p.text) as Tone) : null)
</script>

<template>
  <div class="wrap">
    <div class="side"><slot /></div>
    <div class="screen" :class="[screen.status && `is-${screen.status}`]">
      <button v-if="stats" class="stats" title="今天的高级测验记录" @click="emit('open', 'log')">
        <span class="s-item">已测 <b>{{ stats.total }}</b></span>
        <span class="s-item ok">正确 <b>{{ stats.correct }}</b></span>
        <span class="s-item bad">错误 <b>{{ stats.wrong }}</b></span>
        <span class="s-more">记录 ›</span>
      </button>
      <div v-if="screen.progress" class="dots">
        <span v-for="(d, i) in screen.progress" :key="i" class="dot" :class="d ?? ''" />
      </div>

      <div v-if="screen.pieces" class="pieces pinyin">
        <template v-for="(p, i) in screen.pieces" :key="i">
          <span v-if="i > 0" class="plus">+</span>
          <span class="piece" :class="[`k-${p.kind}`, { empty: !p.text, lit: p.lit, bad: p.bad }]">
            <template v-if="p.kind === 'tone'">
              <ToneMark v-if="pieceTone(p)" :tone="pieceTone(p)!" :size="26" />
              <span v-else class="ph">{{ PIECE_LABEL.tone }}</span>
            </template>
            <template v-else>
              <template v-if="p.text">{{ p.text }}</template>
              <span v-else class="ph">{{ PIECE_LABEL[p.kind] }}</span>
            </template>
          </span>
        </template>
      </div>

      <div class="main">
        <span v-if="screen.icon" class="icon" :class="{ waiting: screen.waiting }">
          {{ screen.icon }}
          <svg v-if="screen.waiting" class="ring" viewBox="0 0 40 40" :style="{ '--wait': `${screen.waitMs}ms` }">
            <circle cx="20" cy="20" r="17" />
          </svg>
        </span>
        <span v-if="screen.big" class="big pinyin">
          <span v-for="(part, i) in bigParts" :key="i" :class="{ u: part.u }">{{ part.text }}</span>
        </span>
        <span v-if="screen.char" class="char" :class="{ solo: !screen.big }">{{ screen.char }}</span>
      </div>

      <div v-if="screen.words.length" class="words">
        <span v-for="(w, i) in screen.words" :key="w" class="word" :class="{ lit: screen.wordLit === i }">{{ w }}</span>
      </div>

      <div v-if="screen.actions.length" class="actions">
        <button v-for="a in screen.actions" :key="a.id" class="action" @click="screenAction(a.id)">
          <span class="a-icon">{{ a.icon }}</span>{{ a.label }}
        </button>
      </div>

      <div v-if="screen.note" class="note">{{ screen.note }}</div>
    </div>

    <div class="modes">
      <button
        v-for="m in MODES"
        :key="m"
        class="mode"
        :class="{ active: state.mode === m, suggest: m === 'spell' && state.suggestSpell }"
        @click="setMode(m)"
      >
        <span class="m-icon">{{ MODE_ICON[m] }}</span>{{ MODE_LABEL[m] }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 20px;
  padding: 4px 20px;
}

/* 手机上放顶栏三个图标的侧栏，其它布局不显示 */
.side {
  display: none;
}

.screen {
  background: var(--c-screen);
  color: var(--c-screen-text);
  border-radius: 4px;
  min-height: 140px;
  padding: 8px 14px 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.screen.is-ok {
  box-shadow: inset 0 0 0 3px var(--c-ok);
}

.screen.is-bad {
  box-shadow: inset 0 0 0 3px var(--c-bad);
}

/* 高级测验的统计条：家长看的，孩子点了会打开记录面板 */
.stats {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 24px;
  margin: -2px 0 2px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #b8c2d2;
  font-size: 12px;
  line-height: 1;
}

.stats:active {
  background: rgba(255, 255, 255, 0.16);
}

.s-item b {
  color: #fff;
  font-size: 13px;
}

.s-item.ok b {
  color: var(--c-ok);
}

.s-item.bad b {
  color: #ff8a7a;
}

.s-more {
  color: var(--c-amber);
}

/* 测验进度点 */
.dots {
  align-self: stretch;
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 2px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #46536a;
  transition: transform 0.2s;
}

.dot.cur {
  background: #fff;
  transform: scale(1.3);
}

.dot.ok {
  background: var(--c-ok);
}

.dot.retry {
  background: var(--c-amber);
}

.dot.bad {
  background: var(--c-bad);
}

/* 部件框：与键盘同色 */
.pieces {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 22px;
}

.piece {
  min-width: 48px;
  height: 34px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 2px solid var(--pc, #7f8b9c);
  color: var(--pc, #dfe5ee);
  background: rgba(255, 255, 255, 0.06);
  transition:
    background 0.2s,
    transform 0.2s;
}

.piece.k-initial {
  --pc: #b39aff;
}

.piece.k-medial {
  --pc: #6fd0e6;
}

.piece.k-final {
  --pc: #8ee59a;
}

.piece.k-tone {
  --pc: #ff8a7a;
}

.piece.k-whole {
  --pc: #f0b58a;
  min-width: 90px;
}

.piece.empty {
  border-style: dashed;
  background: transparent;
}

.piece .ph {
  font-family: var(--font-ui);
  font-size: 12px;
  opacity: 0.7;
}

.piece.lit {
  background: var(--pc);
  color: #1f2b3c;
  transform: scale(1.06);
}

.piece.bad {
  border-color: var(--c-bad);
  color: var(--c-bad);
  animation: shake 0.4s;
}

.plus {
  color: #6f7c8f;
  font-size: 18px;
}

.main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 56px;
}

.icon {
  position: relative;
  font-size: 40px;
  line-height: 1;
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.ring circle {
  fill: none;
  stroke: var(--c-amber);
  stroke-width: 3;
  stroke-dasharray: 107;
  stroke-dashoffset: 0;
  animation: ring-shrink var(--wait, 1500ms) linear forwards;
}

.big {
  font-size: 50px;
  font-weight: 700;
  line-height: 1.1;
}

.big .u {
  color: var(--c-amber);
}

.char {
  font-size: 30px;
  color: #ffd27a;
}

/* 听题时只有例字：放大 */
.char.solo {
  font-size: 44px;
  font-weight: 700;
}

/* 例字的词语：朗读到哪个亮哪个 */
.words {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}

.word {
  padding: 2px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 210, 122, 0.5);
  color: #ffd27a;
  font-size: 20px;
  line-height: 1.4;
  transition:
    background 0.15s,
    color 0.15s,
    transform 0.15s;
}

.word.lit {
  background: #ffd27a;
  color: #1f2b3c;
  transform: scale(1.08);
}

.is-ok .big {
  color: #8ee59a;
}

.is-bad .big {
  color: #ff8a7a;
}

.note {
  font-size: 13px;
  color: #b8c2d2;
  text-align: center;
}

/* 结束页按钮 */
.actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.action {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  background: var(--c-amber);
  color: #fff;
  font-size: 17px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.action:active {
  filter: brightness(0.92);
}

.a-icon {
  font-size: 20px;
}

/* 模式按钮 */
.modes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}

.mode {
  height: 34px;
  border-radius: 4px;
  background: var(--c-gray);
  color: #fff;
  font-size: 17px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s;
}

.m-icon {
  font-size: 16px;
}

.mode.active {
  background: var(--c-orange);
  font-weight: 700;
}

.mode.suggest:not(.active) {
  animation: key-flash 0.9s ease-in-out infinite;
  color: var(--c-orange);
}

.mode:not(.active):active {
  background: #9c9c9c;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  50% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-2px);
  }
}

@keyframes ring-shrink {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: 107;
  }
}

@media (max-width: 560px) {
  .wrap {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'side screen'
      'modes modes';
    padding: 0;
    gap: 8px;
  }

  .side {
    display: block;
    grid-area: side;
  }

  .screen {
    grid-area: screen;
  }

  .modes {
    grid-area: modes;
  }

  /* 显示屏收紧：空屏 120px；高级测验听题（统计条 + 进度点 + 部件 + 例字）也基本装得下 */
  .screen {
    min-height: var(--screen-h, 120px);
    padding: 6px 12px 8px;
    gap: 3px;
  }

  .stats {
    height: 20px;
    margin: 0;
  }

  .dots {
    margin-bottom: 0;
  }

  .dot {
    width: 8px;
    height: 8px;
  }

  .pieces {
    font-size: 20px;
  }

  .piece {
    min-width: 40px;
    height: 28px;
    padding: 0 8px;
  }

  .main {
    min-height: 48px;
    gap: 12px;
  }

  .icon {
    font-size: 34px;
    width: 48px;
    height: 48px;
  }

  .char {
    font-size: 26px;
  }

  .char.solo {
    font-size: 36px;
  }

  .note {
    font-size: 12px;
  }

  .action {
    height: 36px;
    font-size: 16px;
  }

  .modes {
    flex-direction: row;
  }

  .mode {
    flex: 1;
    font-size: clamp(12px, 3.6vw, 14px);
    gap: 3px;
    white-space: nowrap;
  }

  .big {
    font-size: 42px;
  }

  .stats {
    gap: 8px;
    font-size: 11px;
  }

  .word {
    font-size: 15px;
    padding: 1px 10px;
  }
}

/* 平板竖屏（iPad 等）：显示屏、字、模式键都放大 */
@media (min-width: 700px) and (min-height: 900px) and (orientation: portrait) {
  .wrap {
    grid-template-columns: 1fr 200px;
  }

  .screen {
    min-height: var(--screen-h, 198px);
  }

  .modes {
    gap: 10px;
  }

  .mode {
    height: 42px;
    font-size: 19px;
  }

  .m-icon {
    font-size: 18px;
  }

  .stats {
    height: 28px;
    font-size: 14px;
  }

  .s-item b {
    font-size: 15px;
  }

  .pieces {
    font-size: 26px;
  }

  .piece {
    min-width: 56px;
    height: 40px;
  }

  .main {
    min-height: 64px;
  }

  .icon {
    width: 64px;
    height: 64px;
    font-size: 46px;
  }

  .big {
    font-size: clamp(50px, 5vh, 68px);
  }

  .char {
    font-size: clamp(30px, 3vh, 40px);
  }

  .char.solo {
    font-size: clamp(44px, 4.5vh, 60px);
  }

  .word {
    font-size: 22px;
  }

  .note {
    font-size: 15px;
  }

  .action {
    height: 44px;
    font-size: 19px;
  }
}

/* iPad 横屏等矮宽视口：显示屏在左栏，模式键横排在屏幕下面 */
@media (min-width: 900px) and (max-height: 1040px) and (orientation: landscape) {
  .wrap {
    grid-template-columns: 1fr;
    padding: 0;
    gap: 10px;
  }

  .screen {
    min-height: clamp(170px, 22vh, 260px);
  }

  .modes {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .mode {
    height: 40px;
  }
}
</style>
