/**
 * 跟读：一组（声母 / 韵母 / 韵母四声 / 整体认读音节 / 整体认读音节四声）从头到尾连着播，每个示范后留出「该你读了」的时间。
 * 播放中再点一次「跟读」= 暂停，再点 = 从暂停的地方继续。
 */
import { INITIALS, FINALS, WHOLES, TONES, applyTone, FINAL_STANDALONE, type Tone } from '@/data/pinyin'
import { exampleChar } from '@/data/syllables'
import { initialSound, finalSound, wholeSound, type Sound } from '@/data/sounds'
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

/** 「该你读了」每次会话只在第一次跟读时讲一遍，之后只用提示音 */
let toldEchoYou = false

function itemsOf(kind: Sequence): Item[] {
  if (kind === 'initials') {
    return INITIALS.map((i) => ({ id: keyId('initial', i), tone: null, big: i, char: '', sound: initialSound(i) }))
  }
  if (kind === 'finals') {
    return FINALS.map((f) => ({ id: keyId('final', f), tone: null, big: f, char: '', sound: finalSound(f) }))
  }
  if (kind === 'wholes') {
    return WHOLES.map((w) => ({ id: keyId('whole', w), tone: null, big: w, char: '', sound: wholeSound(w) }))
  }
  if (kind === 'wholesTones') {
    return WHOLES.flatMap((w) =>
      TONES.map((t) => ({ id: keyId('whole', w), tone: t, big: applyTone(w, t), char: exampleChar(w, t), sound: wholeSound(w, t) })),
    )
  }
  return FINALS.flatMap((f) =>
    TONES.map((t) => ({
      id: keyId('final', f),
      tone: t,
      big: applyTone(f, t),
      char: exampleChar(FINAL_STANDALONE[f], t),
      sound: finalSound(f, t),
    })),
  )
}

/** 彻底停止（切模式、按键、重听……都走这里），进度不保留 */
export function stopEcho(): void {
  if (!state.echo) return
  state.echo = null
  state.screen.waiting = false
  lightKey(null)
  cancel()
}

/** 暂停：停下声音，记住播到哪里，屏幕留着当前这个 */
function pauseEcho(): void {
  const cur = state.echo
  if (!cur || !cur.active) return
  // 示范已经播完、正在等孩子读的，继续时直接到下一个；示范播到一半的，继续时重播这个
  const index = state.screen.waiting ? cur.index + 1 : cur.index
  cancel()
  lightKey(null)
  state.echo = { ...cur, index, active: false }
  state.screen = { ...state.screen, icon: '⏸', waiting: false, note: '已暂停，再点一下「跟读」继续' }
}

/**
 * 点「跟读」：没在跟读 → 从头开始；正在播 → 暂停；暂停中 → 从暂停处继续。
 */
export function toggleEcho(kind: Sequence): void {
  const cur = state.echo
  if (cur && cur.kind === kind) {
    if (cur.active) {
      pauseEcho()
      return
    }
    void playFrom(kind, cur.index)
    return
  }
  stopEcho()
  void playFrom(kind, 0)
}

async function playFrom(kind: Sequence, start: number): Promise<void> {
  const items = itemsOf(kind)
  resetSelection()
  state.echo = { kind, index: Math.min(start, items.length), total: items.length, active: true }
  const mine = state.echo
  await run(async (signal) => {
    try {
      for (let i = start; i < items.length; i++) {
        const item = items[i]!
        mine.index = i
        lightKey(item.id, item.tone)
        state.screen = { ...blankScreen(state.mode), big: item.big, char: item.char, icon: '🔊' }
        await say(item.sound, signal)
        lightKey(null)
        // 第一次跟读：示范完第一个，先用语音说「该你读了」，之后只用提示音 + 等待环
        if (!toldEchoYou) {
          state.screen = { ...state.screen, icon: '👄' }
          await prompt('echo-you', signal)
          toldEchoYou = true
        }
        state.screen = { ...state.screen, icon: '👄', waiting: true, waitMs: progress.settings.echoGap }
        sfxCue()
        await sleep(progress.settings.echoGap, signal)
        state.screen.waiting = false
      }
      state.screen = { ...blankScreen(state.mode), icon: '⭐', note: '跟读完成' }
      state.echo = null
      await prompt('echo-done', signal)
    } finally {
      // 只清理属于本次序列的状态：被 stopEcho() / pauseEcho() / 新序列打断时它们已经写入自己的 echo 与高亮，不能碰
      if (!signal.aborted && state.echo === mine) state.echo = null
      if (!signal.aborted) {
        lightKey(null)
        state.screen.waiting = false
      }
    }
  })
}
