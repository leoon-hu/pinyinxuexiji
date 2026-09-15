import { describe, expect, it } from 'vitest'
import { INSTALL_FOREVER, INSTALL_SNOOZE_MS, installKind, installSteps, type InstallEnv } from '../install'

const base: InstallEnv = { standalone: false, installed: false, hasPrompt: false, touch: true, inApp: false, ios: false }
const NOW = 1_700_000_000_000

describe('installKind（需求 5.6，四个站统一的规则）', () => {
  it('拿到安装事件最优先，电脑也算', () => {
    expect(installKind({ ...base, hasPrompt: true }, 0, NOW)).toBe('prompt')
    expect(installKind({ ...base, hasPrompt: true, touch: false }, 0, NOW)).toBe('prompt')
    expect(installKind({ ...base, hasPrompt: true, inApp: true, ios: true }, 0, NOW)).toBe('prompt')
  })
  it('电脑没有安装事件不提示；内置浏览器先于 iOS；其它触屏浏览器教菜单', () => {
    expect(installKind({ ...base, touch: false }, 0, NOW)).toBeNull()
    expect(installKind({ ...base, inApp: true, ios: true }, 0, NOW)).toBe('inapp')
    expect(installKind({ ...base, ios: true }, 0, NOW)).toBe('ios')
    expect(installKind(base, 0, NOW)).toBe('menu')
  })
  it('已从主屏幕打开 / 装过 / 静默期内不提示；静默 3 天', () => {
    expect(installKind({ ...base, standalone: true, hasPrompt: true }, 0, NOW)).toBeNull()
    expect(installKind({ ...base, installed: true, hasPrompt: true }, 0, NOW)).toBeNull()
    expect(installKind(base, NOW + INSTALL_SNOOZE_MS, NOW)).toBeNull()
    expect(installKind(base, NOW + INSTALL_SNOOZE_MS, NOW + INSTALL_SNOOZE_MS)).toBe('menu')
    expect(INSTALL_SNOOZE_MS).toBe(3 * 24 * 3600 * 1000)
    expect(JSON.parse(JSON.stringify({ until: INSTALL_FOREVER })).until).toBe(INSTALL_FOREVER)
  })
})

describe('installSteps', () => {
  it('iOS：Safari 三步、非 Safari 四步、iPad 分享在右上角；prompt 没有步骤', () => {
    expect(installSteps('ios', { iosSafari: true, ipad: false })[0]).toEqual({ text: '点底部工具栏的分享按钮', share: true })
    const chrome = installSteps('ios', { iosSafari: false, ipad: true })
    expect(chrome).toHaveLength(4)
    expect(chrome[1]?.text).toBe('点右上角的分享按钮')
    expect(installSteps('inapp', { iosSafari: false, ipad: false })).toHaveLength(3)
    expect(installSteps('menu', { iosSafari: false, ipad: false })).toHaveLength(3)
    expect(installSteps('prompt', { iosSafari: false, ipad: false })).toEqual([])
  })
})
