/**
 * 同一作者的另外三个学习站：页面底部一行「更多应用」互相链接（需求 5.7）。
 * 四个站各有一份同样的名单，改了要一起改；顺序固定 AI加词 → 同步练-对战版 → 拼音学习机 → 识字卡片，本站不列自己。
 */
export interface SisterSite {
  name: string
  /** 一句话说明，给不认识这个名字的家长 */
  desc: string
  url: string
}

export const SISTER_SITES: readonly SisterSite[] = [
  { name: 'AI加词', desc: '背单词', url: 'https://jiaci.app' },
  { name: '同步练-对战版', desc: '人教版小学课本知识点对战游戏', url: 'https://tongbulian.jiaci.app' },
  { name: '识字卡片', desc: '2–4 岁看图听音认知卡片', url: 'https://kapian.jiaci.app' },
]

/**
 * 站长联系方式（需求 5.7，2026-09-21 四个站统一）：一张微信二维码，页脚与家长设置「关于」里点「联系站长」弹出来看。
 * 图片在 public/，四个站各放一份同一张图。
 */
export const AUTHOR_CONTACT = {
  label: '联系站长',
  /** public/ 里的文件名；base 是 './'，用的时候拼 BASE_URL */
  qr: 'wechat-qrcode.jpg',
  hint: '用微信扫一扫（手机上长按二维码识别）加站长微信，有问题、建议或想要的功能都欢迎直接说。',
} as const

/** 本站的公开地址与源码仓库（需求 5.7「开源与分享」）：页脚「GitHub 源码」、分享出去的链接兜底（file:// 打开时）都用它 */
export const SITE_URL = 'https://pinyin.jiaci.app'
export const REPO_URL = 'https://github.com/leoon-hu/pinyinxuexiji'
/** 页脚与家长设置「关于」里的「开源」一句 */
export const OPEN_CLAIM = '免费、无广告、不用注册、不收集个人信息，录音全部打包在应用里、不联网也能用；代码全部开源（MIT），谁都能查、也能自己部署。'
/** 「分享给朋友」发出去的一句话（后面跟站点链接） */
export const SHARE_TEXT = '拼音学习机：给学拼音的孩子的点读 / 拼读 / 跟读 / 测验键盘，真人录音、按教材分课。免费、开源、离线、无广告。'
