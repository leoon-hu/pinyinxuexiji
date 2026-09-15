/**
 * 跟读：按行播放（一行 6 个），每个示范后留出「该你读了」的时间，一行结束自动停，再点一次继续下一行。
 */
import { INITIALS, FINALS, TONES, applyTone, FINAL_STANDALONE, type Tone } from '@/data/pinyin'
import { exampleChar } from '@/data/syllables'
import { initialSound, finalSound, type Sound } from '@/data/sounds'
import { sfxCue } from '@/services/sfx'
import { progress } from './progress'
import { run, cancel, sleep } from './runner'
import { state, blankScreen, keyId, resetSelection, type Sequence } from './state'
import { say, prompt, lightKey } from './player'

interface Item {
  id: string
  tone: Tone | null
  big: string
  char: string
  sound: Sound
}

const COLS = 6
/** 「该你读了」每次会话只在第一次跟读时讲一遍，之后只用提示音 */
let toldEchoYou = false

function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function rowsOf(kind: Sequence): Item[][] {
  if (kind === 'initials') {
    return chunk(INITIALS, COLS).map((row) =>
      row.map((i) => ({ id: keyId('initial', i), tone: null, big: i, char: '', sound: initialSound(i) })),
    )
  }
  if (kind === 'finals') {
    return chunk(FINALS, COLS).map((row) =>
      row.map((f) => ({ id: keyId('final', f), tone: null, big: f, char: '', sound: finalSound(f) })),
    )
  }
  return chunk(FINALS, COLS).map((row) =>
    row.flatMap((f) =>
      TONES.map((t) => ({
        id: keyId('final', f),
        tone: t,
        big: applyTone(f, t),
        char: exampleChar(FINAL_STANDALONE[f], t),
        sound: finalSound(f, t),
      })),
    ),
  )
}

export function stopEcho(): void {
  if (!state.echo) return
  state.echo = null
  state.screen.waiting = false
  lightKey(null)
  cancel()
}

/**
 * 点「跟读」：没在跟读 → 从第一行开始；正在播 → 停止；一行播完等待中 → 继续下一行。
 */
export function toggleEcho(kind: Sequence): void {
  const cur = state.echo
  if (cur && cur.kind === kind) {
    if (cur.active) {
      stopEcho()
      return
    }
    void playRow(kind, cur.row)
    return
  }
  stopEcho()
  void playRow(kind, 0)
}

async function playRow(kind: Sequence, row: number): Promise<void> {
  const rows = rowsOf(kind)
  const items = rows[row]
  if (!items) {
    state.echo = null
    return
  }
  resetSelection()
  state.echo = { kind, row, rows: rows.length, active: true }
  const mine = state.echo
  await run(async (signal) => {
    try {
      for (const [i, item] of items.entries()) {
        lightKey(item.id, item.tone)
        state.screen = { ...blankScreen(state.mode), big: item.big, char: item.char, icon: '🔊' }
        await say(item.sound, signal)
        lightKey(null)
        // 第一次跟读：示范完第一个，先用语音说「该你读了」，之后只用提示音 + 等待环
        if (i === 0 && !toldEchoYou) {
          state.screen = { ...state.screen, icon: '👄' }
          await prompt('echo-you', signal)
          toldEchoYou = true
        }
        state.screen = { ...state.screen, icon: '👄', waiting: true, waitMs: progress.settings.echoGap }
        sfxCue()
        await sleep(progress.settings.echoGap, signal)
        state.screen.waiting = false
      }
      const more = row + 1 < rows.length
      state.screen = { ...blankScreen(state.mode), icon: '⭐', note: more ? '再点一次「跟读」继续下一行' : '跟读完成' }
      state.echo = more ? { kind, row: row + 1, rows: rows.length, active: false } : null
      await prompt('echo-done', signal)
      if (more) await prompt('echo-next', signal)
    } finally {
      // 只清理属于本次序列的状态：被 stopEcho() / 新序列打断时它们已经写入自己的 echo 与高亮，不能碰
      if (!signal.aborted && state.echo === mine) state.echo = null
      if (!signal.aborted) {
        lightKey(null)
        state.screen.waiting = false
      }
    }
  })
}
