<script setup lang="ts">
import AppModal from '@/components/AppModal.vue'
import { INITIALS, FINALS, WHOLES, isInitial, isFinal, isWhole } from '@/data/pinyin'
import { initialSound, finalSound, wholeSound } from '@/data/sounds'
import { play } from '@/services/audio'
import { run } from '@/store/runner'

const emit = defineEmits<{ close: [] }>()

/** 全表按《汉语拼音方案》顺序（zh ch sh r 在 z c s 前），与键盘的教学顺序不同 */
const SCHEME_INITIALS = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w']

const GROUPS = [
  { kind: 'initial', title: '声母 23 个', items: SCHEME_INITIALS.filter(isInitial), cls: 'c-initial' },
  { kind: 'final', title: '韵母 24 个', items: [...FINALS], cls: 'c-final' },
  { kind: 'whole', title: '整体认读音节 16 个', items: [...WHOLES], cls: 'c-whole' },
] as const

void INITIALS

function preview(kind: 'initial' | 'final' | 'whole', value: string): void {
  const s = kind === 'initial' && isInitial(value) ? initialSound(value)
    : kind === 'final' && isFinal(value) ? finalSound(value)
    : isWhole(value) ? wholeSound(value) : null
  if (s) void run((signal) => play(s.key, s.text, signal))
}
</script>

<template>
  <AppModal title="拼音大全" @close="emit('close')">
    <p class="tip">点一下就能听到读音（按《汉语拼音方案》顺序）</p>
    <section v-for="g in GROUPS" :key="g.kind" class="group">
      <h3 class="sub">{{ g.title }}</h3>
      <div class="list">
        <button v-for="it in g.items" :key="it" class="item pinyin" :class="g.cls" @click="preview(g.kind, it)">
          {{ it }}
        </button>
      </div>
    </section>
  </AppModal>
</template>

<style scoped>
.tip {
  margin: 0 0 8px;
  color: var(--c-muted);
  font-size: 13px;
}

.group + .group {
  margin-top: 14px;
}

.sub {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
}

.list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.item {
  min-width: 48px;
  height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--c-key);
  box-shadow: var(--shadow-chip);
  font-size: 22px;
}

.item:active {
  background: var(--c-key-press);
}

.c-initial {
  color: var(--c-initial);
}

.c-final {
  color: var(--c-final);
}

.c-whole {
  color: var(--c-whole);
}
</style>
