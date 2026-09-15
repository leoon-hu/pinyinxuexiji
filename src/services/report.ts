/**
 * 高级测验记录 → 一张可分享的 PNG（canvas 画的）：日期、已测 / 正确 / 错误、逐题的拼音 + 例字 + 结果。
 * 纯前端生成，不上传；分享走 Web Share API（iPad / 手机），不支持时退回下载链接 + 页面内预览（长按保存）。
 */
import type { AdvancedRecord, AdvancedStats } from '@/store/progress'

export interface ReportInput {
  /** YYYY-MM-DD */
  date: string
  items: AdvancedRecord[]
  stats: AdvancedStats
}

const W = 720
const PAD = 32
const COLS = 4
const GAP = 12
const CELL_H = 96
const SCALE = 2

const RESULT_LABEL: Record<AdvancedRecord['result'], string> = { ok: '一次答对', retry: '重试后答对', bad: '三次都错' }
const RESULT_COLOR: Record<AdvancedRecord['result'], string> = { ok: '#4cae5b', retry: '#f5a623', bad: '#e0301e' }

const FONT_UI = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif"
const FONT_PINYIN = "'Andika', 'Arial', sans-serif"

function fmtDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return y && m && d ? `${y} 年 ${m} 月 ${d} 日` : key
}

function fmtTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 拼音字体（Andika 带全部声调符号）要先加载到内存，canvas 才画得出来 */
async function ensureFonts(): Promise<void> {
  try {
    await document.fonts.load(`700 30px ${FONT_PINYIN}`, 'āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ')
    await document.fonts.load(`400 30px ${FONT_PINYIN}`, 'ü')
  } catch {
    /* 字体没加载到就用系统字体 */
  }
}

export async function renderReport(input: ReportInput): Promise<HTMLCanvasElement> {
  await ensureFonts()
  const rows = Math.ceil(input.items.length / COLS)
  const headerH = 150
  const gridH = rows ? rows * CELL_H + (rows - 1) * GAP : 60
  const footerH = 44
  const H = headerH + gridH + footerH + PAD

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 不可用')
  ctx.scale(SCALE, SCALE)

  // 底：奶油色，顶部一条粉色
  ctx.fillStyle = '#fff8ed'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#f6c3cb'
  ctx.fillRect(0, 0, W, 8)

  // 标题
  ctx.fillStyle = '#333'
  ctx.font = `700 26px ${FONT_UI}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('拼音学习机 · 高级测验', PAD, PAD + 26)
  ctx.fillStyle = '#8a8a8a'
  ctx.font = `400 15px ${FONT_UI}`
  ctx.fillText(`${fmtDate(input.date)} · 听音拼音节`, PAD, PAD + 52)

  // 三个统计块
  const tiles: Array<{ label: string; value: number; color: string }> = [
    { label: '已测', value: input.stats.total, color: '#333' },
    { label: '正确', value: input.stats.correct, color: '#4cae5b' },
    { label: '错误', value: input.stats.wrong, color: '#e0301e' },
  ]
  const tileW = 110
  const tileH = 56
  let tx = W - PAD - tiles.length * tileW - (tiles.length - 1) * 10
  for (const t of tiles) {
    ctx.fillStyle = '#fff'
    roundRect(ctx, tx, PAD, tileW, tileH, 12)
    ctx.fill()
    ctx.fillStyle = '#8a8a8a'
    ctx.font = `400 13px ${FONT_UI}`
    ctx.textAlign = 'center'
    ctx.fillText(t.label, tx + tileW / 2, PAD + 20)
    ctx.fillStyle = t.color
    ctx.font = `700 26px ${FONT_UI}`
    ctx.fillText(String(t.value), tx + tileW / 2, PAD + 48)
    ctx.textAlign = 'left'
    tx += tileW + 10
  }

  // 说明行
  ctx.fillStyle = '#8a8a8a'
  ctx.font = `400 13px ${FONT_UI}`
  const legend = `一次答对 ${input.stats.ok} · 重试后答对 ${input.stats.retry} · 三次都错 ${input.stats.bad}`
  ctx.fillText(legend, PAD, headerH - 22)

  // 逐题格子
  const cellW = (W - PAD * 2 - GAP * (COLS - 1)) / COLS
  if (!input.items.length) {
    ctx.fillStyle = '#8a8a8a'
    ctx.font = `400 16px ${FONT_UI}`
    ctx.textAlign = 'center'
    ctx.fillText('今天还没有做高级测验', W / 2, headerH + 36)
    ctx.textAlign = 'left'
  }
  input.items.forEach((r, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = PAD + col * (cellW + GAP)
    const y = headerH + row * (CELL_H + GAP)
    ctx.fillStyle = '#fff'
    roundRect(ctx, x, y, cellW, CELL_H, 12)
    ctx.fill()
    ctx.fillStyle = RESULT_COLOR[r.result]
    roundRect(ctx, x, y, 6, CELL_H, 3)
    ctx.fill()

    // 序号 + 时间
    ctx.fillStyle = '#b3b3b3'
    ctx.font = `400 12px ${FONT_UI}`
    ctx.fillText(`${i + 1}`, x + 14, y + 18)
    ctx.textAlign = 'right'
    ctx.fillText(fmtTime(r.at), x + cellW - 10, y + 18)
    ctx.textAlign = 'left'

    // 拼音 + 例字
    ctx.font = `700 30px ${FONT_PINYIN}`
    const pw = ctx.measureText(r.pinyin).width
    ctx.font = `400 26px ${FONT_UI}`
    const cw = ctx.measureText(r.char).width
    const gap = 10
    let px = x + (cellW - pw - gap - cw) / 2
    if (px < x + 14) px = x + 14
    ctx.fillStyle = '#1f2b3c'
    ctx.font = `700 30px ${FONT_PINYIN}`
    ctx.fillText(r.pinyin, px, y + 56)
    ctx.fillStyle = '#a9572b'
    ctx.font = `400 26px ${FONT_UI}`
    ctx.fillText(r.char, px + pw + gap, y + 56)

    // 结果
    ctx.fillStyle = RESULT_COLOR[r.result]
    ctx.font = `500 13px ${FONT_UI}`
    ctx.textAlign = 'center'
    const wrongNote = r.result === 'retry' ? `（错 ${r.wrong} 次）` : ''
    ctx.fillText(RESULT_LABEL[r.result] + wrongNote, x + cellW / 2 + 3, y + CELL_H - 14)
    ctx.textAlign = 'left'
  })

  // 页脚
  ctx.fillStyle = '#b3b3b3'
  ctx.font = `400 12px ${FONT_UI}`
  ctx.fillText(`拼音学习机 · ${fmtTime(Date.now())} 生成`, PAD, H - PAD + 4)

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), 'image/png')
  })
}

/** 系统分享面板是否能收图片文件（iOS 15+ / Android Chrome） */
export function canShareImage(): boolean {
  if (typeof navigator === 'undefined' || !('share' in navigator) || !('canShare' in navigator)) return false
  try {
    const probe = new File([new Blob(['x'])], 'x.png', { type: 'image/png' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/** 调系统分享；用户取消或不支持时返回 false（调用方退回下载 / 预览） */
export async function shareImage(blob: Blob, filename: string, title: string): Promise<boolean> {
  if (!canShareImage()) return false
  try {
    await navigator.share({ files: [new File([blob], filename, { type: 'image/png' })], title })
    return true
  } catch {
    return false
  }
}
