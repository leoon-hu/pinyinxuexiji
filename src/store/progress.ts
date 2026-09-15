/**
 * 持久化的学习进度与家长设置。单一根 key，带版本号，migrations[] 按版本迁移。
 */
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'pinyinxuexiji:v1'
const CURRENT_VERSION = 3

export interface Gift {
  id: string
  name: string
  emoji: string
  cost: number
}

export interface DayRecord {
  /** 完成的测验轮数 */
  rounds: number
  correct: number
  total: number
}

/** 高级测验里的一道题的作答情况（只记当天，家长在记录面板里看） */
export interface AdvancedRecord {
  /** 录音 key，如 ba4，可回放 */
  key: string
  /** 带调拼音，如 bà */
  pinyin: string
  char: string
  /** ok 一次答对 / retry 重试后答对 / bad 三次都错 */
  result: 'ok' | 'retry' | 'bad'
  /** 答错次数 0..3 */
  wrong: number
  /** 时间戳（ms） */
  at: number
}

export interface AdvancedLog {
  /** 记录属于哪一天（YYYY-MM-DD）；换天后重新开始记 */
  date: string
  items: AdvancedRecord[]
}

/** 初级测验难度：1 四选一 / 2 同类全部 / 3 整个键盘 */
export type BasicLevel = 1 | 2 | 3

export interface Settings {
  /** 学到第几课（1..14），测验只考学过的内容 */
  unit: number
  basicLevel: BasicLevel
  /** 每轮题数 */
  quizSize: number
  /** 跟读时留给孩子开口的时间（ms） */
  echoGap: number
  /** 拼读演示各段之间的间隔（ms） */
  spellGap: number
  sfx: boolean
  volume: number
  /** 录音缺失时用系统朗读兜底 */
  ttsFallback: boolean
}

export interface Progress {
  version: number
  coins: number
  /** 有练习（完成过测验）的日期，YYYY-MM-DD */
  practiceDays: string[]
  /** 按天的测验记录 */
  history: Record<string, DayRecord>
  redeemed: Array<{ id: string; name: string; date: string }>
  best: { basic: number; advanced: number }
  /** 每个键 / 音节答错的次数，测验优先抽薄弱项 */
  wrong: Record<string, number>
  /** 最近出过的题（录音 key），家长在记录页回放、排查听不清的录音 */
  recent: string[]
  /** 今天高级测验的逐题记录（本地保存；「重新测验」会清空） */
  advanced: AdvancedLog
  gifts: Gift[]
  settings: Settings
}

export const DEFAULT_GIFTS: Gift[] = [
  { id: 'hug', name: '一个大拥抱', emoji: '🤗', cost: 10 },
  { id: 'sticker', name: '一张贴纸', emoji: '⭐', cost: 30 },
  { id: 'snack', name: '一份小零食', emoji: '🍬', cost: 60 },
  { id: 'cartoon', name: '看一集动画片', emoji: '📺', cost: 100 },
  { id: 'book', name: '一本新绘本', emoji: '📖', cost: 150 },
  { id: 'outing', name: '去一次游乐场', emoji: '🎡', cost: 300 },
]

export function defaultSettings(): Settings {
  return {
    unit: 14,
    basicLevel: 1,
    quizSize: 10,
    echoGap: 1500,
    spellGap: 250,
    sfx: true,
    volume: 1,
    ttsFallback: true,
  }
}

function defaultProgress(): Progress {
  return {
    version: CURRENT_VERSION,
    coins: 0,
    practiceDays: [],
    history: {},
    redeemed: [],
    best: { basic: 0, advanced: 0 },
    wrong: {},
    recent: [],
    advanced: { date: '', items: [] },
    gifts: DEFAULT_GIFTS.map((g) => ({ ...g })),
    settings: defaultSettings(),
  }
}

/**
 * 版本迁移：migrations[n - 1] 把 version n 升到 n + 1。
 */
const migrations: Array<(state: Record<string, unknown>) => Record<string, unknown>> = [
  // v1 → v2：签到改为「练习日」；设置换成家长设置；礼物进入可编辑列表；兑换记录补名字
  (state) => {
    const old = state as {
      checkins?: string[]
      redeemed?: Array<{ id: string; date: string }>
      settings?: Record<string, unknown>
    }
    const redeemed = (old.redeemed ?? []).map((r) => ({
      id: r.id,
      name: DEFAULT_GIFTS.find((g) => g.id === r.id)?.name ?? r.id,
      date: r.date,
    }))
    const { checkins: _c, settings: _s, ...rest } = old as Record<string, unknown> & { checkins?: unknown; settings?: unknown }
    void _c
    void _s
    return { ...rest, practiceDays: old.checkins ?? [], redeemed, settings: defaultSettings() }
  },
  // v2 → v3：高级测验逐题记录
  (state) => ({ ...state, advanced: { date: '', items: [] } }),
]

function load(): Progress {
  const base = defaultProgress()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    let parsed = JSON.parse(raw) as Record<string, unknown>
    let version = typeof parsed.version === 'number' ? parsed.version : 1
    while (version < CURRENT_VERSION) {
      const migrate = migrations[version - 1]
      if (!migrate) break
      parsed = migrate(parsed)
      version += 1
    }
    const p = parsed as Partial<Progress>
    return {
      ...base,
      ...p,
      best: { ...base.best, ...(p.best ?? {}) },
      settings: { ...base.settings, ...(p.settings ?? {}) },
      gifts: Array.isArray(p.gifts) && p.gifts.length ? p.gifts : base.gifts,
      wrong: p.wrong ?? {},
      recent: Array.isArray(p.recent) ? p.recent : [],
      advanced: p.advanced && Array.isArray(p.advanced.items) ? p.advanced : base.advanced,
      history: p.history ?? {},
      version: CURRENT_VERSION,
    }
  } catch {
    return base
  }
}

export const progress = reactive<Progress>(load())

function save(p: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* 隐私模式等写入失败时忽略 */
  }
}

watch(progress, save, { deep: true })
// 迁移后的结构立刻落盘，下次启动不用再迁一遍
save(progress)

export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const FIRST_ROUND_REWARD = 10

/** 记一轮测验；返回是否是今天的第一轮（触发每日奖励） */
export function recordRound(correct: number, total: number): boolean {
  const day = todayKey()
  const rec = progress.history[day] ?? { rounds: 0, correct: 0, total: 0 }
  rec.rounds += 1
  rec.correct += correct
  rec.total += total
  progress.history[day] = rec
  const first = !progress.practiceDays.includes(day)
  if (first) {
    progress.practiceDays.push(day)
    progress.coins += FIRST_ROUND_REWARD
  }
  return first
}

export function noteAsked(key: string): void {
  progress.recent = [key, ...progress.recent.filter((k) => k !== key)].slice(0, 30)
}

export function noteWrong(key: string): void {
  progress.wrong[key] = (progress.wrong[key] ?? 0) + 1
}

export function noteRight(key: string): void {
  const n = progress.wrong[key]
  if (!n) return
  if (n <= 1) delete progress.wrong[key]
  else progress.wrong[key] = n - 1
}

/* ---------- 高级测验逐题记录 ---------- */

/** 一天最多记这么多题，防止无限增长 */
const ADVANCED_LOG_CAP = 500

/** 今天的记录；不是今天的（隔夜）视为空 */
export function advancedToday(): AdvancedRecord[] {
  const log = progress.advanced
  return log.date === todayKey() ? log.items : []
}

export function recordAdvanced(rec: AdvancedRecord): void {
  const day = todayKey()
  if (progress.advanced.date !== day) progress.advanced = { date: day, items: [] }
  progress.advanced.items.push(rec)
  if (progress.advanced.items.length > ADVANCED_LOG_CAP) progress.advanced.items.splice(0, progress.advanced.items.length - ADVANCED_LOG_CAP)
}

/** 「重新测验」：清空今天的记录 */
export function clearAdvancedLog(): void {
  progress.advanced = { date: todayKey(), items: [] }
}

export interface AdvancedStats {
  /** 已检测的题数 */
  total: number
  /** 答对的题数（含重试后答对） */
  correct: number
  /** 三次都没答对的题数 */
  wrong: number
  ok: number
  retry: number
  bad: number
}

export function advancedStats(items: AdvancedRecord[] = advancedToday()): AdvancedStats {
  const s: AdvancedStats = { total: items.length, correct: 0, wrong: 0, ok: 0, retry: 0, bad: 0 }
  for (const r of items) {
    s[r.result] += 1
    if (r.result === 'bad') s.wrong += 1
    else s.correct += 1
  }
  return s
}

/** 连续练习天数（截止到今天或昨天） */
export function practiceStreak(): number {
  const set = new Set(progress.practiceDays)
  const day = new Date()
  if (!set.has(todayKey(day))) day.setDate(day.getDate() - 1)
  let streak = 0
  while (set.has(todayKey(day))) {
    streak++
    day.setDate(day.getDate() - 1)
  }
  return streak
}

export function redeem(gift: Gift): boolean {
  if (progress.coins < gift.cost) return false
  progress.coins -= gift.cost
  progress.redeemed.push({ id: gift.id, name: gift.name, date: todayKey() })
  return true
}

export function resetProgress(): void {
  Object.assign(progress, defaultProgress())
}

/** 备份码：base64(JSON)，家长可复制到别的设备恢复 */
export function exportBackup(): string {
  const json = JSON.stringify(progress)
  return btoa(unescape(encodeURIComponent(json)))
}

export function importBackup(code: string): boolean {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())))
    const parsed = JSON.parse(json) as Partial<Progress>
    if (typeof parsed.coins !== 'number') return false
    Object.assign(progress, { ...defaultProgress(), ...parsed, version: CURRENT_VERSION })
    return true
  } catch {
    return false
  }
}
