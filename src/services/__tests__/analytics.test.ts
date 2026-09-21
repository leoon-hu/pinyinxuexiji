import { describe, expect, it } from 'vitest'
import { analyticsAttrs, analyticsConfig } from '../analytics'

const full = { VITE_UMAMI_SCRIPT: 'https://stats.example.com/script.js', VITE_UMAMI_WEBSITE_ID: 'abc-123' }

describe('analyticsConfig（需求 5.8：两项都配了才统计）', () => {
  it('两项齐全才有配置，顺手去掉空白', () => {
    expect(analyticsConfig(full)).toEqual({ script: 'https://stats.example.com/script.js', websiteId: 'abc-123' })
    expect(analyticsConfig({ ...full, VITE_UMAMI_WEBSITE_ID: '  abc-123 ' })?.websiteId).toBe('abc-123')
  })

  it('缺任何一项、或只有空白 → 不统计', () => {
    expect(analyticsConfig({})).toBeNull()
    expect(analyticsConfig({ VITE_UMAMI_SCRIPT: full.VITE_UMAMI_SCRIPT })).toBeNull()
    expect(analyticsConfig({ VITE_UMAMI_WEBSITE_ID: 'abc' })).toBeNull()
    expect(analyticsConfig({ ...full, VITE_UMAMI_SCRIPT: '   ' })).toBeNull()
  })
})

describe('analyticsAttrs（写进页面的标签属性）', () => {
  it('defer + src + website id', () => {
    expect(analyticsAttrs(analyticsConfig(full)!)).toEqual({ defer: true, src: full.VITE_UMAMI_SCRIPT, 'data-website-id': 'abc-123' })
  })
})
