/**
 * 「要播什么」的唯一事实源：每个可发声的东西 → 录音 key（public/audio/<key>.mp3）+ TTS 兜底文字。
 */
import {
  INITIAL_SOUND, FINAL_SOUND, WHOLE_SOUND, FINAL_STANDALONE, applyTone, toKey,
  type Initial, type Final, type Whole, type Tone, type Medial,
} from './pinyin'
import { exampleChar } from './syllables'
import { wordsFor } from './words'
import { PROMPTS, type PromptKey } from './prompts'

export interface Sound {
  key: string
  /** 录音缺失时给 TTS 读的文字 */
  text: string
}

export function initialSound(i: Initial): Sound {
  return { key: toKey(i), text: INITIAL_SOUND[i] }
}

export function medialSound(m: Medial): Sound {
  return { key: toKey(m), text: FINAL_SOUND[m] }
}

export function finalSound(f: Final, tone: Tone | null = null): Sound {
  if (!tone) return { key: toKey(f), text: FINAL_SOUND[f] }
  const char = exampleChar(FINAL_STANDALONE[f], tone)
  return { key: toKey(f, tone), text: char || applyTone(f, tone) }
}

export function wholeSound(w: Whole, tone: Tone | null = null): Sound {
  if (!tone) return { key: toKey(w), text: WHOLE_SOUND[w] }
  const char = exampleChar(w, tone)
  return { key: toKey(w, tone), text: char || applyTone(w, tone) }
}

export function syllableSound(written: string, tone: Tone): Sound {
  const char = exampleChar(written, tone)
  return { key: toKey(written, tone), text: char || applyTone(written, tone) }
}

/** 例字的第 index 个词语（words.ts）：key 形如 w-ba4-1，兜底文字就是词语本身；没有这个词返回 null */
export function wordSound(written: string, tone: Tone, index: number): Sound | null {
  const word = wordsFor(written, tone)[index]
  if (!word) return null
  return { key: `w-${toKey(written, tone)}-${index + 1}`, text: word }
}

/** 声调示范：用 ā á ǎ à */
export function toneSound(t: Tone): Sound {
  return finalSound('a', t)
}

export function promptSound(p: PromptKey): Sound {
  return { key: `p-${p}`, text: PROMPTS[p] }
}
