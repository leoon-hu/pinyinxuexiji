/**
 * 逻辑模块共用的发声小工具：播一个 Sound 并高亮对应按键。
 */
import type { Tone } from '@/data/pinyin'
import { promptSound, type Sound } from '@/data/sounds'
import type { PromptKey } from '@/data/prompts'
import { play as playAudio } from '@/services/audio'
import { run, check } from './runner'
import { state } from './state'

/** 播一个声音（序列内部用，需传 signal） */
export async function say(sound: Sound, signal: AbortSignal): Promise<void> {
  state.last = sound
  await playAudio(sound.key, sound.text, signal)
  // 播放被打断时 play() 正常 resolve，这里抛出让整条序列停下
  check(signal)
}

export async function prompt(p: PromptKey, signal: AbortSignal): Promise<void> {
  const s = promptSound(p)
  await playAudio(s.key, s.text, signal)
  check(signal)
}

/** 高亮某个键并播它的声音，播完取消高亮；after 可接后续动作 */
export function playKey(
  id: string,
  sound: Sound,
  tone: Tone | null = null,
  after?: (signal: AbortSignal) => Promise<void>,
): Promise<void> {
  return run(async (signal) => {
    state.playing = id
    state.playingTone = tone
    // 被中止时在 abort 事件里同步清理（此时新任务还没写状态）；不能留到 finally——它晚一个微任务，
    // 会盖掉新任务刚点亮的键。正常结束才在 finally 里清。
    const clear = (): void => {
      if (state.playing === id) {
        state.playing = null
        state.playingTone = null
      }
    }
    signal.addEventListener('abort', clear, { once: true })
    try {
      await say(sound, signal)
      if (after) await after(signal)
    } finally {
      signal.removeEventListener('abort', clear)
      if (!signal.aborted) clear()
    }
  })
}

export function lightKey(id: string | null, tone: Tone | null = null): void {
  state.playing = id
  state.playingTone = tone
}
