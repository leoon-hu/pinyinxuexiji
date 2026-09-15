/**
 * 测验：初级（听音找拼音）/ 高级（听音拼音节）。
 * 出题范围跟随「学到第几课」，薄弱项优先；每题 3 次机会，三次错后让孩子点一下正确答案再进下一题。
 */
import {
  INITIALS, FINALS, TONES, MEDIAL_FINALS, compose, applyTone, soundGroup, toKey, isWhole, dropsUmlaut,
  type Initial, type Final, type Tone, type Medial,
} from '@/data/pinyin'
import { unlockedThrough, LAST_UNIT } from '@/data/units'
import { syllableExists, exampleChar } from '@/data/syllables'
import { wordsFor } from '@/data/words'
import { initialSound, finalSound, syllableSound, wordSound, type Sound } from '@/data/sounds'
import { hasRecording, preload } from '@/services/audio'
import { sfxCorrect, sfxWrong, sfxCoin } from '@/services/sfx'
import {
  progress, recordRound, recordAdvanced, noteWrong, noteRight, noteAsked, FIRST_ROUND_REWARD, type BasicLevel,
} from './progress'
import { run, sleep } from './runner'
import { state, blankScreen, keyId, resetSelection, resetFeedback, type Piece, type ScreenAction } from './state'
import { say, prompt, lightKey } from './player'

export interface BasicTarget {
  kind: 'basic'
  keyKind: 'initial' | 'final'
  value: string
  id: string
  group: string
  sound: Sound
}

export interface AdvancedTarget {
  kind: 'advanced'
  initial: Initial
  medial: Medial | null
  final: Final
  tone: Tone
  written: string
  sound: Sound
}

export type Target = BasicTarget | AdvancedTarget
export type QuizKind = 'basic' | 'advanced'
export type Phase = 'intro' | 'listening' | 'answered' | 'reveal' | 'done'

export interface Quiz {
  kind: QuizKind
  /** 本轮实际出题范围（开局快照，家长中途改设置只影响下一轮） */
  unit: number
  level: BasicLevel
  total: number
  index: number
  /** ok 一次答对 / retry 重试后答对 / bad 三次都错 */
  results: Array<'ok' | 'retry' | 'bad' | null>
  correct: number
  earned: number
  attempts: number
  phase: Phase
  targets: Target[]
  missed: Target[]
}

/** 按第几次答对给的金币 */
const REWARD: Record<QuizKind, number[]> = { basic: [2, 1, 1], advanced: [5, 3, 1] }
const MAX_ATTEMPTS = 3

/** 易混对：初级测验 Lv1 的干扰项优先从这里挑 */
const CONFUSABLE: Record<string, string[]> = {
  b: ['p', 'd', 'q'], p: ['b', 'q', 'd'], m: ['n', 'b', 'f'], f: ['t', 'h', 'p'],
  d: ['b', 't', 'q'], t: ['d', 'f', 'l'], n: ['l', 'm', 'h'], l: ['n', 'r', 't'],
  g: ['k', 'h', 'j'], k: ['g', 'h', 'q'], h: ['f', 'k', 'g'],
  j: ['q', 'x', 'g'], q: ['j', 'x', 'p'], x: ['j', 'q', 's'],
  z: ['zh', 'c', 's'], c: ['ch', 'z', 's'], s: ['sh', 'z', 'c'],
  zh: ['z', 'ch', 'sh'], ch: ['c', 'zh', 'sh'], sh: ['s', 'zh', 'ch'], r: ['l', 'sh', 'y'],
  y: ['w', 'r', 'x'], w: ['y', 'm', 'r'],
  a: ['o', 'e', 'ai'], o: ['a', 'e', 'ou'], e: ['a', 'o', 'ei'],
  i: ['ü', 'u', 'in'], u: ['ü', 'o', 'un'], 'ü': ['u', 'i', 'ün'],
  ai: ['ei', 'an', 'a'], ei: ['ai', 'ie', 'en'], ui: ['iu', 'ei', 'un'],
  ao: ['ou', 'an', 'a'], ou: ['ao', 'o', 'iu'], iu: ['ui', 'ou', 'in'],
  ie: ['ei', 'üe', 'ye'], 'üe': ['ie', 'ü', 'ün'], er: ['e', 'en', 'ei'],
  an: ['ang', 'en', 'ai'], en: ['eng', 'an', 'in'], in: ['ing', 'en', 'ün'],
  un: ['ün', 'en', 'ui'], 'ün': ['un', 'in', 'ü'],
  ang: ['an', 'eng', 'ao'], eng: ['en', 'ang', 'ing'], ing: ['in', 'eng', 'ang'], ong: ['eng', 'ou', 'ang'],
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** 薄弱项优先的乱序：答错次数越多越靠前 */
function weightedOrder<T>(list: T[], weightKey: (t: T) => string): T[] {
  return [...list]
    .map((t) => ({ t, r: Math.random() / (1 + (progress.wrong[weightKey(t)] ?? 0)) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.t)
}

/** 从池子里按序取 n 个；池子不够时重新乱序补齐（避免相邻重复） */
function takeRound<T>(ordered: T[], n: number): T[] {
  if (!ordered.length) return []
  const out: T[] = []
  let pool = ordered
  while (out.length < n) {
    for (const t of pool) {
      if (out.length >= n) break
      if (out.length && out[out.length - 1] === t) continue
      out.push(t)
    }
    pool = shuffle(pool)
    if (ordered.length === 1) break
  }
  return out
}

export function basicPool(unit: number): BasicTarget[] {
  const u = unlockedThrough(unit)
  const pool: BasicTarget[] = []
  for (const i of INITIALS) {
    if (!u.initials.has(i)) continue
    pool.push({ kind: 'basic', keyKind: 'initial', value: i, id: keyId('initial', i), group: soundGroup(i), sound: initialSound(i) })
  }
  for (const f of FINALS) {
    if (!u.finals.has(f)) continue
    pool.push({ kind: 'basic', keyKind: 'final', value: f, id: keyId('final', f), group: soundGroup(f), sound: finalSound(f) })
  }
  return pool
}

export function advancedPool(unit: number): AdvancedTarget[] {
  const u = unlockedThrough(unit)
  const pool: AdvancedTarget[] = []
  const push = (initial: Initial, medial: Medial | null, final: Final) => {
    const written = compose(initial, final, medial)
    if (!written || !syllableExists(written)) return
    // zh + i、y + ü 拼出来是整体认读音节，不拆开考
    if (isWhole(written)) return
    for (const tone of TONES) {
      if (!exampleChar(written, tone)) continue
      if (!hasRecording(toKey(written, tone))) continue
      pool.push({ kind: 'advanced', initial, medial, final, tone, written, sound: syllableSound(written, tone) })
    }
  }
  for (const initial of INITIALS) {
    if (!u.initials.has(initial)) continue
    for (const final of FINALS) {
      if (!u.finals.has(final)) continue
      push(initial, null, final)
    }
    if (!u.medials) continue
    for (const medial of ['i', 'u', 'ü'] as Medial[]) {
      if (!u.finals.has(medial)) continue
      for (const final of MEDIAL_FINALS[medial]) {
        if (!u.finals.has(final)) continue
        push(initial, medial, final)
      }
    }
  }
  return pool
}

/** 初级 Lv1：正确项 + 3 个同类干扰项（优先易混对） */
export function pickCandidates(target: BasicTarget, pool: BasicTarget[]): string[] {
  const same = pool.filter((t) => t.keyKind === target.keyKind && t.group !== target.group)
  const preferred = (CONFUSABLE[target.value] ?? [])
    .map((v) => same.find((t) => t.value === v))
    .filter((t): t is BasicTarget => !!t)
  const rest = shuffle(same.filter((t) => !preferred.includes(t)))
  const picked = [...preferred, ...rest].slice(0, 3)
  return shuffle([target.id, ...picked.map((t) => t.id)])
}

function current(): { q: Quiz; target: Target } | null {
  const q = state.quiz
  if (!q) return null
  const target = q.targets[q.index]
  if (!target) return null
  return { q, target }
}

function progressDots(q: Quiz): Array<'ok' | 'retry' | 'bad' | 'cur' | null> {
  return q.results.map((r, i) => (i === q.index && q.phase !== 'done' ? (r ?? 'cur') : r))
}

function emptyPieces(target: AdvancedTarget): Piece[] {
  const pieces: Piece[] = [{ kind: 'initial', text: '' }]
  if (target.medial) pieces.push({ kind: 'medial', text: '' })
  pieces.push({ kind: 'final', text: '' }, { kind: 'tone', text: '' })
  return pieces
}

export function startQuiz(kind: QuizKind): boolean {
  let unit = progress.settings.unit
  const size = progress.settings.quizSize
  let targets: Target[]
  if (kind === 'basic') {
    const pool = basicPool(unit)
    targets = takeRound(weightedOrder(pool, (t) => t.id), size)
  } else {
    let pool = advancedPool(unit)
    // 学得太少（第 1、2 课还没有声母）时，放宽到最早能拼出音节的那一课，键盘范围跟着一起放宽
    while (pool.length < 4 && unit < LAST_UNIT) pool = advancedPool(++unit)
    targets = takeRound(weightedOrder(pool, (t) => toKey(t.written, t.tone)), size)
  }
  if (!targets.length) return false
  resetSelection()
  resetFeedback()
  state.quiz = {
    kind,
    unit,
    level: progress.settings.basicLevel,
    total: targets.length,
    index: 0,
    results: targets.map(() => null),
    correct: 0,
    earned: 0,
    attempts: 0,
    phase: 'intro',
    targets,
    missed: [],
  }
  state.screen = { ...blankScreen(kind), icon: '👂' }
  void run(async (signal) => {
    await prompt(kind === 'basic' ? 'mode-basic' : 'mode-advanced', signal)
    await ask(signal)
  })
  return true
}

/**
 * 测验里「重听」什么时候可以按：听题中；答案揭晓页还在等孩子操作时。
 * answered 阶段正在跑的序列末尾是 advance()，被重听的 run() 取消就会永远停在当前题。
 */
export function canReplayTarget(): boolean {
  const q = state.quiz
  if (!q) return false
  if (q.phase === 'listening') return true
  if (q.phase === 'reveal') return true
  return false
}

/**
 * 弹窗 / 确认框打断了「答对 → 下一题」的过渡序列后，关掉时把测验接着推进。
 */
export function resumeQuiz(): void {
  const q = state.quiz
  if (!q || q.phase !== 'answered') return
  void run(async (signal) => advance(signal))
}

/** 开场白还没讲完孩子就按键了：跳过开场白直接出题 */
export function skipIntro(): boolean {
  const q = state.quiz
  if (!q || q.phase !== 'intro') return false
  void run(async (signal) => ask(signal))
  return true
}

/** 出当前题：画屏幕、限定可点的键、播目标音 */
async function ask(signal: AbortSignal): Promise<void> {
  const cur = current()
  if (!cur) return
  const { q, target } = cur
  q.phase = 'listening'
  q.attempts = 0
  resetSelection()
  resetFeedback()
  lightKey(null)
  const unit = q.unit
  const u = unlockedThrough(unit)
  if (target.kind === 'basic') {
    const level = q.level
    const pool = basicPool(unit)
    if (level === 1) state.enabledKeys = pickCandidates(target, pool)
    else if (level === 2) state.enabledKeys = pool.filter((t) => t.keyKind === target.keyKind).map((t) => t.id)
    else state.enabledKeys = unit >= 14 ? null : pool.map((t) => t.id)
    state.screen = { ...blankScreen('basic'), icon: '👂', progress: progressDots(q) }
  } else {
    state.enabledKeys = unit >= 14 ? null : [
      ...INITIALS.filter((i) => u.initials.has(i)).map((i) => keyId('initial', i)),
      ...FINALS.filter((f) => u.finals.has(f)).map((f) => keyId('final', f)),
    ]
    // 听题时就把例字亮出来：孩子把声音和字对上，家长也一眼知道在考什么
    state.screen = {
      ...blankScreen('advanced'),
      icon: '👂',
      pieces: emptyPieces(target),
      char: exampleChar(target.written, target.tone),
      progress: progressDots(q),
    }
    void preload(wordsFor(target.written, target.tone).map((_, i) => wordSound(target.written, target.tone, i)!.key))
  }
  noteAsked(target.sound.key)
  await sleep(350, signal)
  await say(target.sound, signal)
}

export function replayTarget(): void {
  const cur = current()
  if (!cur || !canReplayTarget()) return
  const { q, target } = cur
  // 揭晓页正在读词时按重听：把点亮的词灭掉（被打断的序列不会自己清）
  if (state.screen.wordLit >= 0) state.screen = { ...state.screen, wordLit: -1 }
  void run(async (signal) => {
    await say(target.sound, signal)
    // 高级测验揭晓页：重听完再提醒一次怎么进下一题
    if (q.phase === 'reveal' && q.kind === 'advanced') await prompt('press-next', signal)
  })
}

function reward(q: Quiz): number {
  const n = REWARD[q.kind][Math.min(q.attempts, 2)] ?? 0
  q.earned += n
  progress.coins += n
  return n
}

async function advance(signal: AbortSignal): Promise<void> {
  const q = state.quiz
  if (!q) return
  q.index += 1
  if (q.index >= q.total) await finish(signal)
  else await ask(signal)
}

async function finish(signal: AbortSignal): Promise<void> {
  const q = state.quiz
  if (!q) return
  q.phase = 'done'
  resetSelection()
  resetFeedback()
  state.enabledKeys = []
  const first = recordRound(q.correct, q.total)
  if (q.correct > progress.best[q.kind]) progress.best[q.kind] = q.correct
  const perfect = q.results.every((r) => r === 'ok')
  const actions: ScreenAction[] = [{ id: 'again', label: '再来一轮', icon: '🔁' }]
  if (q.missed.length) actions.push({ id: 'review', label: '听听错的', icon: '🔊' })
  state.screen = {
    ...blankScreen(q.kind),
    big: `${q.correct} / ${q.total}`,
    icon: perfect ? '🏆' : q.correct >= q.total * 0.7 ? '👍' : '💪',
    note: `本轮获得 ${q.earned} 金币${first ? `，今天第一轮 +${FIRST_ROUND_REWARD}` : ''}`,
    progress: progressDots(q),
    actions,
  }
  sfxCoin()
  await prompt(perfect ? 'round-perfect' : 'round-done', signal)
  if (first) await prompt('first-round', signal)
}

/** 本轮错过的键 id（回到点读模式时脉冲提示） */
export function missedKeyIds(): string[] {
  const q = state.quiz
  if (!q) return []
  const ids = q.missed.flatMap((t) => (t.kind === 'basic' ? [t.id] : [keyId('initial', t.initial), keyId('final', t.final)]))
  return [...new Set(ids)]
}

/* ---------- 初级：点键作答 ---------- */

export function answerBasic(keyKind: 'initial' | 'final', value: string): void {
  const cur = current()
  if (!cur || cur.target.kind !== 'basic') return
  const { q } = cur
  const target = cur.target
  const id = keyId(keyKind, value)
  if (q.phase === 'reveal') {
    if (id !== state.hint) return
    void run(async (signal) => {
      // hint 保留到进下一题为止：序列被打断（重听）时孩子还能再点一次
      lightKey(id)
      state.screen = { ...state.screen, status: '' }
      await say(target.sound, signal)
      lightKey(null)
      await sleep(300, signal)
      await advance(signal)
    })
    return
  }
  if (q.phase !== 'listening') return
  if (state.enabledKeys && !state.enabledKeys.includes(id)) return
  if (state.wrongKeys.includes(id)) return

  const ok = soundGroup(value) === target.group
  if (ok) {
    q.phase = 'answered'
    q.results[q.index] = q.attempts === 0 ? 'ok' : 'retry'
    q.correct += 1
    const coins = reward(q)
    noteRight(target.id)
    state.enabledKeys = []
    state.screen = { ...state.screen, big: value, status: 'ok', icon: '', note: coins ? `+${coins} 金币` : '', progress: progressDots(q) }
    sfxCorrect()
    void run(async (signal) => {
      lightKey(id)
      if (q.attempts === 0) await prompt('correct', signal)
      else await sleep(600, signal)
      lightKey(null)
      await advance(signal)
    })
    return
  }

  q.attempts += 1
  state.wrongKeys = [...state.wrongKeys, id]
  noteWrong(target.id)
  sfxWrong()
  if (q.attempts >= MAX_ATTEMPTS) {
    q.phase = 'reveal'
    q.results[q.index] = 'bad'
    q.missed.push(target)
    state.hint = target.id
    state.enabledKeys = [target.id]
    state.screen = { ...state.screen, big: target.value, status: 'bad', icon: '', note: '点一下闪烁的键', progress: progressDots(q) }
    void run(async (signal) => {
      await prompt('answer', signal)
      await say(target.sound, signal)
      await prompt('tap-this', signal)
    })
    return
  }
  state.screen = { ...state.screen, status: 'bad', progress: progressDots(q) }
  void run(async (signal) => {
    await prompt('wrong', signal)
    state.screen = { ...state.screen, status: '' }
    await say(target.sound, signal)
  })
}

/* ---------- 高级：拼好按确定 ---------- */

/** 逐个点亮并朗读例字的词语（答对 / 揭晓后） */
async function readWords(t: AdvancedTarget, signal: AbortSignal): Promise<void> {
  const words = wordsFor(t.written, t.tone)
  try {
    for (let i = 0; i < words.length; i++) {
      const sound = wordSound(t.written, t.tone, i)
      if (!sound) continue
      state.screen = { ...state.screen, wordLit: i }
      await say(sound, signal)
      await sleep(250, signal)
    }
  } finally {
    if (!signal.aborted) state.screen = { ...state.screen, wordLit: -1 }
  }
}

/** 记入今天的逐题记录（家长面板 / 导出图片用） */
function logAdvanced(q: Quiz, t: AdvancedTarget, result: 'ok' | 'retry' | 'bad'): void {
  recordAdvanced({
    key: toKey(t.written, t.tone),
    pinyin: applyTone(t.written, t.tone),
    char: exampleChar(t.written, t.tone),
    result,
    wrong: q.attempts,
    at: Date.now(),
  })
}

function targetPieces(t: AdvancedTarget, bad: { initial?: boolean; rhyme?: boolean; tone?: boolean } = {}): Piece[] {
  const pieces: Piece[] = [{ kind: 'initial', text: t.initial, bad: bad.initial }]
  if (t.medial) pieces.push({ kind: 'medial', text: t.medial, bad: bad.rhyme })
  pieces.push({ kind: 'final', text: t.final, bad: bad.rhyme }, { kind: 'tone', text: String(t.tone), bad: bad.tone })
  return pieces
}

export function confirmAdvanced(): void {
  const cur = current()
  if (!cur || cur.target.kind !== 'advanced') return
  const { q } = cur
  const target = cur.target
  if (q.phase === 'reveal') {
    void run(async (signal) => {
      await advance(signal)
    })
    return
  }
  if (q.phase !== 'listening') return
  const { initial, medial, final, tone } = state.sel
  if (!final) {
    void run(async (signal) => prompt('pick-final', signal))
    return
  }
  if (!tone) {
    state.flashTones = true
    void run(async (signal) => prompt('pick-tone', signal))
    return
  }
  const written = initial ? compose(initial, final, medial) : null
  const ok = written === target.written && tone === target.tone
  if (ok) {
    q.phase = 'answered'
    q.results[q.index] = q.attempts === 0 ? 'ok' : 'retry'
    q.correct += 1
    const coins = reward(q)
    noteRight(toKey(target.written, target.tone))
    logAdvanced(q, target, q.attempts === 0 ? 'ok' : 'retry')
    state.enabledKeys = []
    state.screen = {
      ...state.screen,
      pieces: targetPieces(target).map((p) => ({ ...p, lit: true })),
      big: applyTone(target.written, target.tone),
      uHint: dropsUmlaut(target.initial, target.final, target.medial),
      char: exampleChar(target.written, target.tone),
      words: wordsFor(target.written, target.tone),
      wordLit: -1,
      status: 'ok',
      icon: '',
      note: coins ? `+${coins} 金币` : '',
      progress: progressDots(q),
    }
    sfxCorrect()
    void run(async (signal) => {
      if (q.attempts === 0) await prompt('correct', signal)
      else await sleep(600, signal)
      // 答对了再听两个词：把音节放回孩子认识的词里
      await readWords(target, signal)
      await advance(signal)
    })
    return
  }

  q.attempts += 1
  noteWrong(toKey(target.written, target.tone))
  sfxWrong()
  const bad = {
    initial: initial !== target.initial,
    rhyme: (medial ?? '') + final !== (target.medial ?? '') + target.final,
    tone: tone !== target.tone,
  }
  if (q.attempts >= MAX_ATTEMPTS) {
    q.phase = 'reveal'
    q.results[q.index] = 'bad'
    q.missed.push(target)
    logAdvanced(q, target, 'bad')
    state.sel = { initial: target.initial, medial: target.medial, final: target.final, tone: target.tone, whole: null }
    state.enabledKeys = []
    state.flashConfirm = true
    state.screen = {
      ...state.screen,
      pieces: targetPieces(target).map((p) => ({ ...p, lit: true })),
      big: applyTone(target.written, target.tone),
      uHint: dropsUmlaut(target.initial, target.final, target.medial),
      char: exampleChar(target.written, target.tone),
      words: wordsFor(target.written, target.tone),
      wordLit: -1,
      status: 'bad',
      icon: '',
      note: '按绿色的「确定」进入下一题',
      progress: progressDots(q),
    }
    void run(async (signal) => {
      await prompt('answer', signal)
      await say(target.sound, signal)
      await readWords(target, signal)
      await prompt('press-next', signal)
    })
    return
  }
  // 只清掉错的段，对的段保留
  if (bad.initial) state.sel.initial = null
  if (bad.rhyme) {
    state.sel.medial = null
    state.sel.final = null
  }
  if (bad.tone) state.sel.tone = null
  const pieces: Piece[] = [{ kind: 'initial', text: bad.initial ? '' : (initial ?? ''), bad: bad.initial }]
  if (target.medial) pieces.push({ kind: 'medial', text: bad.rhyme ? '' : (medial ?? ''), bad: bad.rhyme })
  pieces.push(
    { kind: 'final', text: bad.rhyme ? '' : final, bad: bad.rhyme },
    { kind: 'tone', text: bad.tone ? '' : String(tone), bad: bad.tone },
  )
  state.screen = { ...state.screen, pieces, big: '', status: 'bad', progress: progressDots(q) }
  void run(async (signal) => {
    await prompt('wrong', signal)
    state.screen = { ...state.screen, status: '', pieces: state.screen.pieces?.map((p) => ({ ...p, bad: false })) ?? null }
    await say(target.sound, signal)
  })
}

/** 高级测验里选了键之后同步屏幕部件（由 session 调用） */
export function renderAdvancedSelection(): void {
  const cur = current()
  if (!cur || cur.target.kind !== 'advanced' || cur.q.phase !== 'listening') return
  const t = cur.target
  const { initial, medial, final, tone } = state.sel
  const pieces: Piece[] = [{ kind: 'initial', text: initial ?? '' }]
  if (t.medial || medial) pieces.push({ kind: 'medial', text: medial ?? '' })
  pieces.push({ kind: 'final', text: final ?? '' }, { kind: 'tone', text: tone ? String(tone) : '' })
  const written = initial && final ? compose(initial, final, medial) : null
  state.screen = {
    ...state.screen,
    pieces,
    big: written ? applyTone(written, tone) : final ? applyTone((medial ?? '') + final, tone) : (initial ?? ''),
    uHint: !!(initial && final && dropsUmlaut(initial, final, medial)),
    status: '',
  }
}
