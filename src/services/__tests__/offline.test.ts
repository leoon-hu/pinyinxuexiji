import { describe, expect, it } from 'vitest'
import { CONCURRENCY, MANIFEST_URL, MAX_FAILURES, REVS_KEY, SAVE_EVERY, mediaStatus, prefetchMedia, saveData, type CacheLike, type MediaProgress, type OfflineDeps } from '../offline'

const BASE = 'https://x.test/'
/** 假缓存：url → 内容 */
function fakeCache(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  const cache: CacheLike = {
    match: async (url) => (store.has(url) ? new Response(store.get(url)) : undefined),
    put: async (url, res) => void store.set(url, await res.text()),
    keys: async () => [...store.keys()].map((url) => ({ url })),
    delete: async (url) => store.delete(url),
  }
  return { cache, store }
}

function deps(files: Record<string, string>, cache: CacheLike | null, opts: { fail?: (url: string) => boolean; online?: () => boolean; noManifest?: boolean } = {}) {
  let inflight = 0
  let peak = 0
  const fetched: string[] = []
  const d: OfflineDeps = {
    openCache: async () => cache,
    resolve: (p) => BASE + p,
    online: opts.online ?? (() => true),
    fetch: async (url) => {
      if (url === BASE + MANIFEST_URL) return opts.noManifest ? new Response('', { status: 404 }) : new Response(JSON.stringify({ files }))
      inflight += 1
      peak = Math.max(peak, inflight)
      fetched.push(url)
      await Promise.resolve()
      inflight -= 1
      if (opts.fail?.(url)) return new Response('', { status: 404 })
      return new Response(`mp3 ${url}`, { status: 200 })
    },
  }
  return { d, fetched, peak: () => peak }
}

function manifest(n: number, rev = 'r1'): Record<string, string> {
  return Object.fromEntries(Array.from({ length: n }, (_, i) => [`audio/k${i}.mp3`, rev]))
}

describe('离线录音包：prefetchMedia（5.6）', () => {
  it('第一次全部下；下载地址带 ?v=哈希、存进缓存用不带参数的地址；并发不超过 CONCURRENCY；进度一个一个报', async () => {
    const files = manifest(120)
    const { cache, store } = fakeCache()
    const { d, fetched, peak } = deps(files, cache)
    const seen: MediaProgress[] = []
    const r = await prefetchMedia(d, { onProgress: (p) => seen.push(p) })
    expect(r).toEqual({ total: 120, cached: 120, fetched: 120, stopped: false })
    expect(fetched[0]).toBe(`${BASE}audio/k0.mp3?v=r1`)
    expect(store.has(`${BASE}audio/k0.mp3`)).toBe(true)
    expect(store.has(`${BASE}audio/k0.mp3?v=r1`)).toBe(false)
    expect(peak()).toBeLessThanOrEqual(CONCURRENCY)
    expect(seen[0]).toEqual({ total: 120, cached: 0, fetched: 0, stopped: false })
    expect(seen.at(-1)?.cached).toBe(120)
    expect(JSON.parse(store.get(BASE + REVS_KEY)!)).toMatchObject({ total: 120, files: { 'audio/k7.mp3': 'r1' } })
  })

  it('再来一轮：没变的一个都不下；哈希变了的重下；清单上没有的旧文件删掉', async () => {
    const files = manifest(10)
    const { cache, store } = fakeCache()
    await prefetchMedia(deps(files, cache).d)
    store.set(`${BASE}audio/gone.mp3`, 'old')
    const next = { ...files, 'audio/k3.mp3': 'r2' }
    const { d, fetched } = deps(next, cache)
    const r = await prefetchMedia(d)
    expect(fetched).toEqual([`${BASE}audio/k3.mp3?v=r2`])
    expect(r).toEqual({ total: 10, cached: 10, fetched: 1, stopped: false })
    expect(store.has(`${BASE}audio/gone.mp3`)).toBe(false)
    expect(store.has(BASE + REVS_KEY)).toBe(true)
    const again = deps(next, cache)
    await prefetchMedia(again.d)
    expect(again.fetched).toEqual([])
  })

  it('缓存里有但没记版本（播放时 SW 顺手存的）：重下一次，之后就记住了', async () => {
    const files = manifest(3)
    const { cache } = fakeCache({ [`${BASE}audio/k1.mp3`]: 'from-sw' })
    const { d, fetched } = deps(files, cache)
    await prefetchMedia(d)
    expect(fetched).toHaveLength(3)
  })

  it('连续失败 MAX_FAILURES 次或断网就停下（stopped），下次接着下；中途每 SAVE_EVERY 个存一次版本', async () => {
    const files = manifest(SAVE_EVERY + 30)
    const { cache, store } = fakeCache()
    let n = 0
    const { d } = deps(files, cache, { fail: () => ++n > SAVE_EVERY + 5 })
    const r = await prefetchMedia(d)
    expect(r.stopped).toBe(true)
    expect(r.cached).toBe(SAVE_EVERY + 5)
    expect(Object.keys(JSON.parse(store.get(BASE + REVS_KEY)!).files).length).toBeGreaterThanOrEqual(SAVE_EVERY)
    expect(MAX_FAILURES).toBeGreaterThan(0)
    const again = deps(files, cache)
    const r2 = await prefetchMedia(again.d)
    expect(again.fetched).toHaveLength(25)
    expect(r2).toMatchObject({ cached: SAVE_EVERY + 30, stopped: false })
    const offline = deps(manifest(5, 'r9'), cache, { online: () => false })
    expect((await prefetchMedia(offline.d)).stopped).toBe(true)
    expect(offline.fetched).toEqual([])
  })

  it('不联网看状态（mediaStatus）：按上一轮记下的总数与版本数缓存里真有的；断网时 prefetchMedia 也退回它', async () => {
    const files = manifest(8)
    const { cache, store } = fakeCache()
    expect(await mediaStatus(deps(files, cache).d)).toBeNull()
    await prefetchMedia(deps(files, cache).d)
    expect(await mediaStatus(deps(files, cache).d)).toEqual({ total: 8, cached: 8, fetched: 0, stopped: false })
    store.delete(`${BASE}audio/k2.mp3`)
    expect(await mediaStatus(deps(files, cache).d)).toMatchObject({ total: 8, cached: 7 })
    expect(await prefetchMedia(deps(files, cache, { noManifest: true }).d)).toEqual({ total: 8, cached: 7, fetched: 0, stopped: true })
  })

  it('清单拿不到 / 缓存打不开：什么都不做；saveData 只在 connection.saveData 为 true 时', async () => {
    expect(await prefetchMedia(deps({}, fakeCache().cache, { noManifest: true }).d)).toEqual({ total: 0, cached: 0, fetched: 0, stopped: true })
    expect((await prefetchMedia(deps(manifest(2), null).d)).stopped).toBe(true)
    expect(saveData({ connection: { saveData: true } })).toBe(true)
    expect(saveData({ connection: { saveData: false } })).toBe(false)
    expect(saveData({})).toBe(false)
  })
})
