/**
 * 词语表与例字表的一致性：高级测验会考的每个例字都要有词语，词语里必须含这个例字。
 */
import { describe, it, expect } from 'vitest'
import { SYLLABLES, exampleChar } from '../syllables'
import { WORD_TABLE, wordsFor } from '../words'
import { advancedPool } from '@/store/quiz'

describe('词语表', () => {
  it('每行的例字与 syllables.ts 同一「音节 + 声调」的例字一致', () => {
    const bad: string[] = []
    for (const row of WORD_TABLE) {
      const m = /^([a-zü]+)([1-4])$/.exec(row.key)
      if (!m) {
        bad.push(`${row.key}: key 格式不对`)
        continue
      }
      const char = exampleChar(m[1]!, Number(m[2]) as 1 | 2 | 3 | 4)
      if (char !== row.char) bad.push(`${row.key}: 词语表是「${row.char}」，例字表是「${char || '-'}」`)
    }
    expect(bad).toEqual([])
  })

  it('每个词语都含例字，一到两个，不重复', () => {
    const bad: string[] = []
    for (const row of WORD_TABLE) {
      if (row.words.length < 1 || row.words.length > 2) bad.push(`${row.key}: ${row.words.length} 个词`)
      if (new Set(row.words).size !== row.words.length) bad.push(`${row.key}: 词语重复`)
      for (const w of row.words) {
        if (!w.includes(row.char)) bad.push(`${row.key}: 「${w}」不含「${row.char}」`)
        if (w.length < 2 || w.length > 5) bad.push(`${row.key}: 「${w}」长度不对`)
      }
    }
    expect(bad).toEqual([])
  })

  it('高级测验题库里的每个例字都有词语', () => {
    const missing = advancedPool(14)
      .filter((t) => wordsFor(t.written, t.tone).length === 0)
      .map((t) => `${t.written}${t.tone} ${exampleChar(t.written, t.tone)}`)
    expect(missing).toEqual([])
  })

  it('例字表里没有生僻 / 不宜的字（抽查）', () => {
    const banned = '癌跛叵呸剖瞥瞟聘卯谋谬酩匪坟讽唾屯讷馁囊聂捻酿奴虐凛吝鲁裸卵梗寡巩抠刊傀款恨窘寝沁瘸朽炫熏债昌逞踹蠢奢肾硕饶匝咋宰贼葬惨岑搔僧髓瓮骂骗贫赌揍诈'
    const found: string[] = []
    for (const [syl, chars] of Object.entries(SYLLABLES)) {
      chars.forEach((c, i) => {
        if (c && banned.includes(c)) found.push(`${syl}${i + 1} ${c}`)
      })
    }
    expect(found).toEqual([])
  })
})
