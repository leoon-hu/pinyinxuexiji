<script setup lang="ts">
import { computed, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { UNITS } from '@/data/units'
import { progress, practiceStreak, resetProgress, exportBackup, importBackup, todayKey, DEFAULT_GIFTS, type Gift } from '@/store/progress'
import { play } from '@/services/audio'
import { run } from '@/store/runner'
import { install, installedStandalone, promptInstall, type InstallKind } from '@/services/install'
import InstallStepsModal from '@/components/modals/InstallStepsModal.vue'

function replayKey(key: string): void {
  void run((signal) => play(key, '', signal))
}

const emit = defineEmits<{ close: []; chart: [] }>()

type Tab = 'learn' | 'sound' | 'gift' | 'record' | 'data'
const tab = ref<Tab>('learn')
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'learn', label: '学习' },
  { id: 'sound', label: '声音' },
  { id: 'gift', label: '奖励' },
  { id: 'record', label: '记录' },
  { id: 'data', label: '数据' },
]

const s = computed(() => progress.settings)

/* 奖励 */
function addGift(): void {
  progress.gifts.push({ id: `g${Date.now()}`, name: '新礼物', emoji: '🎁', cost: 50 })
}
function removeGift(g: Gift): void {
  progress.gifts = progress.gifts.filter((x) => x !== g)
}
function restoreGifts(): void {
  progress.gifts = DEFAULT_GIFTS.map((g) => ({ ...g }))
}
const coinDelta = ref(10)

/**
 * 「安装到主屏幕」一节（需求 5.6 的常驻入口）：能一键安装给「安装」，其它环境给「查看步骤」（与首页提示条同一个弹窗）；
 * 判断顺序与提示条一致（内置浏览器先于 iOS），已从主屏幕打开时写「已安装」
 */
const ua = navigator.userAgent
const installKind = computed<InstallKind | null>(() => {
  if (installedStandalone) return null
  if (install.hasPrompt) return 'prompt'
  if (/MicroMessenger|\bQQ\/|Weibo|FBAN|FBAV|Instagram|Line\//.test(ua)) return 'inapp'
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return 'menu'
})
const installSteps = ref(false)
function addCoins(n: number): void {
  progress.coins = Math.max(0, progress.coins + n)
}

/* 记录 */
const days = computed(() => {
  const out: Array<{ key: string; label: string; rec: { rounds: number; correct: number; total: number } | null }> = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = todayKey(d)
    out.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, rec: progress.history[key] ?? null })
  }
  return out
})
const streak = computed(() => practiceStreak())
const weak = computed(() =>
  Object.entries(progress.wrong)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([k, n]) => ({ key: k.replace(/^(initial|final):/, ''), n })),
)

/* 数据 */
const backup = ref('')
const restoreCode = ref('')
const restoreMsg = ref('')
const resetInput = ref('')
const copied = ref(false)
function showBackup(): void {
  backup.value = exportBackup()
  copied.value = false
}
async function copyBackup(): Promise<void> {
  try {
    await navigator.clipboard.writeText(backup.value)
    copied.value = true
  } catch {
    copied.value = false
  }
}
function doRestore(): void {
  restoreMsg.value = importBackup(restoreCode.value) ? '已恢复' : '备份码不对'
}
const todayDigits = computed(() => todayKey().replace(/-/g, ''))
function doReset(): void {
  if (resetInput.value.trim() !== todayDigits.value) return
  resetProgress()
  resetInput.value = ''
}
</script>

<template>
  <AppModal title="家长设置" @close="emit('close')">
    <nav class="tabs">
      <button v-for="t in TABS" :key="t.id" class="tab" :class="{ on: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
    </nav>

    <section v-if="tab === 'learn'">
      <label class="field">
        <span class="label">学到第几课（测验只考学过的内容）</span>
        <select v-model.number="s.unit" class="select">
          <option v-for="u in UNITS" :key="u.no" :value="u.no">第 {{ u.no }} 课 · {{ u.title }}{{ u.no === UNITS.length ? '（全部）' : '' }}</option>
        </select>
      </label>
      <label class="field">
        <span class="label">初级测验难度</span>
        <select v-model.number="s.basicLevel" class="select">
          <option :value="1">四选一（正确 + 3 个易混的）</option>
          <option :value="2">同类全部（只亮声母或只亮韵母）</option>
          <option :value="3">整个键盘</option>
        </select>
      </label>
      <label class="field">
        <span class="label">每轮题数</span>
        <select v-model.number="s.quizSize" class="select">
          <option :value="5">5 题</option>
          <option :value="10">10 题</option>
          <option :value="15">15 题</option>
        </select>
      </label>
      <label class="field">
        <span class="label">跟读时留给孩子开口的时间</span>
        <select v-model.number="s.echoGap" class="select">
          <option :value="1000">1 秒</option>
          <option :value="1500">1.5 秒</option>
          <option :value="2000">2 秒</option>
          <option :value="3000">3 秒</option>
        </select>
      </label>
      <label class="field">
        <span class="label">拼读演示各段之间的停顿</span>
        <select v-model.number="s.spellGap" class="select">
          <option :value="150">快</option>
          <option :value="250">正常</option>
          <option :value="450">慢</option>
        </select>
      </label>
      <button class="btn secondary" @click="emit('chart')">🔊 拼音大全（全表点读）</button>
    </section>

    <section v-else-if="tab === 'sound'">
      <label class="field row">
        <input v-model="s.sfx" type="checkbox" />
        <span>答题音效</span>
      </label>
      <label class="field">
        <span class="label">音量 {{ Math.round(s.volume * 100) }}%</span>
        <input v-model.number="s.volume" type="range" min="0.2" max="1" step="0.1" />
      </label>
      <label class="field row">
        <input v-model="s.ttsFallback" type="checkbox" />
        <span>录音缺失时用系统朗读兜底</span>
      </label>
      <p class="hint">所有拼音都是真人录音；系统朗读只在个别文件缺失时用。</p>
    </section>

    <section v-else-if="tab === 'gift'">
      <p class="hint">孩子的礼物清单，由你兑现。孩子点「兑换」时会要求你来确认。</p>
      <ul class="gifts">
        <li v-for="g in progress.gifts" :key="g.id" class="gift-row">
          <input v-model="g.emoji" class="input emoji" maxlength="2" />
          <input v-model="g.name" class="input name" />
          <input v-model.number="g.cost" class="input cost" type="number" min="1" />
          <button class="del" aria-label="删除" @click="removeGift(g)">×</button>
        </li>
      </ul>
      <div class="row-btns">
        <button class="btn" @click="addGift">+ 添加礼物</button>
        <button class="btn plain" @click="restoreGifts">恢复默认</button>
      </div>
      <h4 class="sub">金币调整（当前 {{ progress.coins }}）</h4>
      <div class="row-btns">
        <input v-model.number="coinDelta" class="input cost" type="number" min="1" />
        <button class="btn" @click="addCoins(coinDelta)">+ 加</button>
        <button class="btn plain" @click="addCoins(-coinDelta)">− 减</button>
      </div>
      <h4 v-if="progress.redeemed.length" class="sub">兑换记录</h4>
      <ul class="plain-list">
        <li v-for="(r, i) in [...progress.redeemed].reverse().slice(0, 8)" :key="i">{{ r.date }} · {{ r.name }}</li>
      </ul>
    </section>

    <section v-else-if="tab === 'record'">
      <p class="stat">连续练习 <b>{{ streak }}</b> 天 · 初级最高 {{ progress.best.basic }} · 高级最高 {{ progress.best.advanced }}</p>
      <div class="days">
        <div v-for="d in days" :key="d.key" class="day" :class="{ on: d.rec }">
          <span class="d-label">{{ d.label }}</span>
          <span v-if="d.rec" class="d-val">{{ d.rec.rounds }}轮 {{ Math.round((d.rec.correct / Math.max(1, d.rec.total)) * 100) }}%</span>
          <span v-else class="d-val">·</span>
        </div>
      </div>
      <h4 class="sub">常错的</h4>
      <p v-if="!weak.length" class="hint">还没有错题记录</p>
      <div v-else class="weak">
        <span v-for="w in weak" :key="w.key" class="weak-item pinyin">{{ w.key }}<small>×{{ w.n }}</small></span>
      </div>
      <h4 class="sub">最近出过的题（点一下回放，听不清的告诉我们换录音）</h4>
      <p v-if="!progress.recent.length" class="hint">还没有做过测验</p>
      <div v-else class="weak">
        <button v-for="k in progress.recent" :key="k" class="weak-item pinyin" @click="replayKey(k)">🔊 {{ k }}</button>
      </div>
    </section>

    <section v-else>
      <h4 class="sub">安装到主屏幕</h4>
      <p class="hint">装到主屏幕后从桌面图标打开就是全屏、离线的，孩子自己就能打开。</p>
      <p v-if="!installKind" class="hint">已安装到主屏幕。</p>
      <button v-else-if="installKind === 'prompt'" class="btn secondary" @click="promptInstall()">安装</button>
      <button v-else class="btn secondary" @click="installSteps = true">查看步骤</button>
      <h4 class="sub">备份</h4>
      <p class="hint">浏览器可能清掉本地数据（iPad 上长期不打开尤其如此），建议偶尔备份。</p>
      <button class="btn secondary" @click="showBackup">生成备份码</button>
      <div v-if="backup" class="backup">
        <textarea class="input area" readonly :value="backup" />
        <button class="btn" @click="copyBackup">{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <h4 class="sub">恢复</h4>
      <div class="row-btns">
        <input v-model="restoreCode" class="input" placeholder="粘贴备份码" />
        <button class="btn" @click="doRestore">恢复</button>
      </div>
      <p v-if="restoreMsg" class="hint">{{ restoreMsg }}</p>
      <h4 class="sub">清空学习记录</h4>
      <p class="hint">会清掉金币、记录和设置。确认请输入今天的日期：{{ todayDigits }}</p>
      <div class="row-btns">
        <input v-model="resetInput" class="input" inputmode="numeric" :placeholder="todayDigits" />
        <button class="btn plain" :disabled="resetInput.trim() !== todayDigits" @click="doReset">清空</button>
      </div>
      <h4 class="sub">关于</h4>
      <p class="hint">
        拼音录音：声母 / 韵母 / 整体认读来自教材配套呼读音录音；音节来自 audio-cmn（Chen Wang 王琛 等，CC BY-SA 3.0）；引导语为合成语音。详见 audio/CREDITS.md。
      </p>
    </section>
  </AppModal>
  <InstallStepsModal v-if="installSteps && installKind && installKind !== 'prompt'" :kind="installKind" @close="installSteps = false" />
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.tab {
  flex: 1;
  height: 34px;
  border-radius: 8px;
  background: var(--c-key);
  box-shadow: var(--shadow-chip);
  font-size: 15px;
}

.tab.on {
  background: var(--c-amber);
  color: #fff;
}

.field.row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.field.row input {
  width: 20px;
  height: 20px;
}

.hint {
  font-size: 13px;
  color: var(--c-muted);
  margin: 0 0 12px;
  line-height: 1.5;
}

.sub {
  margin: 16px 0 8px;
  font-size: 14px;
}

.gifts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gift-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.input.emoji {
  width: 52px;
  text-align: center;
  font-size: 20px;
  padding: 0;
}

.input.name {
  flex: 1;
}

.input.cost {
  width: 80px;
}

.del {
  width: 32px;
  height: 32px;
  font-size: 22px;
  color: var(--c-muted);
}

.row-btns {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.row-btns .input {
  flex: 1;
}

.plain-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--c-muted);
}

.stat {
  margin: 0 0 10px;
  font-size: 14px;
}

.stat b {
  color: var(--c-coin);
  font-size: 18px;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0;
  border-radius: 8px;
  background: var(--c-key);
  color: var(--c-muted);
  font-size: 11px;
}

.day.on {
  background: #e6f5ea;
  color: var(--c-final);
}

.d-val {
  font-size: 11px;
}

.weak {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.weak-item {
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--c-key);
  box-shadow: var(--shadow-chip);
  font-size: 18px;
}

.weak-item small {
  margin-left: 3px;
  font-family: var(--font-ui);
  color: var(--c-muted);
}

.backup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.input.area {
  height: 80px;
  padding: 8px;
  font-size: 12px;
  resize: none;
}
</style>
