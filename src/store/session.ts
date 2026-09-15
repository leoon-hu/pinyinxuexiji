/**
 * 模式切换与按键分发：点读 / 拼读 自己处理，测验交给 quiz.ts，跟读交给 echo.ts。
 */
import { computed } from 'vue'
import {
  compose, applyTone, isJQXY, isMedial, canBeMedialFor, asWhole, dropsUmlaut, FINAL_STANDALONE, TONE_MARKS,
  type Initial, type Final, type Whole, type Tone, type Medial,
} from '@/data/pinyin'
import { syllableExists, exampleChar } from '@/data/syllables'
import { initialSound, medialSound, finalSound, wholeSound, syllableSound, toneSound } from '@/data/sounds'
import { stop as stopAudio } from '@/services/audio'
import { sfxWrong } from '@/services/sfx'
import { progress, clearAdvancedLog } from './progress'
import { run, cancel, sleep } from './runner'
import { state, blankScreen, keyId, resetSelection, resetFeedback, type Mode, type Piece } from './state'
import { say, prompt, playKey, lightKey } from './player'
import { startQuiz, answerBasic, confirmAdvanced, replayTarget, renderAdvancedSelection, missedKeyIds, skipIntro, canReplayTarget, resumeQuiz } from './quiz'
import { stopEcho } from './echo'

export { toggleEcho } from './echo'
export { resumeQuiz } from './quiz'
export { state } from './state'

/** 儿歌类提示每次会话只讲一遍，之后只做视觉提示 */
const told = { jqx: false, sanpin: false, whole: false }
/** 拼读演示，供「重听」整段重放 */
let lastDemo: ((signal: AbortSignal) => Promise<void>) | null = null

/** 打断正在跑的一切声音序列（跟读、演示、测验过渡），并清掉按键高亮 */
export function interrupt(): void {
  stopEcho()
  cancel()
  lightKey(null)
}

let suggestTimer: ReturnType<typeof setTimeout> | null = null

/* ---------- 模式 ---------- */

export function setMode(mode: Mode): void {
  if (state.mode === mode && !(state.quiz && state.quiz.phase === 'done')) return
  const q = state.quiz
  if (q && q.phase !== 'done' && q.index > 0) {
    state.confirmDialog = { text: '不做这一轮了吗？', icon: '🤔', onYes: () => enterMode(mode) }
    return
  }
  enterMode(mode)
}

function enterMode(mode: Mode): void {
  interrupt()
  stopAudio()
  state.mode = mode
  state.quiz = null
  state.showWholes = false
  state.suggestSpell = false
  state.readPresses = 0
  state.reviewKeys = []
  state.last = null
  lastDemo = null
  resetSelection()
  resetFeedback()
  state.screen = blankScreen(mode)
  if (mode === 'basic' || mode === 'advanced') {
    if (!startQuiz(mode)) enterMode('read')
    return
  }
  void run(async (signal) => prompt(mode === 'read' ? 'mode-read' : 'mode-spell', signal))
}

export function toggleWholes(): void {
  if (inQuiz.value) return
  stopEcho()
  state.showWholes = !state.showWholes
}

export function confirmDialogAnswer(yes: boolean): void {
  const d = state.confirmDialog
  state.confirmDialog = null
  if (yes) d?.onYes()
  else resumeQuiz()
}

/** 高级测验「重新测验」：清空今天的逐题记录，从头开始一轮（家长在记录面板里确认过才会调用） */
export function restartAdvanced(): void {
  clearAdvancedLog()
  if (state.mode === 'advanced') {
    interrupt()
    stopAudio()
    if (!startQuiz('advanced')) enterMode('read')
    return
  }
  enterMode('advanced')
}

/** 结束页按钮 */
export function screenAction(id: 'again' | 'review'): void {
  const q = state.quiz
  if (!q || q.phase !== 'done') return
  if (id === 'again') {
    startQuiz(q.kind)
    return
  }
  const ids = missedKeyIds()
  enterMode('read')
  state.reviewKeys = ids
}

/* ---------- 按键分发 ---------- */

export function pressInitial(i: Initial): void {
  if (skipIntro()) return
  if (state.mode === 'basic') {
    answerBasic('initial', i)
    return
  }
  if (isLocked()) return
  interrupt()
  clearReview(keyId('initial', i))
  if (state.mode === 'read') {
    resetSelection()
    state.screen = { ...blankScreen('read'), big: i }
    void playKey(keyId('initial', i), initialSound(i), null, afterReadPress)
    return
  }
  const sel = state.sel
  sel.initial = i
  sel.whole = null
  lastDemo = null
  // 先点了 u / un（或介母 u + an）再点 j q x y：与 pressFinal 对称，自动改成 ü / ün
  let fixed = false
  if (isJQXY(i)) {
    if (sel.final === 'u' || sel.final === 'un') {
      sel.final = sel.final === 'u' ? 'ü' : 'ün'
      fixed = true
    } else if (sel.medial === 'u' && sel.final && canBeMedialFor('ü', sel.final)) {
      sel.medial = 'ü'
      fixed = true
    }
  }
  renderCompose()
  void playKey(keyId('initial', i), initialSound(i), null, async (signal) => {
    if (fixed && !told.jqx) {
      await prompt('jqx', signal)
      told.jqx = true
    }
  })
}

export function pressFinal(f: Final): void {
  if (skipIntro()) return
  if (state.mode === 'basic') {
    answerBasic('final', f)
    return
  }
  if (isLocked()) return
  interrupt()
  clearReview(keyId('final', f))
  if (state.mode === 'read') {
    state.sel = { initial: null, medial: null, final: f, tone: null, whole: null }
    state.screen = { ...blankScreen('read'), big: f }
    void playKey(keyId('final', f), finalSound(f), null, afterReadPress)
    return
  }
  const sel = state.sel
  sel.whole = null
  lastDemo = null
  // j q x y 后面点 u / un：自动改成 ü / ün，并（第一次）讲小 ü 的儿歌
  let target: Final = f
  let fixed = false
  if (sel.initial && isJQXY(sel.initial) && (f === 'u' || f === 'un')) {
    target = f === 'u' ? 'ü' : 'ün'
    fixed = true
  }
  if (sel.initial && sel.final && isMedial(sel.final) && !sel.medial && canBeMedialFor(sel.final, target)) {
    // 前一个 i / u / ü 变成介母：g + u + ɑ
    sel.medial = sel.final as Medial
    sel.final = target
  } else {
    if (sel.medial && !canBeMedialFor(sel.medial, target)) sel.medial = null
    sel.final = target
  }
  renderCompose()
  void playKey(keyId('final', f), finalSound(target), null, async (signal) => {
    if (fixed && !told.jqx) {
      await prompt('jqx', signal)
      told.jqx = true
    }
  })
}

export function pressWhole(w: Whole): void {
  if (inQuiz.value || isLocked()) return
  interrupt()
  resetSelection()
  state.sel.whole = w
  lastDemo = null
  if (state.mode === 'read') {
    state.screen = { ...blankScreen('read'), big: w, char: '', note: '整体认读音节' }
  } else {
    renderCompose()
  }
  void playKey(keyId('whole', w), wholeSound(w), null, afterReadPress)
}

export function pressTone(t: Tone): void {
  if (skipIntro()) return
  if (state.mode === 'basic' || isLocked()) return
  interrupt()
  state.flashTones = false
  const sel = state.sel
  if (state.mode === 'read') {
    if (sel.final) {
      sel.tone = t
      const f = sel.final
      state.screen = { ...blankScreen('read'), big: applyTone(f, t), char: exampleChar(FINAL_STANDALONE[f], t) }
      void playKey(keyId('final', f), finalSound(f, t), t)
      return
    }
    if (sel.whole) {
      sel.tone = t
      const w = sel.whole
      state.screen = { ...blankScreen('read'), big: applyTone(w, t), char: exampleChar(w, t), note: '整体认读音节' }
      void playKey(keyId('whole', w), wholeSound(w, t), t)
      return
    }
    sel.tone = t
    state.screen = { ...blankScreen('read'), big: applyTone('a', t), note: '声调示范' }
    void playKey(keyId('tone', t), toneSound(t), t)
    return
  }
  sel.tone = t
  lastDemo = null
  renderCompose()
  if (sel.whole) {
    void playKey(keyId('tone', t), wholeSound(sel.whole, t), t)
  } else if (sel.final) {
    void playKey(keyId('final', sel.final), finalSound(sel.final, t), t)
  } else {
    void playKey(keyId('tone', t), toneSound(t), t)
  }
}

/** 点读模式点满 8 次后提示去拼读（每次进入模式一次） */
async function afterReadPress(signal: AbortSignal): Promise<void> {
  if (state.mode !== 'read') return
  state.readPresses += 1
  if (state.readPresses === 8 && !state.suggestSpell) {
    state.suggestSpell = true
    if (suggestTimer) clearTimeout(suggestTimer)
    suggestTimer = setTimeout(() => {
      state.suggestSpell = false
    }, 10000)
    await prompt('try-spell', signal)
  }
}

function clearReview(id: string): void {
  if (state.reviewKeys.includes(id)) state.reviewKeys = state.reviewKeys.filter((k) => k !== id)
}

/** 测验判定阶段 / 结束页时，键盘不响应 */
function isLocked(): boolean {
  const q = state.quiz
  return !!q && q.phase !== 'listening'
}

/* ---------- 拼读屏幕 ---------- */

function renderCompose(): void {
  if (state.mode === 'advanced') {
    renderAdvancedSelection()
    return
  }
  const { initial, medial, final, tone, whole } = state.sel
  if (whole) {
    state.screen = {
      ...blankScreen('spell'),
      pieces: [{ kind: 'whole', text: whole }, { kind: 'tone', text: tone ? String(tone) : '' }],
      big: applyTone(whole, tone),
      char: tone ? exampleChar(whole, tone) : '',
      note: '整体认读音节，不用拼',
    }
    return
  }
  const pieces: Piece[] = [{ kind: 'initial', text: initial ?? '' }]
  if (medial) pieces.push({ kind: 'medial', text: medial })
  pieces.push({ kind: 'final', text: final ?? '' }, { kind: 'tone', text: tone ? String(tone) : '' })
  let big = ''
  let note = ''
  if (initial && final) {
    const written = compose(initial, final, medial)
    if (written) big = applyTone(written, tone)
    else note = '这两个拼不到一起'
  } else if (final) {
    big = applyTone((medial ?? '') + final, tone)
  } else if (initial) {
    big = initial
  }
  state.screen = {
    ...blankScreen('spell'),
    pieces,
    big,
    uHint: !!(initial && final && dropsUmlaut(initial, final, medial)),
    note,
  }
}

/* ---------- 底部三键 ---------- */

export function replay(): void {
  if (skipIntro()) return
  if (state.quiz) {
    replayTarget()
    return
  }
  stopEcho()
  if (lastDemo) {
    const demo = lastDemo
    void run(demo)
    return
  }
  const last = state.last
  if (last) void run(async (signal) => say(last, signal))
}

export function clear(): void {
  if (state.mode === 'basic' || isLocked()) return
  interrupt()
  resetSelection()
  lastDemo = null
  state.flashTones = false
  if (state.mode === 'advanced') {
    renderAdvancedSelection()
    return
  }
  state.screen = blankScreen(state.mode)
}

export function confirm(): void {
  if (state.mode === 'advanced') {
    confirmAdvanced()
    return
  }
  if (state.mode !== 'spell') return
  interrupt()
  const { initial, medial, final, tone, whole } = state.sel

  if (whole) {
    if (!tone) return askTone()
    const w = whole
    state.screen = { ...state.screen, big: applyTone(w, tone), char: exampleChar(w, tone), status: 'ok' }
    void run(async (signal) => say(wholeSound(w, tone), signal))
    return
  }
  if (!final) {
    void run(async (signal) => prompt('pick-final', signal))
    return
  }
  if (!initial) {
    if (!tone) return askTone()
    const f = final
    state.screen = { ...state.screen, big: applyTone((medial ?? '') + f, tone), char: exampleChar(FINAL_STANDALONE[f], tone), status: 'ok' }
    void run(async (signal) => say(finalSound(f, tone), signal))
    return
  }
  const written = compose(initial, final, medial)
  if (!written) return reject('这两个拼不到一起')
  const w = asWhole(written)
  if (w) {
    // zh + i、y + ü 这类拼出来是整体认读音节：整体读，不拆
    state.sel = { initial: null, medial: null, final: null, tone, whole: w }
    renderCompose()
    void run(async (signal) => {
      if (!told.whole) {
        await prompt('whole', signal)
        told.whole = true
      }
      if (!tone) {
        state.flashTones = true
        await prompt('pick-tone', signal)
        return
      }
      state.screen = { ...state.screen, big: applyTone(w, tone), char: exampleChar(w, tone), status: 'ok' }
      await say(wholeSound(w, tone), signal)
    })
    return
  }
  if (!syllableExists(written)) return reject('普通话里没有这个音节')
  if (!tone) return askTone()

  const demo = spellDemo(initial, medial, final, tone, written)
  lastDemo = demo
  void run(demo)
}

function askTone(): void {
  state.flashTones = true
  void run(async (signal) => prompt('pick-tone', signal))
}

function reject(note: string): void {
  state.screen = {
    ...state.screen,
    pieces: state.screen.pieces?.map((p) => ({ ...p, bad: p.kind !== 'tone' })) ?? null,
    status: 'bad',
    note,
  }
  sfxWrong()
  void run(async (signal) => {
    await prompt('no-such', signal)
    state.screen = { ...state.screen, status: '', pieces: state.screen.pieces?.map((p) => ({ ...p, bad: false })) ?? null }
  })
}

/**
 * 拼读演示：b → ā → bā（三拼 g → u → ā → guā），部件与键盘同步点亮，最后合成大字 + 例字。
 */
function spellDemo(initial: Initial, medial: Medial | null, final: Final, tone: Tone, written: string) {
  return async (signal: AbortSignal): Promise<void> => {
    const gap = progress.settings.spellGap
    const pieces: Piece[] = [{ kind: 'initial', text: initial }]
    if (medial) pieces.push({ kind: 'medial', text: medial })
    pieces.push({ kind: 'final', text: final }, { kind: 'tone', text: String(tone) })
    const light = (upTo: number): Piece[] => pieces.map((p, i) => ({ ...p, lit: i < upTo }))
    const base = { ...blankScreen('spell'), uHint: dropsUmlaut(initial, final, medial) }

    state.screen = { ...base, pieces: light(1), big: initial }
    lightKey(keyId('initial', initial))
    await say(initialSound(initial), signal)
    await sleep(gap, signal)

    let n = 1
    if (medial) {
      n += 1
      state.screen = { ...base, pieces: light(n), big: initial + '-' + medial }
      lightKey(keyId('final', medial))
      await say(medialSound(medial), signal)
      await sleep(gap, signal)
    }

    n += 2
    state.screen = { ...base, pieces: light(n), big: applyTone((medial ?? '') + final, tone) }
    lightKey(keyId('final', final), tone)
    await say(finalSound(final, tone), signal)
    await sleep(gap, signal)

    lightKey(null)
    state.screen = { ...base, pieces: light(n), big: applyTone(written, tone), char: exampleChar(written, tone), status: 'ok' }
    await say(syllableSound(written, tone), signal)
    if (medial && !told.sanpin) {
      await prompt('sanpin', signal)
      told.sanpin = true
    }
  }
}

/* ---------- 派生状态 ---------- */

export const inQuiz = computed(() => state.mode === 'basic' || state.mode === 'advanced')

export const canReplay = computed(() => {
  const q = state.quiz
  // intro 时按重听 = 跳过开场白直接出题
  if (q) return q.phase === 'intro' || canReplayTarget()
  return state.last !== null || lastDemo !== null
})

/** 键盘（含声调键）是否处于不响应的判定阶段 */
export const keysLocked = computed(() => isLocked())

export const canClear = computed(() => {
  if (state.mode === 'basic') return false
  if (isLocked()) return false
  const s = state.sel
  return s.initial !== null || s.final !== null || s.tone !== null || s.whole !== null || state.screen.big !== ''
})

export const confirmLabel = computed(() => {
  const q = state.quiz
  if (q?.phase === 'reveal' && q.kind === 'advanced') return '下一题'
  return '确定'
})

export const canConfirm = computed(() => {
  const q = state.quiz
  if (state.mode === 'spell') return state.sel.final !== null || state.sel.whole !== null
  if (state.mode === 'advanced') {
    if (!q) return false
    if (q.phase === 'reveal') return true
    return q.phase === 'listening' && state.sel.final !== null
  }
  return false
})

export const toneMarkOf = (t: Tone): string => TONE_MARKS[t]
