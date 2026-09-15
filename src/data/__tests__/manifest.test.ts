/**
 * 录音完整性：应用可能请求的每一个 key 都应该在 public/audio/manifest.json 里。
 * 同时也是换录音包后的检查清单。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { INITIALS, FINALS, WHOLES, TONES, compose, toKey, MEDIAL_FINALS, type Medial } from '../pinyin'
import { SYLLABLES } from '../syllables'
import { PROMPTS } from '../prompts'
import { WORD_TABLE } from '../words'
import { initialSound, finalSound, wholeSound, promptSound, syllableSound, wordSound } from '../sounds'

/** 已知没有录音的 key（来源里就没有），走 TTS 兜底 */
const KNOWN_GAPS = new Set(['yo2', 'yo3', 'yo4'])

const manifest = JSON.parse(readFileSync(new URL('../../../public/audio/manifest.json', import.meta.url), 'utf8')) as {
  keys: Record<string, number>
}

describe('录音包', () => {
  it('核心按键（声母 / 韵母 / 带调韵母 / 整体认读 / 引导语）全部有录音', () => {
    const keys = [
      ...INITIALS.map((i) => initialSound(i).key),
      ...FINALS.map((f) => finalSound(f).key),
      ...FINALS.flatMap((f) => TONES.map((t) => finalSound(f, t).key)),
      ...WHOLES.map((w) => wholeSound(w).key),
      ...WHOLES.flatMap((w) => TONES.map((t) => wholeSound(w, t).key)),
      ...(Object.keys(PROMPTS) as Array<keyof typeof PROMPTS>).map((p) => promptSound(p).key),
    ]
    const missing = keys.filter((k) => !(k in manifest.keys))
    expect(missing).toEqual([])
  })

  it('例字表里每个「音节 + 声调」都有录音（已知缺口除外）', () => {
    const missing: string[] = []
    for (const [syl, chars] of Object.entries(SYLLABLES)) {
      chars.forEach((c, i) => {
        if (!c) return
        const key = syllableSound(syl, (i + 1) as 1 | 2 | 3 | 4).key
        if (!(key in manifest.keys) && !KNOWN_GAPS.has(key)) missing.push(key)
      })
    }
    expect(missing).toEqual([])
  })

  it('键盘能拼出的每个音节四声都有录音', () => {
    const missing = new Set<string>()
    for (const i of INITIALS) {
      for (const f of FINALS) {
        const combos: Array<string | null> = [compose(i, f)]
        for (const m of Object.keys(MEDIAL_FINALS) as Medial[]) {
          if (MEDIAL_FINALS[m].includes(f)) combos.push(compose(i, f, m))
        }
        for (const w of combos) {
          if (!w || !(w in SYLLABLES)) continue
          for (const t of TONES) {
            const key = toKey(w, t)
            if (!(key in manifest.keys) && !KNOWN_GAPS.has(key)) missing.add(key)
          }
        }
      }
    }
    expect([...missing]).toEqual([])
  })

  it('词语表里每个词语都有录音', () => {
    const missing: string[] = []
    for (const row of WORD_TABLE) {
      const m = /^([a-zü]+)([1-4])$/.exec(row.key)!
      row.words.forEach((_, i) => {
        const key = wordSound(m[1]!, Number(m[2]) as 1 | 2 | 3 | 4, i)!.key
        if (!(key in manifest.keys)) missing.push(key)
      })
    }
    expect(missing).toEqual([])
  })

  it('时长都是正整数毫秒', () => {
    for (const [k, ms] of Object.entries(manifest.keys)) {
      expect(Number.isInteger(ms) && ms > 0, k).toBe(true)
    }
  })
})
