<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { advancedToday, advancedStats, todayKey, type AdvancedRecord } from '@/store/progress'
import { restartAdvanced } from '@/store/session'
import { play } from '@/services/audio'
import { run } from '@/store/runner'
import { renderReport, canvasToBlob, canShareImage, shareImage } from '@/services/report'

const emit = defineEmits<{ close: [] }>()

const items = computed(() => advancedToday())
const stats = computed(() => advancedStats(items.value))

const RESULT_LABEL: Record<AdvancedRecord['result'], string> = { ok: '一次答对', retry: '重试后答对', bad: '三次都错' }

function fmtTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function replay(key: string): void {
  void run((signal) => play(key, '', signal))
}

/* 导出图片 */
const exporting = ref(false)
const imageUrl = ref('')
const imageName = computed(() => `拼音学习机-高级测验-${todayKey()}.png`)
const shareable = canShareImage()
const exportMsg = ref('')
let imageBlob: Blob | null = null

function revoke(): void {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
  imageBlob = null
}

async function exportImage(): Promise<void> {
  if (exporting.value) return
  exporting.value = true
  exportMsg.value = ''
  try {
    const canvas = await renderReport({ date: todayKey(), items: items.value, stats: stats.value })
    const blob = await canvasToBlob(canvas)
    revoke()
    imageBlob = blob
    imageUrl.value = URL.createObjectURL(blob)
    exportMsg.value = shareable ? '图片已生成：可以分享，或长按图片保存。' : '图片已生成：点「保存图片」，或长按 / 右键图片保存。'
  } catch (e) {
    exportMsg.value = `导出失败：${e instanceof Error ? e.message : String(e)}`
  } finally {
    exporting.value = false
  }
}

async function share(): Promise<void> {
  if (!imageBlob) return
  const ok = await shareImage(imageBlob, imageName.value, '拼音学习机 · 高级测验记录')
  if (!ok) exportMsg.value = '没有分享出去：可以长按图片保存后再发。'
}

onBeforeUnmount(revoke)

/* 重新测验 */
const confirming = ref(false)
function doRestart(): void {
  confirming.value = false
  restartAdvanced()
  emit('close')
}
</script>

<template>
  <AppModal title="今天的高级测验" @close="emit('close')">
    <div class="summary">
      <div class="tile">
        <span class="t-label">已测</span>
        <b class="t-val">{{ stats.total }}</b>
      </div>
      <div class="tile ok">
        <span class="t-label">正确</span>
        <b class="t-val">{{ stats.correct }}</b>
      </div>
      <div class="tile bad">
        <span class="t-label">错误</span>
        <b class="t-val">{{ stats.wrong }}</b>
      </div>
    </div>
    <p class="hint">
      一次答对 {{ stats.ok }} · 重试后答对 {{ stats.retry }}（算正确）· 三次都错 {{ stats.bad }}（算错误）。记录只存在这台设备上，隔天自动重新开始。
    </p>

    <div class="btns">
      <button class="btn" :disabled="exporting" @click="exportImage">🖼 {{ exporting ? '生成中…' : '导出图片' }}</button>
      <button class="btn plain" @click="confirming = !confirming">🔁 重新测验</button>
    </div>

    <div v-if="confirming" class="confirm">
      <p>会清空今天的 {{ stats.total }} 条记录，并从头开始新的一轮。</p>
      <div class="btns">
        <button class="btn plain" @click="confirming = false">取消</button>
        <button class="btn danger" @click="doRestart">清空并重新开始</button>
      </div>
    </div>

    <div v-if="imageUrl" class="preview">
      <p class="hint">{{ exportMsg }}</p>
      <img :src="imageUrl" alt="高级测验记录图片" />
      <div class="btns">
        <button v-if="shareable" class="btn" @click="share">📤 分享</button>
        <a class="btn secondary link" :href="imageUrl" :download="imageName">💾 保存图片</a>
      </div>
    </div>
    <p v-else-if="exportMsg" class="hint">{{ exportMsg }}</p>

    <h4 class="sub">逐题记录（点一下回放读音）</h4>
    <p v-if="!items.length" class="hint">今天还没有做高级测验。</p>
    <ol v-else class="list">
      <li v-for="(r, i) in items" :key="r.at + r.key" class="row" :class="r.result">
        <span class="no">{{ i + 1 }}</span>
        <button class="say" @click="replay(r.key)">
          <span class="pinyin py">{{ r.pinyin }}</span>
          <span class="char">{{ r.char }}</span>
        </button>
        <span class="res">
          {{ RESULT_LABEL[r.result] }}<small v-if="r.result === 'retry'">（错 {{ r.wrong }} 次）</small>
        </span>
        <span class="time">{{ fmtTime(r.at) }}</span>
      </li>
    </ol>
  </AppModal>
</template>

<style scoped>
.summary {
  display: flex;
  gap: 10px;
}

.tile {
  flex: 1;
  background: var(--c-key);
  border-radius: 12px;
  box-shadow: var(--shadow-chip);
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.t-label {
  font-size: 13px;
  color: var(--c-muted);
}

.t-val {
  font-size: 26px;
  line-height: 1.1;
}

.tile.ok .t-val {
  color: var(--c-ok);
}

.tile.bad .t-val {
  color: var(--c-bad);
}

.hint {
  font-size: 13px;
  color: var(--c-muted);
  margin: 10px 0;
  line-height: 1.5;
}

.btns {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.btns .btn {
  flex: 1;
}

.btn.danger {
  background: var(--c-bad);
  color: #fff;
}

.btn.link {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.confirm {
  margin-top: 10px;
  padding: 12px;
  border-radius: 12px;
  background: #fde8e6;
  font-size: 14px;
}

.confirm p {
  margin: 0 0 8px;
}

.preview {
  margin-top: 10px;
}

.preview img {
  width: 100%;
  border-radius: 10px;
  box-shadow: var(--shadow-chip);
  -webkit-touch-callout: default;
}

.sub {
  margin: 16px 0 8px;
  font-size: 14px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  display: grid;
  grid-template-columns: 24px 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 6px;
  border-radius: 10px;
  background: var(--c-key);
  box-shadow: var(--shadow-chip);
  border-left: 5px solid var(--c-ok);
}

.row.retry {
  border-left-color: var(--c-amber);
}

.row.bad {
  border-left-color: var(--c-bad);
}

.no {
  font-size: 12px;
  color: var(--c-muted);
  text-align: center;
}

.say {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  justify-content: flex-start;
  padding: 0 4px;
}

.py {
  font-size: 24px;
  font-weight: 700;
}

.char {
  font-size: 20px;
  color: var(--c-whole);
}

.res {
  font-size: 13px;
  color: var(--c-ok);
}

.row.retry .res {
  color: var(--c-amber);
}

.row.bad .res {
  color: var(--c-bad);
}

.res small {
  color: var(--c-muted);
}

.time {
  font-size: 12px;
  color: var(--c-muted);
}
</style>
