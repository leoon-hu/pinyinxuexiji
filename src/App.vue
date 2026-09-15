<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import TopBar from '@/components/TopBar.vue'
import ScreenPanel from '@/components/ScreenPanel.vue'
import KeyGrid from '@/components/KeyGrid.vue'
import ToneRow from '@/components/ToneRow.vue'
import ActionBar from '@/components/ActionBar.vue'
import ToneMark from '@/components/ToneMark.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GiftModal from '@/components/modals/GiftModal.vue'
import ParentLock from '@/components/modals/ParentLock.vue'
import ParentModal from '@/components/modals/ParentModal.vue'
import ChartModal from '@/components/modals/ChartModal.vue'
import AdvancedLogModal from '@/components/modals/AdvancedLogModal.vue'
import { INITIALS, FINALS, WHOLES, TONES, isMedial, MEDIAL_FINALS, type Initial, type Final, type Whole } from '@/data/pinyin'
import { PROMPTS } from '@/data/prompts'
import { initialSound, finalSound, wholeSound, promptSound } from '@/data/sounds'
import {
  state, inQuiz, keysLocked,
  pressInitial, pressFinal, pressWhole, pressTone,
  toggleEcho, toggleWholes, confirmDialogAnswer, interrupt, resumeQuiz,
} from '@/store/session'
import { progress } from '@/store/progress'
import { initAudio, unlockAudio, preload, configureAudio } from '@/services/audio'
import { configureSfx } from '@/services/sfx'

type Panel = 'gift' | 'lock' | 'parent' | 'chart' | 'log' | null
const panel = ref<Panel>(null)

function openPanel(p: 'gift' | 'parent' | 'log'): void {
  // 弹窗盖住键盘，底下的序列（演示 / 跟读 / 测验过渡）先停
  interrupt()
  panel.value = p === 'parent' ? 'lock' : p
}

function closePanel(): void {
  panel.value = null
  // 如果打断的是「答对 → 下一题」的过渡，接着推进
  resumeQuiz()
}

/** 跟读按钮的文字：播放中 → 停止；一行完 → 继续 n/4 */
function echoLabel(kind: 'initials' | 'finals' | 'finalsTones'): string {
  const e = state.echo
  if (!e || e.kind !== kind) return '跟读'
  if (e.active) return `停止 ${e.row + 1}/${e.rows}`
  return `继续 ${e.row + 1}/${e.rows}`
}

/** 拼读态里，已有声母、当前选的 i/u/ü 还能当介母时，给可接的韵母标「介」 */
const medialBadge = computed(() => {
  if (state.mode !== 'spell' && state.mode !== 'advanced') return []
  const f = state.sel.final
  if (!state.sel.initial || !f || state.sel.medial || !isMedial(f)) return []
  return MEDIAL_FINALS[f]
})

/** 韵母键盘四行按教材分组着色 */
const FINAL_TINTS = ['var(--tint-1)', 'var(--tint-2)', 'var(--tint-3)', 'var(--tint-4)']

const showWholes = computed(() => state.showWholes && !inQuiz.value)

// 家长设置 → 播放引擎
watch(
  () => [progress.settings.volume, progress.settings.ttsFallback, progress.settings.sfx] as const,
  ([volume, ttsFallback, sfx]) => {
    configureAudio({ volume, ttsFallback })
    configureSfx(sfx)
  },
  { immediate: true },
)

onMounted(async () => {
  // 每次触摸都试着解锁 / 恢复音频上下文（iOS / Safari 会在打电话、切后台后重新挂起），很便宜
  const unlock = () => unlockAudio()
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('touchend', unlock, { passive: true })
  window.addEventListener('keydown', unlock)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) unlockAudio()
  })

  await initAudio()
  // 预解码核心键：声母、韵母（含四声）、整体认读、引导语；音节按需加载
  const core: string[] = [
    ...INITIALS.map((i) => initialSound(i).key),
    ...FINALS.map((f) => finalSound(f).key),
    ...FINALS.flatMap((f) => TONES.map((t) => finalSound(f, t).key)),
    ...WHOLES.map((w) => wholeSound(w).key),
    ...(Object.keys(PROMPTS) as Array<keyof typeof PROMPTS>).map((p) => promptSound(p).key),
  ]
  void preload(core)
})
</script>

<template>
  <div class="app">
    <TopBar @open="openPanel" />

    <section class="panel screen-panel">
      <ScreenPanel @open="openPanel" />
    </section>

    <section class="panel keys">
      <div class="row-head">
        <span class="chip tag tag-initial">声母</span>
        <button
          class="chip"
          :class="{ active: state.echo?.kind === 'initials' }"
          :disabled="inQuiz || showWholes"
          @click="toggleEcho('initials')"
        >
          {{ echoLabel('initials') }}
        </button>
        <button class="chip whole" :class="{ active: showWholes }" :disabled="inQuiz" @click="toggleWholes">
          整体认读音节
        </button>
      </div>

      <KeyGrid
        v-if="!showWholes"
        :items="INITIALS"
        kind="initial"
        :rows="4"
        :selected="state.sel.initial"
        :playing="state.playing"
        :enabled="state.enabledKeys"
        :wrong="state.wrongKeys"
        :hint="state.hint"
        :review="state.reviewKeys"
        @press="pressInitial($event as Initial)"
      />
      <KeyGrid
        v-else
        :items="WHOLES"
        kind="whole"
        :rows="4"
        :selected="state.sel.whole"
        :playing="state.playing"
        @press="pressWhole($event as Whole)"
      />

      <div class="row-head finals-head">
        <span class="chip tag tag-final">韵母</span>
        <button
          class="chip"
          :class="{ active: state.echo?.kind === 'finals' }"
          :disabled="inQuiz"
          @click="toggleEcho('finals')"
        >
          {{ echoLabel('finals') }}
        </button>
        <button
          class="chip"
          :class="{ active: state.echo?.kind === 'finalsTones' }"
          :disabled="inQuiz"
          @click="toggleEcho('finalsTones')"
        >
          {{ echoLabel('finalsTones') }}<span class="marks"><ToneMark :tone="3" :size="14" /><ToneMark :tone="4" :size="14" /></span>
        </button>
      </div>

      <ToneRow
        :selected="state.sel.tone"
        :playing="state.playingTone"
        :disabled="state.mode === 'basic' || keysLocked"
        :flash="state.flashTones"
        @press="pressTone"
      />

      <KeyGrid
        :items="FINALS"
        kind="final"
        :selected="[state.sel.medial, state.sel.final].filter((x): x is Final => !!x)"
        :playing="state.playing"
        :enabled="state.enabledKeys"
        :wrong="state.wrongKeys"
        :hint="state.hint"
        :review="state.reviewKeys"
        :row-tints="FINAL_TINTS"
        :medial-badge="medialBadge"
        @press="pressFinal($event as Final)"
      />

      <ActionBar class="actions" />
    </section>

    <ConfirmDialog
      v-if="state.confirmDialog"
      :text="state.confirmDialog.text"
      :icon="state.confirmDialog.icon"
      @answer="confirmDialogAnswer"
    />
    <GiftModal v-if="panel === 'gift'" @close="closePanel" />
    <ParentLock v-else-if="panel === 'lock'" @pass="panel = 'parent'" @close="closePanel" />
    <ParentModal v-else-if="panel === 'parent'" @close="closePanel" @chart="panel = 'chart'" />
    <ChartModal v-else-if="panel === 'chart'" @close="panel = 'parent'" />
    <AdvancedLogModal v-else-if="panel === 'log'" @close="closePanel" />
  </div>
</template>

<style scoped>
.app {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.keys {
  display: flex;
  flex-direction: column;
  gap: var(--row-gap);
}

.row-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.finals-head {
  margin-top: 24px;
}

.marks {
  display: inline-flex;
  gap: 1px;
  color: var(--c-tone);
  margin-left: 2px;
}

.chip.active .marks {
  color: #fff;
}

.tag-initial {
  color: var(--c-initial);
}

.tag-final {
  color: var(--c-final);
}

.whole {
  margin-left: auto;
  color: var(--c-whole);
}

.actions {
  margin-top: 24px;
}

@media (max-width: 480px) {
  .finals-head,
  .actions {
    margin-top: 14px;
  }
}

/* iPad 横屏等矮宽视口：左栏顶栏 + 显示屏，右栏键盘，一屏放下 */
@media (min-width: 900px) and (max-height: 1000px) {
  .app {
    max-width: 1120px;
    display: grid;
    grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
    grid-template-rows: max-content 1fr;
    align-items: start;
    column-gap: 12px;
    row-gap: 8px;
  }

  .screen-panel {
    position: sticky;
    top: 8px;
  }

  .keys {
    grid-column: 2;
    grid-row: 1 / span 2;
    gap: var(--row-gap);
  }

  .finals-head,
  .actions {
    margin-top: 10px;
  }
}
</style>
