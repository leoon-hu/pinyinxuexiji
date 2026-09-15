<script setup lang="ts">
import { computed, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import ParentLock from '@/components/modals/ParentLock.vue'
import CoinIcon from '@/components/CoinIcon.vue'
import { progress, redeem, type Gift } from '@/store/progress'
import { run } from '@/store/runner'
import { prompt } from '@/store/player'

const emit = defineEmits<{ close: [] }>()

const pending = ref<Gift | null>(null)
const done = ref<Gift | null>(null)
/** 金币不够时点了哪个：摇一摇 */
const shaking = ref<string | null>(null)

const gifts = computed(() => [...progress.gifts].sort((a, b) => a.cost - b.cost))

function want(gift: Gift): void {
  if (progress.coins < gift.cost) {
    shaking.value = gift.id
    setTimeout(() => (shaking.value = null), 450)
    void run((signal) => prompt('not-enough', signal))
    return
  }
  pending.value = gift
  void run((signal) => prompt('parent', signal))
}

function confirmed(): void {
  const gift = pending.value
  pending.value = null
  if (!gift || !redeem(gift)) return
  done.value = gift
  void run((signal) => prompt('gift-done', signal))
}
</script>

<template>
  <AppModal title="礼物" @close="emit('close')">
    <div class="wallet">
      <CoinIcon :size="34" />
      <b class="num">{{ progress.coins }}</b>
    </div>

    <div v-if="done" class="done">
      🎉 {{ done.emoji }} {{ done.name }}，去找爸爸妈妈领吧！
    </div>

    <ul class="gifts">
      <li v-for="g in gifts" :key="g.id">
        <button class="gift" :class="{ can: progress.coins >= g.cost, shake: shaking === g.id }" @click="want(g)">
          <span class="emoji">{{ g.emoji }}</span>
          <span class="name">{{ g.name }}</span>
          <span class="cost"><CoinIcon :size="16" /> {{ g.cost }}</span>
        </button>
      </li>
    </ul>
    <p class="tip">做测验答对能赚金币，每天第一轮再多给 10 个；亮起来的礼物就可以换，换的时候请爸爸妈妈来确认。</p>

    <ParentLock v-if="pending" @pass="confirmed" @close="pending = null" />
  </AppModal>
</template>

<style scoped>
.wallet {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.num {
  font-size: 32px;
  color: var(--c-coin);
}

.done {
  background: #e6f5ea;
  color: var(--c-final);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  font-size: 16px;
  text-align: center;
}

.gifts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.gift {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--c-key);
  border-radius: 12px;
  padding: 12px 8px;
  box-shadow: var(--shadow-chip);
  opacity: 0.45;
}

.gift.can {
  opacity: 1;
  box-shadow:
    var(--shadow-chip),
    0 0 0 2px var(--c-amber);
}

.gift.can:active {
  transform: scale(0.97);
}

.gift.shake {
  animation: gift-shake 0.4s;
}

@keyframes gift-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-6px);
  }
  50% {
    transform: translateX(6px);
  }
  75% {
    transform: translateX(-3px);
  }
}

.emoji {
  font-size: 40px;
}

.name {
  font-size: 14px;
}

.cost {
  color: var(--c-coin);
  font-weight: 700;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.tip {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--c-muted);
}
</style>
