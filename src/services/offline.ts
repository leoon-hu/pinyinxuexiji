/**
 * 离线录音包（需求 5.6，2026-09-23 按同步练的做法改）：页面在后台把录音分批下进缓存 MEDIA_CACHE，Service Worker 离线时从它取。
 *
 * 以前全部录音（3700 个 mp3、约 17 MB）和页面代码在同一个 SW 预缓存里：SW 要把它们一个一个下完才算装好——要几分钟，
 * 慢的手机上超过浏览器给安装的 5 分钟就整次作废；装的这段时间里「检查更新」「重新安装」也都排在它后面等。
 * 现在预缓存只有页面外壳（几十个文件，几秒装好），录音由这里下：
 * - 清单 media.json（构建时生成：相对地址 → 内容哈希）；缓存里另存一份「已下好的是哪个版本」（REVS_KEY），
 *   录音改过（哈希变了）才重下，没变的一个都不重下；下了一半断网，下次接着下；
 * - 下载时地址带 ?v=哈希：不走 SW 的缓存优先（不然改过的录音会被缓存里的旧文件顶上）也不拿 CDN 上的旧副本，
 *   存进缓存时用不带参数的地址（页面播的就是它）；
 * - 同时最多 CONCURRENCY 个，连续失败 MAX_FAILURES 次（断网 / 服务器不通）就停，等联网 / 回到前台再接着下；
 * - 一轮全部下完后把清单上没有的旧文件删掉。
 * 还没下好的录音照常从网络取（经 SW 也会存进同一个缓存）。纯逻辑，浏览器对象都可注入，有单测。
 */

/** 与 vite.config.ts 里 runtimeCaching 的 cacheName 一致 */
export const MEDIA_CACHE = 'audio'
/** 构建时生成的清单（相对地址） */
export const MANIFEST_URL = 'media.json'
/** 缓存里记「已下好的版本」的那一条（不是真文件，页面不会去取它）：{ total: 清单上一共几个, files: 相对地址 → 哈希 } */
export const REVS_KEY = 'media-revs.json'
/** 录音都只有几 KB，受来回延迟限制，多开几路就快几倍 */
export const CONCURRENCY = 6
/** 连续失败这么多次就停（断网 / 服务器不通） */
export const MAX_FAILURES = 5
/** 每下完这么多个存一次「已下好的版本」（中途关掉页面也不至于全部重下） */
export const SAVE_EVERY = 50

export interface CacheLike {
  match(url: string): Promise<Response | undefined>
  put(url: string, res: Response): Promise<void>
  keys(): Promise<readonly { url: string }[]>
  delete(url: string): Promise<boolean>
}
export interface OfflineDeps {
  openCache(): Promise<CacheLike | null>
  fetch(url: string, init?: RequestInit): Promise<Response>
  /** 相对地址 → 绝对地址（按页面地址解析，子路径部署也对） */
  resolve(path: string): string
  online(): boolean
}

export interface MediaProgress {
  /** 清单上一共多少个、缓存里已经是最新的有多少、这一轮新下了几个 */
  total: number
  cached: number
  fetched: number
  /** 因为失败 / 断网 / 被取消而停下（清单都没拿到也算） */
  stopped: boolean
}

function defaultDeps(): OfflineDeps {
  return {
    openCache: async () => (typeof caches === 'undefined' ? null : caches.open(MEDIA_CACHE)),
    fetch: (url, init) => fetch(url, init),
    resolve: (path) => new URL(path, location.href.split('#')[0]).href,
    online: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
  }
}

interface Revs {
  total: number
  files: Record<string, string>
}

async function readRevs(cache: CacheLike, url: string): Promise<Revs> {
  try {
    const r = await cache.match(url)
    const data = r ? ((await r.json()) as Partial<Revs> | null) : null
    return { total: typeof data?.total === 'number' ? data.total : 0, files: data?.files && typeof data.files === 'object' ? data.files : {} }
  } catch {
    return { total: 0, files: {} }
  }
}

/** 一次 keys() 比几千次 match() 快得多 */
async function cachedUrls(cache: CacheLike): Promise<Set<string>> {
  const have = new Set<string>()
  try {
    for (const k of await cache.keys()) have.add(k.url)
  } catch {
    /* 拿不到就当都没有 */
  }
  return have
}

/**
 * 不联网看一眼离线包下到哪了（按上一轮记下的清单总数与版本）：页面一打开就能显示，断网时也对。
 * 从没下过 / 缓存打不开 → null。
 */
export async function mediaStatus(deps: OfflineDeps = defaultDeps()): Promise<MediaProgress | null> {
  const cache = await deps.openCache().catch(() => null)
  if (!cache) return null
  const revs = await readRevs(cache, deps.resolve(REVS_KEY))
  if (!revs.total) return null
  const have = await cachedUrls(cache)
  const cached = Object.keys(revs.files).filter((p) => have.has(deps.resolve(p))).length
  return { total: revs.total, cached: Math.min(cached, revs.total), fetched: 0, stopped: false }
}

/**
 * 把清单上缺的、过期的文件补进缓存；onProgress 每下完一个报一次；signal 可取消。
 * 清单拿不到（断网）就退回上一轮记下的状态，stopped。
 */
export async function prefetchMedia(
  deps: OfflineDeps = defaultDeps(),
  opts: { signal?: AbortSignal; onProgress?: (p: MediaProgress) => void } = {},
): Promise<MediaProgress> {
  const result: MediaProgress = { total: 0, cached: 0, fetched: 0, stopped: false }
  const fallback = async (): Promise<MediaProgress> => ({ ...((await mediaStatus(deps)) ?? result), stopped: true })
  let files: Record<string, string>
  try {
    const res = await deps.fetch(deps.resolve(MANIFEST_URL), { cache: 'no-cache' })
    if (!res.ok) return fallback()
    files = ((await res.json()) as { files?: Record<string, string> } | null)?.files ?? {}
  } catch {
    return fallback()
  }
  const cache = await deps.openCache().catch(() => null)
  if (!cache) return { ...result, stopped: true }
  const entries = Object.entries(files)
  result.total = entries.length

  const revsUrl = deps.resolve(REVS_KEY)
  const stored = await readRevs(cache, revsUrl)
  const revs = stored.files
  const have = await cachedUrls(cache)
  const todo: Array<[string, string]> = []
  for (const [path, rev] of entries) {
    if (have.has(deps.resolve(path)) && revs[path] === rev) result.cached += 1
    else todo.push([path, rev])
  }
  opts.onProgress?.({ ...result })

  let sinceSave = 0
  const save = async (): Promise<void> => {
    sinceSave = 0
    try {
      await cache.put(revsUrl, new Response(JSON.stringify({ total: result.total, files: revs }), { headers: { 'Content-Type': 'application/json' } }))
    } catch {
      /* 存不了下次多下几个，无害 */
    }
  }
  let failures = 0
  let i = 0
  const worker = async (): Promise<void> => {
    while (i < todo.length) {
      if (opts.signal?.aborted || !deps.online() || failures >= MAX_FAILURES) {
        result.stopped = true
        return
      }
      const [path, rev] = todo[i++]!
      const url = deps.resolve(path)
      try {
        const res = await deps.fetch(`${url}?v=${rev}`)
        if (!res.ok) throw new Error(String(res.status))
        await cache.put(url, res)
        revs[path] = rev
        result.cached += 1
        result.fetched += 1
        failures = 0
        if (++sinceSave >= SAVE_EVERY) await save()
        opts.onProgress?.({ ...result })
      } catch {
        failures += 1
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  let pruned = false
  for (const path of Object.keys(revs)) {
    if (path in files) continue
    delete revs[path]
    pruned = true
  }
  if (result.fetched || pruned || stored.total !== result.total) await save()
  if (!result.stopped && result.cached >= result.total) await prune(cache, new Set([...entries.map(([p]) => deps.resolve(p)), revsUrl]))
  return result
}

/** 一轮全部下完后：清单上没有的旧文件删掉（删掉的录音、改过名的） */
async function prune(cache: CacheLike, keep: Set<string>): Promise<void> {
  try {
    for (const k of await cache.keys()) if (!keep.has(k.url)) await cache.delete(k.url)
  } catch {
    /* 删不掉就留着，无害 */
  }
}

/** 省流量模式（Android Chrome 的 Data Saver）：不主动下 */
export function saveData(nav: { connection?: { saveData?: boolean } } = typeof navigator === 'undefined' ? {} : (navigator as unknown as { connection?: { saveData?: boolean } })): boolean {
  return nav.connection?.saveData === true
}
