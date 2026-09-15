<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { keyId, type KeyKind } from '@/store/state'

const props = withDefaults(
  defineProps<{
    items: readonly string[]
    kind: Exclude<KeyKind, 'tone'>
    columns?: number
    /** 固定行数，不足的补空白键，切换声母/整体认读时高度不跳 */
    rows?: number
    selected?: string | string[] | null
    /** 正在发声的键 id */
    playing?: string | null
    /** 本题允许点的键 id；null = 全部 */
    enabled?: string[] | null
    wrong?: string[]
    hint?: string | null
    review?: string[]
    disabled?: boolean
    /** 每行的底色（按教材分组） */
    rowTints?: string[]
    /** 显示「介」角标的键 */
    medialBadge?: string[]
  }>(),
  {
    columns: 6, rows: undefined, selected: null, playing: null, enabled: null,
    wrong: () => [], hint: null, review: () => [], disabled: false, rowTints: () => [], medialBadge: () => [],
  },
)

const emit = defineEmits<{ press: [value: string] }>()

const cells = computed<Array<string | null>>(() => {
  const total = props.rows ? props.columns * props.rows : Math.ceil(props.items.length / props.columns) * props.columns
  const list: Array<string | null> = [...props.items]
  while (list.length < total) list.push(null)
  return list
})

function classes(item: string) {
  const id = keyId(props.kind, item)
  const off = props.enabled !== null && !props.enabled.includes(id)
  return {
    selected: Array.isArray(props.selected) ? props.selected.includes(item) : props.selected === item,
    playing: props.playing === id,
    off: off && !props.wrong.includes(id),
    wrong: props.wrong.includes(id),
    hint: props.hint === id,
    review: props.review.includes(id),
  }
}

function isDisabled(item: string): boolean {
  if (props.disabled) return true
  const id = keyId(props.kind, item)
  if (props.wrong.includes(id)) return true
  return props.enabled !== null && !props.enabled.includes(id)
}

function tint(index: number): string | undefined {
  const row = Math.floor(index / props.columns)
  return props.rowTints[row]
}

const root = ref<HTMLElement | null>(null)
const myIds = computed(() => new Set(props.items.map((it) => keyId(props.kind, it))))

/** 小屏上候选键 / 闪烁键可能被底部按钮条盖住：状态一变就把它滚到看得见的地方 */
function reveal(selector: string | null): void {
  void nextTick(() => {
    const el = selector ? root.value?.querySelector<HTMLElement>(selector) : root.value
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}
watch(
  () => props.hint,
  (h) => {
    if (h && myIds.value.has(h)) reveal('.key.hint')
  },
)
watch(
  () => props.enabled,
  (list) => {
    if (list && list.some((id) => myIds.value.has(id))) reveal(null)
  },
)
watch(
  () => props.review,
  (list) => {
    if (list.some((id) => myIds.value.has(id))) reveal('.key.review')
  },
)
</script>

<template>
  <div ref="root" class="grid" :class="`grid-${kind}`" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
    <template v-for="(item, i) in cells" :key="i">
      <button
        v-if="item !== null"
        class="key pinyin"
        :class="classes(item)"
        :style="tint(i) ? { '--key-bg': tint(i) } : undefined"
        :disabled="isDisabled(item)"
        @click="emit('press', item)"
      >
        {{ item }}
        <span v-if="medialBadge.includes(item)" class="badge">介</span>
      </button>
      <div v-else class="key blank" :class="{ off: enabled !== null }" :style="tint(i) ? { '--key-bg': tint(i) } : undefined" />
    </template>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--row-gap) var(--gap);
}

.grid-initial .key {
  color: var(--c-initial);
  --sel-bg: #f1e9ff;
}

.grid-final .key {
  color: var(--c-final);
  --sel-bg: #e6f5ea;
}

.grid-whole .key {
  color: var(--c-whole);
  --sel-bg: #fdeee2;
  font-size: calc(var(--key-font) * 0.85);
}

.badge {
  position: absolute;
  top: 3px;
  right: 5px;
  font-family: var(--font-ui);
  font-size: 11px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--c-medial);
  color: #fff;
}
</style>
