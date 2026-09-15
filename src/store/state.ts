/**
 * 学习机的全部界面状态。逻辑在 session / quiz / echo 里，组件只读这里、把事件转给逻辑模块。
 */
import { reactive } from 'vue'
import type { Initial, Final, Whole, Medial, Tone } from '@/data/pinyin'
import type { Sound } from '@/data/sounds'
import type { Quiz } from './quiz'

export type Mode = 'read' | 'spell' | 'basic' | 'advanced'
/** 跟读的组；random = 键盘上的声母（或整体认读音节）+ 韵母打乱一起播 */
export type Sequence = 'initials' | 'finals' | 'finalsTones' | 'wholes' | 'wholesTones' | 'random'
export type KeyKind = 'initial' | 'final' | 'whole' | 'tone'

export const MODE_LABEL: Record<Mode, string> = {
  read: '点读', spell: '拼读', basic: '初级测验', advanced: '高级测验',
}
export const MODE_ICON: Record<Mode, string> = {
  read: '🔊', spell: '🧩', basic: '👂', advanced: '🏆',
}

export interface Piece {
  kind: 'initial' | 'medial' | 'final' | 'tone' | 'whole'
  text: string
  /** 演示时点亮 */
  lit?: boolean
  /** 答错的段 */
  bad?: boolean
}

export interface ScreenAction {
  id: 'again' | 'review'
  label: string
  icon: string
}

export interface Screen {
  /** 拼读 / 高级测验的部件框；null = 不显示 */
  pieces: Piece[] | null
  /** 大字：拼音 */
  big: string
  /** ü 去点后的 u 用橙色标出 */
  uHint: boolean
  /** 例字 */
  char: string
  /** 例字的词语（高级测验答对后显示并朗读） */
  words: string[]
  /** 正在朗读的词语下标，-1 = 没有 */
  wordLit: number
  /** 大图标（👂 听、👄 该你读…） */
  icon: string
  /** 小字提示（家长可读，孩子靠语音） */
  note: string
  status: '' | 'ok' | 'bad'
  /** 测验进度点 */
  progress: Array<'ok' | 'retry' | 'bad' | 'cur' | null> | null
  /** 跟读「该你读了」的等待环 */
  waiting: boolean
  waitMs: number
  /** 结束页的大按钮 */
  actions: ScreenAction[]
}

export function blankScreen(mode: Mode): Screen {
  // 拼读类模式一开始就画出三个空框，孩子知道要填什么
  const pieces: Piece[] | null =
    mode === 'spell' || mode === 'advanced'
      ? [{ kind: 'initial', text: '' }, { kind: 'final', text: '' }, { kind: 'tone', text: '' }]
      : null
  return {
    pieces,
    big: '',
    uHint: false,
    char: '',
    words: [],
    wordLit: -1,
    icon: '',
    note: '',
    status: '',
    progress: null,
    waiting: false,
    waitMs: 0,
    actions: [],
  }
}

export interface Selection {
  initial: Initial | null
  medial: Medial | null
  final: Final | null
  tone: Tone | null
  whole: Whole | null
}

export function keyId(kind: KeyKind, value: string | number): string {
  return `${kind}:${value}`
}

export const state = reactive({
  mode: 'read' as Mode,
  showWholes: false,
  sel: { initial: null, medial: null, final: null, tone: null, whole: null } as Selection,
  screen: blankScreen('read') as Screen,
  /** 正在发声的键 id（keyId），用于高亮 */
  playing: null as string | null,
  playingTone: null as Tone | null,
  quiz: null as Quiz | null,
  /** 跟读进度：index = 正在播（或暂停后要继续）的位置，order[位置] = 该组里第几项（随机跟读是打乱的），active = false 表示暂停中 */
  echo: null as null | { kind: Sequence; index: number; total: number; active: boolean; order: number[] },
  /** 本题允许点的键；null = 全部 */
  enabledKeys: null as string[] | null,
  /** 本题点错的键 */
  wrongKeys: [] as string[],
  /** 需要孩子点一下的键（闪烁） */
  hint: null as string | null,
  /** 提醒选声调：四个声调键闪烁 */
  flashTones: false,
  /** 提醒按「确定」（高级测验揭晓后） */
  flashConfirm: false,
  /** 测验错过的键，回到点读模式时脉冲提示 */
  reviewKeys: [] as string[],
  /** 点读模式里点过的次数，到一定数量提示去拼读 */
  readPresses: 0,
  suggestSpell: false,
  last: null as Sound | null,
  confirmDialog: null as null | { text: string; icon: string; onYes: () => void },
})

export function resetSelection(): void {
  state.sel = { initial: null, medial: null, final: null, tone: null, whole: null }
}

export function resetFeedback(): void {
  state.enabledKeys = null
  state.wrongKeys = []
  state.hint = null
  state.flashTones = false
  state.flashConfirm = false
}
