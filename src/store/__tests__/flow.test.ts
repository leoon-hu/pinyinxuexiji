/**
 * 交互流程回归：用假的播放器（30ms 播完、abort 即结束）跑真实的 session / quiz / echo 逻辑。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/audio', () => ({
  play: vi.fn(
    (_key: string, _text: string, signal?: AbortSignal) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, 30)
        signal?.addEventListener('abort', () => {
          clearTimeout(id)
          resolve()
        })
      }),
  ),
  stop: vi.fn(),
  hasRecording: () => true,
  durationMs: () => 30,
  audioContext: () => null,
  configureAudio: vi.fn(),
  initAudio: vi.fn(),
  unlockAudio: vi.fn(),
  preload: vi.fn(),
}))

import { state, resetSelection, resetFeedback } from '../state'
import { progress, advancedToday, advancedStats, clearAdvancedLog, recordAdvanced } from '../progress'
import { setMode, pressInitial, pressFinal, pressTone, replay, confirm, toggleEcho, interrupt, restartAdvanced } from '../session'
import { cancel } from '../runner'
import { toKey } from '@/data/pinyin'
import { exampleChar } from '@/data/syllables'
import { wordsFor } from '@/data/words'
import type { BasicTarget, AdvancedTarget } from '../quiz'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function startQuiz(kind: 'basic' | 'advanced') {
  setMode('read')
  setMode(kind)
  // 跳过开场白：等 ask() 出题
  await wait(80)
  expect(state.quiz?.phase).toBe('listening')
}

beforeEach(() => {
  cancel()
  interrupt()
  resetSelection()
  resetFeedback()
  progress.settings.unit = 14
  progress.settings.basicLevel = 1
  progress.settings.quizSize = 5
  state.quiz = null
  state.mode = 'read'
})

describe('测验里的重听', () => {
  it('答对后立刻按重听，不会卡在 answered', async () => {
    await startQuiz('basic')
    const t = state.quiz!.targets[0] as BasicTarget
    if (t.keyKind === 'initial') pressInitial(t.value as never)
    else pressFinal(t.value as never)
    expect(state.quiz?.phase).toBe('answered')
    replay()
    await wait(150)
    expect(state.quiz?.index).toBe(1)
    expect(state.quiz?.phase).toBe('listening')
  })

  it('三次错后点了闪烁键，再按重听仍能进下一题', async () => {
    await startQuiz('basic')
    const t = state.quiz!.targets[0] as BasicTarget
    const others = state.enabledKeys!.filter((id) => id !== t.id)
    for (const id of others) {
      const [kind, v] = id.split(':') as ['initial' | 'final', string]
      if (kind === 'initial') pressInitial(v as never)
      else pressFinal(v as never)
      await wait(80)
    }
    expect(state.quiz?.phase).toBe('reveal')
    expect(state.hint).toBe(t.id)
    const tap = () => (t.keyKind === 'initial' ? pressInitial(t.value as never) : pressFinal(t.value as never))
    tap()
    replay() // 打断
    await wait(60)
    expect(state.quiz?.phase).toBe('reveal')
    tap()
    await wait(450)
    expect(state.quiz?.index).toBe(1)
  })
})

describe('出题范围快照', () => {
  it('学到第 1 课时高级测验放宽到第 3 课，键盘范围一致', async () => {
    progress.settings.unit = 1
    await startQuiz('advanced')
    const q = state.quiz!
    expect(q.unit).toBe(3)
    const t = q.targets[0] as AdvancedTarget
    expect(state.enabledKeys).toContain(`initial:${t.initial}`)
    expect(state.enabledKeys).toContain(`final:${t.final}`)
  })

  it('中途改设置不影响本轮', async () => {
    await startQuiz('basic')
    progress.settings.unit = 1
    const t = state.quiz!.targets[0] as BasicTarget
    if (t.keyKind === 'initial') pressInitial(t.value as never)
    else pressFinal(t.value as never)
    await wait(150)
    const t2 = state.quiz!.targets[1] as BasicTarget
    expect(state.enabledKeys).toContain(t2.id)
  })
})

describe('拼读', () => {
  it('先点 u 再点 j → 自动变 ü', () => {
    setMode('spell')
    pressFinal('u')
    pressInitial('j')
    expect(state.sel.final).toBe('ü')
    expect(state.screen.big).toBe('ju')
    expect(state.screen.uHint).toBe(true)
  })

  it('三拼 g + u + ɑ，介母 u 遇到 x 变成 ü', () => {
    setMode('spell')
    pressInitial('g')
    pressFinal('u')
    pressFinal('an')
    expect(state.sel.medial).toBe('u')
    expect(state.screen.big).toBe('guan')
    pressInitial('x')
    expect(state.sel.medial).toBe('ü')
    expect(state.screen.big).toBe('xuan')
    expect(state.screen.uHint).toBe(true)
  })

  it('换韵母不清声调', () => {
    setMode('spell')
    pressInitial('b')
    pressFinal('a')
    pressTone(2)
    pressFinal('o')
    expect(state.sel.tone).toBe(2)
    expect(state.screen.big).toBe('bó')
  })

  it('演示途中清除，按键高亮不残留', async () => {
    setMode('spell')
    pressInitial('b')
    pressFinal('a')
    pressTone(1)
    confirm()
    await wait(10)
    expect(state.playing).toBe('initial:b')
    interrupt()
    await wait(10)
    expect(state.playing).toBeNull()
  })
})

describe('跟读', () => {
  it('声母跟读中切到韵母跟读，状态属于新序列', async () => {
    setMode('read')
    await wait(50)
    toggleEcho('initials')
    await wait(20)
    toggleEcho('finals')
    await wait(20)
    expect(state.echo?.kind).toBe('finals')
    expect(state.echo?.active).toBe(true)
    expect(state.playing).toBe('final:a')
    interrupt()
  })

  it('跟读中按键，新按键的高亮不被旧序列清掉', async () => {
    setMode('read')
    await wait(50)
    toggleEcho('initials')
    await wait(20)
    pressInitial('m')
    await wait(5)
    expect(state.echo).toBeNull()
    expect(state.playing).toBe('initial:m')
    interrupt()
  })
})

describe('高级测验：例字、词语与逐题记录', () => {
  async function answerAdvanced(t: AdvancedTarget, ok: boolean) {
    pressInitial(ok ? t.initial : (t.initial === 'b' ? 'p' : 'b'))
    if (t.medial) pressFinal(t.medial)
    pressFinal(t.final)
    pressTone(t.tone)
    confirm()
  }

  it('听题时显示例字，答对后显示并朗读词语，记入今天的记录', async () => {
    clearAdvancedLog()
    await startQuiz('advanced')
    const t = state.quiz!.targets[0] as AdvancedTarget
    expect(state.screen.char).toBe(exampleChar(t.written, t.tone))
    expect(state.screen.words).toEqual([])
    await answerAdvanced(t, true)
    expect(state.quiz?.phase).toBe('answered')
    expect(state.screen.words).toEqual(wordsFor(t.written, t.tone))
    // 「答对了」→ 第一个词亮起
    await wait(60)
    expect(state.screen.wordLit).toBe(0)
    const items = advancedToday()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ key: toKey(t.written, t.tone), char: exampleChar(t.written, t.tone), result: 'ok', wrong: 0 })
    expect(advancedStats()).toMatchObject({ total: 1, correct: 1, wrong: 0, ok: 1 })
    // 词读完进下一题，词语清掉、例字换成新题的
    await wait(wordsFor(t.written, t.tone).length * 300 + 200)
    expect(state.quiz?.index).toBe(1)
    expect(state.screen.words).toEqual([])
    const t2 = state.quiz!.targets[1] as AdvancedTarget
    expect(state.screen.char).toBe(exampleChar(t2.written, t2.tone))
  })

  it('答错一段例字仍在；三次错记为 bad，重新测验清空记录', async () => {
    clearAdvancedLog()
    await startQuiz('advanced')
    const t = state.quiz!.targets[0] as AdvancedTarget
    for (let i = 0; i < 3; i++) {
      await answerAdvanced(t, false)
      await wait(80)
      if (i < 2) expect(state.screen.char).toBe(exampleChar(t.written, t.tone))
    }
    expect(state.quiz?.phase).toBe('reveal')
    expect(state.screen.words).toEqual(wordsFor(t.written, t.tone))
    expect(advancedStats()).toMatchObject({ total: 1, correct: 0, wrong: 1, bad: 1 })
    expect(advancedToday()[0]).toMatchObject({ result: 'bad', wrong: 3 })
    restartAdvanced()
    expect(advancedToday()).toEqual([])
    expect(state.quiz?.index).toBe(0)
    expect(state.quiz?.phase).toBe('intro')
    interrupt()
  })

  it('记录只属于今天：隔天视为空', () => {
    clearAdvancedLog()
    recordAdvanced({ key: 'ba4', pinyin: 'bà', char: '爸', result: 'ok', wrong: 0, at: Date.now() })
    expect(advancedToday()).toHaveLength(1)
    progress.advanced.date = '2000-01-01'
    expect(advancedToday()).toEqual([])
    recordAdvanced({ key: 'ma1', pinyin: 'mā', char: '妈', result: 'retry', wrong: 1, at: Date.now() })
    expect(advancedToday()).toHaveLength(1)
    expect(advancedStats()).toMatchObject({ total: 1, correct: 1, wrong: 0, retry: 1 })
  })
})
