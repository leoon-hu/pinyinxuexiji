/**
 * 浏览器 TTS，只做录音缺失时的兜底（正常情况下所有声音都来自 public/audio/ 的录音）。
 * 自动选一个普通话语音，不提供给用户挑选。
 */

const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window
const PREFERRED = ['Tingting', '婷婷', 'Google 普通话', 'Huihui', 'Xiaoxiao', 'Yaoyao', 'Lili']
let currentUtterance: SpeechSynthesisUtterance | null = null
let pendingSpeak: ReturnType<typeof setTimeout> | null = null

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (!hasTTS) return undefined
  const voices = speechSynthesis.getVoices().filter((v) => /^(zh|cmn)([-_]|$)/i.test(v.lang))
  const cn = voices.filter((v) => /zh[-_]CN|cmn/i.test(v.lang))
  const pool = cn.length ? cn : voices
  for (const name of PREFERRED) {
    const hit = pool.find((v) => v.name.includes(name))
    if (hit) return hit
  }
  return pool[0]
}

/** 读一段文字；signal 中止时停止。结束、出错、超时都会 resolve。 */
export function tts(text: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (!hasTTS || !text || signal?.aborted) return resolve()
    stopTTS()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 0.9
    const voice = pickVoice()
    if (voice) u.voice = voice
    let done = false
    const finish = () => {
      if (done) return
      done = true
      signal?.removeEventListener('abort', onAbort)
      if (currentUtterance === u) currentUtterance = null
      resolve()
    }
    const onAbort = () => {
      speechSynthesis.cancel()
      finish()
    }
    u.onend = finish
    u.onerror = finish
    signal?.addEventListener('abort', onAbort, { once: true })
    // 挂到模块变量防止被 GC 后 onend 不触发（Chrome 已知问题）
    currentUtterance = u
    // cancel() 后立刻 speak() 在部分浏览器会吞掉新语音，稍等一拍
    pendingSpeak = setTimeout(() => {
      pendingSpeak = null
      if (done) return
      speechSynthesis.speak(u)
    }, 40)
    // 兜底：按字数估算，避免 onend 不触发时序列卡死
    setTimeout(finish, 600 + text.length * 250)
  })
}

export function stopTTS(): void {
  if (!hasTTS) return
  if (pendingSpeak) {
    clearTimeout(pendingSpeak)
    pendingSpeak = null
  }
  speechSynthesis.cancel()
  currentUtterance = null
}
