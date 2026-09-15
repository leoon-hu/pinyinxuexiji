import { describe, it, expect } from 'vitest'
import { applyTone, compose, asWhole, toKey, canBeMedialFor, soundGroup, INITIALS, FINALS, WHOLES } from '../pinyin'
import { SYLLABLES, syllableExists, exampleChar } from '../syllables'
import { UNITS, unlockedThrough } from '../units'

describe('标调', () => {
  it('有 a 不放过，没 a 找 o e', () => {
    expect(applyTone('ba', 1)).toBe('bā')
    expect(applyTone('lao', 3)).toBe('lǎo')
    expect(applyTone('lou', 2)).toBe('lóu')
    expect(applyTone('lei', 2)).toBe('léi')
    expect(applyTone('üe', 4)).toBe('üè')
  })
  it('i u 并列标在后', () => {
    expect(applyTone('liu', 2)).toBe('liú')
    expect(applyTone('gui', 4)).toBe('guì')
    expect(applyTone('jiu', 3)).toBe('jiǔ')
  })
  it('单个 i u ü', () => {
    expect(applyTone('i', 1)).toBe('ī')
    expect(applyTone('lü', 4)).toBe('lǜ')
    expect(applyTone('ün', 2)).toBe('ǘn')
  })
  it('无声调原样返回', () => {
    expect(applyTone('ba', null)).toBe('ba')
  })
})

describe('拼写', () => {
  it('两拼', () => {
    expect(compose('b', 'a')).toBe('ba')
    expect(compose('zh', 'ang')).toBe('zhang')
    expect(compose('d', 'iu')).toBe('diu')
  })
  it('j q x y 后面 ü 去两点，不能直接拼 u / un', () => {
    expect(compose('j', 'ü')).toBe('ju')
    expect(compose('x', 'üe')).toBe('xue')
    expect(compose('q', 'ün')).toBe('qun')
    expect(compose('y', 'ü')).toBe('yu')
    expect(compose('j', 'u')).toBeNull()
    expect(compose('x', 'un')).toBeNull()
  })
  it('n l 后面 ü 保留两点', () => {
    expect(compose('n', 'ü')).toBe('nü')
    expect(compose('l', 'üe')).toBe('lüe')
  })
  it('三拼：介母 + 韵母', () => {
    expect(compose('g', 'a', 'u')).toBe('gua')
    expect(compose('j', 'a', 'i')).toBe('jia')
    expect(compose('x', 'ong', 'i')).toBe('xiong')
    expect(compose('j', 'an', 'ü')).toBe('juan')
    expect(compose('h', 'ang', 'u')).toBe('huang')
  })
  it('不合法的介母搭配', () => {
    expect(compose('g', 'i', 'u')).toBeNull()
    expect(compose('b', 'e', 'i')).toBeNull()
    expect(canBeMedialFor('ü', 'a')).toBe(false)
    expect(canBeMedialFor('i', 'ao')).toBe(true)
  })
  it('拼出整体认读音节', () => {
    expect(asWhole('zhi')).toBe('zhi')
    expect(asWhole(compose('y', 'an', 'ü')!)).toBe('yuan')
    expect(asWhole('zha')).toBeNull()
  })
})

describe('录音 key', () => {
  it('ü 写 v，声调数字附在后面', () => {
    expect(toKey('lü', 4)).toBe('lv4')
    expect(toKey('nüe', 4)).toBe('nve4')
    expect(toKey('b')).toBe('b')
    expect(toKey('ü', 2)).toBe('v2')
  })
  it('y / w 与 i / u 同音', () => {
    expect(soundGroup('y')).toBe('i')
    expect(soundGroup('w')).toBe('u')
    expect(soundGroup('b')).toBe('b')
  })
})

describe('例字表', () => {
  it('所有整体认读音节都在表里', () => {
    for (const w of WHOLES) expect(syllableExists(w)).toBe(true)
  })
  it('声母 + 韵母（含三拼）能拼出的音节大多数在表里', () => {
    let reachable = 0
    for (const s of Object.keys(SYLLABLES)) {
      const hit = INITIALS.some((i) =>
        FINALS.some((f) => compose(i, f) === s || (['i', 'u', 'ü'] as const).some((m) => compose(i, f, m) === s)),
      )
      if (hit) reachable += 1
    }
    // 只有零声母音节（a o e ai … er）拼不出来
    expect(Object.keys(SYLLABLES).length - reachable).toBeLessThanOrEqual(12)
  })
  it('例字没有空格、每个音节四个位置', () => {
    for (const [syl, chars] of Object.entries(SYLLABLES)) {
      expect(chars).toHaveLength(4)
      for (const c of chars) expect(c.length).toBeLessThanOrEqual(1)
      expect(syl).toMatch(/^[a-zü]+$/)
    }
    expect(exampleChar('ba', 1)).toBe('八')
    expect(exampleChar('nope', 1)).toBe('')
  })
})

describe('教材分课', () => {
  it('14 课覆盖全部声母、韵母、整体认读音节', () => {
    const all = unlockedThrough(UNITS.length)
    expect(all.initials.size).toBe(INITIALS.length)
    expect(all.finals.size).toBe(FINALS.length)
    expect(all.wholes.size).toBe(WHOLES.length)
    expect(all.medials).toBe(true)
  })
  it('第 4 课只有 ɑ o e i u ü 和 b p m f d t n l', () => {
    const u = unlockedThrough(4)
    expect([...u.initials]).toEqual(['b', 'p', 'm', 'f', 'd', 't', 'n', 'l'])
    expect([...u.finals]).toEqual(['a', 'o', 'e', 'i', 'u', 'ü'])
    expect(u.medials).toBe(false)
  })
})
