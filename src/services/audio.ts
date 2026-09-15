/**
 * 播放引擎：public/audio/<key>.mp3 录音优先，缺失时才退回 TTS。
 * - 一个共享 AudioContext，首次触摸时解锁（iOS / Safari 的自动播放限制），之后序列播放不再受手势约束。
 * - 用 manifest.json 判断有哪些录音，不靠 404 试探。
 * - 核心按键预解码成 AudioBuffer（起播延迟 < 10ms），音节按需加载并做 LRU。
 * - file:// 打开（fetch 不可用）时退化为 <audio> 元素池。
 * 同一时刻只播一个声音；新的 play 会打断上一个，序列播放靠 await 串起来。
 */
import { tts, stopTTS } from './speech'

interface Manifest {
  version: number
  keys: Record<string, number>
}

const settings = { volume: 1, ttsFallback: true }
let manifest: Manifest | null = null
let manifestFailed = false
let ctx: AudioContext | null = null
let gain: GainNode | null = null
let elementMode = false
const buffers = new Map<string, AudioBuffer>()
const MAX_BUFFERS = 400
const inflight = new Map<string, Promise<AudioBuffer | null>>()
/** 确认不存在（404）的 key，避免反复请求 */
const missing = new Set<string>()
let current: { stop(): void } | null = null

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
const pool: HTMLAudioElement[] = []
let poolIndex = 0

export function configureAudio(patch: Partial<typeof settings>): void {
  Object.assign(settings, patch)
  // 存储里的音量坏了（NaN / 越界）也不能让整个应用哑掉
  if (!Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1) settings.volume = 1
  if (gain) gain.gain.value = settings.volume
  for (const el of pool) el.volume = settings.volume
}

const DEV = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV
function warn(...args: unknown[]): void {
  if (DEV) console.warn('[audio]', ...args)
}

function url(key: string): string {
  return `./audio/${key}.mp3`
}

/** 启动时读 manifest；读不到（file:// 或缺文件）就当作「未知」，播放时再试探 */
export async function initAudio(): Promise<void> {
  if (typeof window === 'undefined') return
  if (location.protocol === 'file:') {
    elementMode = true
    manifestFailed = true
    return
  }
  try {
    const res = await fetch(url('manifest').replace('.mp3', '.json'), { cache: 'no-cache' })
    if (!res.ok) throw new Error(String(res.status))
    manifest = (await res.json()) as Manifest
    manifestFailed = false
    missing.clear()
  } catch {
    manifestFailed = true
  }
}

/** manifest 读不到（file:// / 网络失败）时一律当「未知」，播放时再试探，缺文件才退 TTS */
export function hasRecording(key: string): boolean {
  if (missing.has(key)) return false
  if (manifest) return key in manifest.keys
  return true
}

export function durationMs(key: string): number {
  return manifest?.keys[key] ?? 0
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  if (!ctx) {
    ctx = new AudioContext()
    gain = ctx.createGain()
    gain.gain.value = settings.volume
    gain.connect(ctx.destination)
  }
  return ctx
}

export function audioContext(): AudioContext | null {
  return ensureContext()
}

let unlocked = false
export function isUnlocked(): boolean {
  return unlocked
}

/** 在用户手势里调用（每次触摸都可以调，很便宜）：恢复 AudioContext、解锁 <audio> 元素池 */
export function unlockAudio(): void {
  const ac = ensureContext()
  if (ac) {
    if ((ac.state as string) !== 'running') {
      ac.resume().then(
        () => {
          unlocked = true
        },
        (e: unknown) => warn('resume 失败', e),
      )
    } else {
      unlocked = true
    }
    // 播一帧静音，iOS 才真正解锁
    try {
      const buf = ac.createBuffer(1, 1, ac.sampleRate)
      const src = ac.createBufferSource()
      src.buffer = buf
      src.connect(ac.destination)
      src.start()
    } catch (e) {
      warn('静音帧失败', e)
    }
  }
  if (!pool.length) {
    for (let i = 0; i < 3; i++) {
      const el = new Audio()
      el.preload = 'auto'
      el.volume = settings.volume
      pool.push(el)
    }
  }
  for (const el of pool) {
    if (el.src) continue
    el.src = SILENT_WAV
    el.play().then(() => el.pause()).catch(() => {})
  }
}

async function decode(ac: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // 老 Safari 只支持回调式 decodeAudioData
  return new Promise((resolve, reject) => {
    const p = ac.decodeAudioData(data, resolve, reject)
    if (p && typeof (p as Promise<AudioBuffer>).then === 'function') {
      ;(p as Promise<AudioBuffer>).then(resolve, reject)
    }
  })
}

function remember(key: string, buf: AudioBuffer): void {
  buffers.delete(key)
  buffers.set(key, buf)
  if (buffers.size > MAX_BUFFERS) {
    const oldest = buffers.keys().next().value
    if (oldest !== undefined) buffers.delete(oldest)
  }
}

/** 取（并缓存）解码后的 buffer；取不到返回 null（缺文件 / file:// / 解码失败） */
function getBuffer(key: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(key)
  if (cached) {
    remember(key, cached)
    return Promise.resolve(cached)
  }
  const pending = inflight.get(key)
  if (pending) return pending
  const ac = ensureContext()
  if (!ac || elementMode) return Promise.resolve(null)
  const task = (async () => {
    try {
      const res = await fetch(url(key))
      if (!res.ok) {
        // 只记确定缺失的；网络抖动不记，否则一次断网会把 key 永久拉黑
        if (res.status === 404 || res.status === 410) missing.add(key)
        return null
      }
      const buf = await decode(ac, await res.arrayBuffer())
      remember(key, buf)
      return buf
    } catch {
      // fetch 在 file:// 下会直接抛错：以后都走 <audio> 元素
      if (location.protocol === 'file:') elementMode = true
      return null
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, task)
  return task
}

/** 预解码一批 key（并发 6），失败静默 */
export async function preload(keys: string[]): Promise<void> {
  if (elementMode) return
  const queue = keys.filter((k) => hasRecording(k) && !buffers.has(k))
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const k = queue.shift()
      if (k) await getBuffer(k)
    }
  })
  await Promise.all(workers)
}

/**
 * 上下文还没 running 时 start() 永远不会 ended：先 resume，最多等 1 秒（Safari 首次解锁可能要几百毫秒），
 * 仍不行就返回 false，让调用方改走 <audio> 元素。
 */
async function contextReady(ac: AudioContext): Promise<boolean> {
  if ((ac.state as string) === 'running') return true
  ac.resume().catch((e: unknown) => warn('resume 失败', e))
  const deadline = Date.now() + 1000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25))
    if ((ac.state as string) === 'running') return true
  }
  warn('AudioContext 一直是', ac.state)
  return false
}

/** 返回 false 表示上下文没准备好，没有播 */
async function playBuffer(buf: AudioBuffer, signal?: AbortSignal): Promise<boolean> {
  const ac = ensureContext()!
  if (signal?.aborted) return true
  if (!(await contextReady(ac))) return false
  if (signal?.aborted) return true
  return new Promise((resolve) => {
    const src = ac.createBufferSource()
    src.buffer = buf
    src.connect(gain ?? ac.destination)
    let done = false
    const finish = () => {
      if (done) return
      done = true
      signal?.removeEventListener('abort', stopNow)
      if (current?.stop === stopNow) current = null
      resolve(true)
    }
    const stopNow = () => {
      try {
        src.stop()
      } catch {
        /* 已经停了 */
      }
      finish()
    }
    src.onended = finish
    signal?.addEventListener('abort', stopNow, { once: true })
    current = { stop: stopNow }
    src.start()
    // 兜底：onended 不触发（标签页切后台等）时不要卡住序列
    setTimeout(finish, buf.duration * 1000 + 1500)
  })
}

/** <audio> 元素播放；返回 false 表示文件缺失或无法播放（需要兜底） */
function playElement(key: string, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pool.length) unlockAudio()
    const el = pool[poolIndex++ % pool.length]!
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      el.onended = null
      el.onerror = null
      signal?.removeEventListener('abort', stopNow)
      if (current?.stop === stopNow) current = null
      resolve(ok)
    }
    const stopNow = () => {
      el.pause()
      finish(true)
    }
    el.onended = () => finish(true)
    el.onerror = () => {
      // file:// 下没有别的办法判断文件是否存在：加载失败就记为缺失
      if (elementMode && el.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) missing.add(key)
      finish(false)
    }
    signal?.addEventListener('abort', stopNow, { once: true })
    current = { stop: stopNow }
    el.src = url(key)
    el.volume = settings.volume
    el.play().catch((err: unknown) => {
      // 还没有用户手势：当作播完，不要退回 TTS（TTS 同样会被拦）
      const notAllowed = err instanceof DOMException && err.name === 'NotAllowedError'
      finish(notAllowed)
    })
  })
}

/**
 * 播放一个声音。resolve 表示播完或被打断。
 * text：录音缺失时给 TTS 读的文字（可选）。
 */
export async function play(key: string, text = '', signal?: AbortSignal): Promise<void> {
  stop()
  if (signal?.aborted) return
  if (hasRecording(key)) {
    // manifest 之前没拉到：第一次真要播时再试一次
    if (!manifest && manifestFailed && !elementMode) await initAudio()
    const buf = await getBuffer(key)
    if (signal?.aborted) return
    if (buf) {
      if (await playBuffer(buf, signal)) return
      // 上下文没解锁：<audio> 元素在手势里还是能播的
      warn('改走 <audio> 元素', key)
    }
    if (!missing.has(key)) {
      const ok = await playElement(key, signal)
      if (ok || signal?.aborted) return
      warn('录音播放失败，退回 TTS', key)
    }
  } else {
    warn('没有录音，退回 TTS', key)
  }
  if (settings.ttsFallback && text) await tts(text, signal)
}

export function stop(): void {
  current?.stop()
  current = null
  stopTTS()
}
