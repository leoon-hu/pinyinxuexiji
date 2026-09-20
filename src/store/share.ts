import { ref } from 'vue'
import { SHARE_TEXT, SITE_URL } from '@/data/sites'
import { copyText, shareMessage, shareWay, siteRoot, type ShareWay } from '@/services/share'

/** 分享面板的内容：微信里教用右上角菜单；没有系统分享面板时给一段话让人复制 */
export interface SharePanelState {
  way: Exclude<ShareWay, 'native'>
  message: string
  copied: boolean
}

/** 模块级单例：页脚与家长设置「关于」都从这里发起，面板画在 App.vue（modals/SharePanel.vue） */
export const sharePanel = ref<SharePanelState | null>(null)

function env() {
  return {
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
  }
}

/** 「分享给朋友」（需求 5.7）：有系统分享面板就直接弹（用户取消不算错），否则打开面板。家长自己点的，不出声 */
export async function share(text = SHARE_TEXT): Promise<void> {
  const way = shareWay(env())
  const link = siteRoot(typeof location !== 'undefined' ? location.href : '', SITE_URL)
  const message = shareMessage(text, link)
  if (way === 'native') {
    try {
      await navigator.share({ title: '拼音学习机', text, url: link })
      return
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
    }
    sharePanel.value = { way: 'copy', message, copied: await copyText(message) }
    return
  }
  sharePanel.value = { way, message, copied: way === 'copy' ? await copyText(message) : false }
}

export async function copyShare(): Promise<void> {
  if (!sharePanel.value) return
  sharePanel.value.copied = await copyText(sharePanel.value.message)
}

export function closeShare(): void {
  sharePanel.value = null
}
