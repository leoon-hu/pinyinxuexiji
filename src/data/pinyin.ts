/**
 * 拼音基础数据：声母 / 韵母 / 整体认读音节 / 声调 / 介母，以及拼写与标调规则。
 * 顺序即界面按键顺序（与设计稿和统编教材一致，一行 6 个）。
 */

export const INITIALS = [
  'b', 'p', 'm', 'f', 'd', 't',
  'n', 'l', 'g', 'k', 'h', 'j',
  'q', 'x', 'z', 'c', 's', 'zh',
  'ch', 'sh', 'r', 'y', 'w',
] as const

export const FINALS = [
  'a', 'o', 'e', 'i', 'u', 'ü',
  'ai', 'ei', 'ui', 'ao', 'ou', 'iu',
  'ie', 'üe', 'er', 'an', 'en', 'in',
  'un', 'ün', 'ang', 'eng', 'ing', 'ong',
] as const

export const WHOLES = [
  'zhi', 'chi', 'shi', 'ri', 'zi', 'ci',
  'si', 'yi', 'wu', 'yu', 'ye', 'yue',
  'yuan', 'yin', 'yun', 'ying',
] as const

export type Initial = (typeof INITIALS)[number]
export type Final = (typeof FINALS)[number]
export type Whole = (typeof WHOLES)[number]
export type Medial = 'i' | 'u' | 'ü'
/** 1 = 阴平 ˉ，2 = 阳平 ˊ，3 = 上声 ˇ，4 = 去声 ˋ */
export type Tone = 1 | 2 | 3 | 4

export const TONES: Tone[] = [1, 2, 3, 4]
export const TONE_NAMES: Record<Tone, string> = { 1: '第一声', 2: '第二声', 3: '第三声', 4: '第四声' }
export const TONE_MARKS: Record<Tone, string> = { 1: 'ˉ', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ' }

const INITIAL_SET: ReadonlySet<string> = new Set(INITIALS)
const FINAL_SET: ReadonlySet<string> = new Set(FINALS)
const WHOLE_SET: ReadonlySet<string> = new Set(WHOLES)
export const isInitial = (s: string): s is Initial => INITIAL_SET.has(s)
export const isFinal = (s: string): s is Final => FINAL_SET.has(s)
export const isWhole = (s: string): s is Whole => WHOLE_SET.has(s)

/** 韵母按教材分组，用于键盘行底色与家长说明 */
export const FINAL_GROUPS: Array<{ name: string; finals: Final[] }> = [
  { name: '单韵母', finals: ['a', 'o', 'e', 'i', 'u', 'ü'] },
  { name: '复韵母', finals: ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er'] },
  { name: '前鼻韵母', finals: ['an', 'en', 'in', 'un', 'ün'] },
  { name: '后鼻韵母', finals: ['ang', 'eng', 'ing', 'ong'] },
]

/**
 * 三拼音节：介母 + 韵母 的合法搭配（教材口径，ie / üe / iu / ui / un 算复韵母走两拼）。
 * i + a/ao/an/ang/ong → ia iao ian iang iong；u + a/o/ai/an/ang → ua uo uai uan uang；ü + an → üan。
 */
export const MEDIAL_FINALS: Record<Medial, Final[]> = {
  i: ['a', 'ao', 'an', 'ang', 'ong'],
  u: ['a', 'o', 'ai', 'an', 'ang'],
  'ü': ['an'],
}

export function isMedial(f: string): f is Medial {
  return f === 'i' || f === 'u' || f === 'ü'
}

export function canBeMedialFor(medial: Final, final: Final): boolean {
  return isMedial(medial) && MEDIAL_FINALS[medial].includes(final)
}

/**
 * 呼读音的 TTS 兜底文字（《汉语拼音方案》注音字）。正常情况下都有录音，这里只在录音缺失时用。
 */
export const INITIAL_SOUND: Record<Initial, string> = {
  b: '玻', p: '坡', m: '摸', f: '佛', d: '德', t: '特', n: '讷', l: '勒',
  g: '哥', k: '科', h: '喝', j: '基', q: '欺', x: '希',
  z: '资', c: '雌', s: '思', zh: '知', ch: '蚩', sh: '诗', r: '日',
  y: '衣', w: '乌',
}

export const FINAL_SOUND: Record<Final, string> = {
  a: '啊', o: '喔', e: '鹅', i: '衣', u: '乌', 'ü': '迂',
  ai: '哀', ei: '欸', ui: '威', ao: '熬', ou: '欧', iu: '忧',
  ie: '耶', 'üe': '约', er: '儿', an: '安', en: '恩', in: '因',
  un: '温', 'ün': '晕', ang: '昂', eng: '鞥', ing: '英', ong: '嗡',
}

export const WHOLE_SOUND: Record<Whole, string> = {
  zhi: '知', chi: '吃', shi: '诗', ri: '日', zi: '资', ci: '雌', si: '思',
  yi: '衣', wu: '乌', yu: '迂', ye: '耶', yue: '约', yuan: '冤',
  yin: '因', yun: '晕', ying: '英',
}

/** 韵母单独成音节时的书写形式（i → yi、ü → yu、un → wen …），用于查带声调的例字 */
export const FINAL_STANDALONE: Record<Final, string> = {
  a: 'a', o: 'o', e: 'e', i: 'yi', u: 'wu', 'ü': 'yu',
  ai: 'ai', ei: 'ei', ui: 'wei', ao: 'ao', ou: 'ou', iu: 'you',
  ie: 'ye', 'üe': 'yue', er: 'er', an: 'an', en: 'en', in: 'yin',
  un: 'wen', 'ün': 'yun', ang: 'ang', eng: 'eng', ing: 'ying', ong: 'ong',
}

/**
 * 听音测验里读音相同、都算对的键：y 读「衣」= i，w 读「乌」= u。
 * 用键值而不是文字比较，换录音也不受影响。
 */
export const SAME_SOUND: Record<string, string> = { y: 'i', w: 'u' }
export function soundGroup(value: string): string {
  return SAME_SOUND[value] ?? value
}

const TONED_VOWELS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/**
 * 标调：有 a 不放过，没 a 找 o e，i u 并列标在后。
 */
export function applyTone(syllable: string, tone: Tone | null): string {
  if (!tone) return syllable
  let idx = -1
  for (const v of ['a', 'o', 'e']) {
    idx = syllable.indexOf(v)
    if (idx >= 0) break
  }
  if (idx < 0) {
    // 只剩 i / u / ü：iu 标 u、ui 标 i，即标在靠后的那个
    for (let i = syllable.length - 1; i >= 0; i--) {
      if ('iuü'.includes(syllable[i]!)) {
        idx = i
        break
      }
    }
  }
  if (idx < 0) return syllable
  const vowel = syllable[idx]!
  return syllable.slice(0, idx) + TONED_VOWELS[vowel]![tone - 1] + syllable.slice(idx + 1)
}

const JQXY = new Set(['j', 'q', 'x', 'y'])
export const isJQXY = (i: string): boolean => JQXY.has(i)

/**
 * 声母（+ 介母）+ 韵母 → 书写形式；不合法返回 null。
 * - j q x y 后面的 ü 去掉两点（ju / que / xun / yu / juan）；它们不能直接拼 u / un（应当用 ü / ün）。
 * - 三拼：介母只能是 i / u / ü，且只与 MEDIAL_FINALS 里的韵母搭配。
 */
export function compose(initial: Initial, final: Final, medial: Medial | null = null): string | null {
  let rhyme: string = final
  if (medial) {
    if (!canBeMedialFor(medial, final)) return null
    rhyme = medial + final
  }
  if (JQXY.has(initial)) {
    if (rhyme === 'u' || rhyme === 'un') return null
    rhyme = rhyme.replace('ü', 'u')
  }
  return initial + rhyme
}

/** j q x y 后面的 ü（含介母 ü）会去掉两点：屏幕上要把那个 u 标出来 */
export function dropsUmlaut(initial: string, final: string, medial: Medial | null = null): boolean {
  return JQXY.has(initial) && ((medial ?? '') + final).startsWith('ü')
}

/** 拼出来的写法是否正好是整体认读音节（zh + i = zhi 之类），拼读时应整体读 */
export function asWhole(written: string): Whole | null {
  return isWhole(written) ? written : null
}

/** 录音文件 / 缓存用的 ASCII 键：ü → v */
export function toKey(pinyin: string, tone?: Tone | null): string {
  return pinyin.replace(/ü/g, 'v') + (tone ?? '')
}
