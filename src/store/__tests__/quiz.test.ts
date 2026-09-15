import { describe, it, expect } from 'vitest'
import { basicPool, advancedPool, pickCandidates } from '../quiz'
import { isWhole } from '@/data/pinyin'

describe('初级测验题库', () => {
  it('按课过滤', () => {
    expect(basicPool(1).map((t) => t.value)).toEqual(['a', 'o', 'e'])
    expect(basicPool(3).map((t) => t.value)).toEqual(['b', 'p', 'm', 'f', 'a', 'o', 'e', 'i', 'u', 'ü'])
    expect(basicPool(14)).toHaveLength(47)
  })
  it('四选一：含正确项、同类、不含同音的 y/i w/u', () => {
    const pool = basicPool(14)
    const y = pool.find((t) => t.value === 'y')!
    for (let n = 0; n < 20; n++) {
      const c = pickCandidates(y, pool)
      expect(c).toHaveLength(4)
      expect(c).toContain('initial:y')
      expect(c.every((id) => id.startsWith('initial:'))).toBe(true)
      expect(c).not.toContain('initial:i')
    }
    const a = pool.find((t) => t.value === 'a')!
    const c = pickCandidates(a, pool)
    expect(c.every((id) => id.startsWith('final:'))).toBe(true)
  })
  it('题库很小时候选不足 4 个也不报错', () => {
    const pool = basicPool(1)
    const c = pickCandidates(pool[0]!, pool)
    expect(c).toHaveLength(3)
  })
})

describe('高级测验题库', () => {
  it('学到第 3 课：只有 b p m f + 单韵母', () => {
    const pool = advancedPool(3)
    expect(pool.length).toBeGreaterThan(10)
    for (const t of pool) {
      expect(['b', 'p', 'm', 'f']).toContain(t.initial)
      expect(t.medial).toBeNull()
    }
  })
  it('第 5 课起出现三拼', () => {
    expect(advancedPool(4).some((t) => t.medial)).toBe(false)
    expect(advancedPool(5).some((t) => t.medial)).toBe(true)
  })
  it('全部：有三拼、不含整体认读、每个都有例字', () => {
    const pool = advancedPool(14)
    expect(pool.length).toBeGreaterThan(900)
    expect(pool.some((t) => t.written === 'gua')).toBe(true)
    expect(pool.some((t) => t.written === 'xiong')).toBe(true)
    expect(pool.some((t) => isWhole(t.written))).toBe(false)
    expect(pool.some((t) => t.written === 'ju' && t.final === 'ü')).toBe(true)
  })
})
