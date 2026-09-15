/**
 * 答题反馈音效：用 WebAudio 合成，不依赖资源文件。共用 audio.ts 的 AudioContext。
 */
import { audioContext } from './audio'

let enabled = true

export function configureSfx(on: boolean): void {
  enabled = on
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.15): void {
  if (!enabled) return
  const ac = audioContext()
  if (!ac) return
  if (ac.state === 'suspended') void ac.resume()
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, ac.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + duration)
  osc.connect(g).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + duration + 0.05)
}

/** 答对：两个上行音 */
export function sfxCorrect(): void {
  tone(660, 0, 0.12)
  tone(880, 0.12, 0.2)
}

/** 答错：短促、柔和的低音（不用方波，避免刺耳） */
export function sfxWrong(): void {
  tone(220, 0, 0.18, 'triangle', 0.12)
  tone(180, 0.16, 0.22, 'triangle', 0.1)
}

/** 得金币：叮 */
export function sfxCoin(): void {
  tone(1320, 0, 0.08, 'triangle', 0.12)
  tone(1760, 0.08, 0.25, 'triangle', 0.12)
}

/** 跟读「该你了」的轻提示 */
export function sfxCue(): void {
  tone(988, 0, 0.09, 'sine', 0.08)
  tone(1319, 0.1, 0.16, 'sine', 0.08)
}

/** 按键轻触感（很短） */
export function sfxTap(): void {
  tone(1500, 0, 0.03, 'sine', 0.04)
}
