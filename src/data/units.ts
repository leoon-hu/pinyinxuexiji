/**
 * 汉语拼音 14 课，分课顺序按统编版小学语文教材（2024 版）的拼音单元。测验出题范围按「学到第几课」过滤。
 * 顺序与 INITIALS / FINALS 的键盘顺序一致，只是分课。
 */
import type { Initial, Final, Whole } from './pinyin'

export interface Unit {
  /** 1..14 */
  no: number
  title: string
  initials: Initial[]
  finals: Final[]
  wholes: Whole[]
  /** 本课起出现三拼音节 */
  medials?: boolean
}

export const UNITS: Unit[] = [
  { no: 1, title: 'ɑ o e', initials: [], finals: ['a', 'o', 'e'], wholes: [] },
  { no: 2, title: 'i u ü', initials: [], finals: ['i', 'u', 'ü'], wholes: [] },
  { no: 3, title: 'b p m f', initials: ['b', 'p', 'm', 'f'], finals: [], wholes: [] },
  { no: 4, title: 'd t n l', initials: ['d', 't', 'n', 'l'], finals: [], wholes: [] },
  { no: 5, title: 'g k h', initials: ['g', 'k', 'h'], finals: [], wholes: [], medials: true },
  { no: 6, title: 'j q x', initials: ['j', 'q', 'x'], finals: [], wholes: [] },
  { no: 7, title: 'z c s', initials: ['z', 'c', 's'], finals: [], wholes: ['zi', 'ci', 'si'] },
  { no: 8, title: 'zh ch sh r', initials: ['zh', 'ch', 'sh', 'r'], finals: [], wholes: ['zhi', 'chi', 'shi', 'ri'] },
  { no: 9, title: 'y w', initials: ['y', 'w'], finals: [], wholes: ['yi', 'wu', 'yu'] },
  { no: 10, title: 'ɑi ei ui', initials: [], finals: ['ai', 'ei', 'ui'], wholes: [] },
  { no: 11, title: 'ɑo ou iu', initials: [], finals: ['ao', 'ou', 'iu'], wholes: [] },
  { no: 12, title: 'ie üe er', initials: [], finals: ['ie', 'üe', 'er'], wholes: ['ye', 'yue'] },
  { no: 13, title: 'ɑn en in un ün', initials: [], finals: ['an', 'en', 'in', 'un', 'ün'], wholes: ['yuan', 'yin', 'yun'] },
  { no: 14, title: 'ɑng eng ing ong', initials: [], finals: ['ang', 'eng', 'ing', 'ong'], wholes: ['ying'] },
]

export const LAST_UNIT = UNITS.length

export interface Unlocked {
  initials: Set<Initial>
  finals: Set<Final>
  wholes: Set<Whole>
  medials: boolean
}

/** 学到第 n 课时已经学过的内容（含第 n 课） */
export function unlockedThrough(n: number): Unlocked {
  const out: Unlocked = { initials: new Set(), finals: new Set(), wholes: new Set(), medials: false }
  for (const u of UNITS) {
    if (u.no > n) break
    u.initials.forEach((i) => out.initials.add(i))
    u.finals.forEach((f) => out.finals.add(f))
    u.wholes.forEach((w) => out.wholes.add(w))
    if (u.medials) out.medials = true
  }
  return out
}
