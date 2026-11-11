import { describe, expect, it } from 'vitest'
import type { Profile } from './api/types'
import { confidenceOf } from './confidence'

const profile = (over: Partial<Profile>): Profile => ({
  reliability: 'alta', timeouts: 0, stated_level: 2, levels: { revealed: 2, capacity: 3, horizon: 4, final: 2, limiting: ['revealed'] },
  parameters: [{ name: 'theta', mean: 0.2, ci_low: 0.15, ci_high: 0.25, description: '' }], ...over,
} as unknown as Profile)

describe('profile confidence', () => {
  it('a clear profile has no reasons to doubt', () => {
    const c = confidenceOf(profile({}), 15)
    expect(c.inconclusive).toBe(false)
    expect(c.reasons).toEqual([])
  })
  it('explains timeouts, a wide interval and what is missing', () => {
    const c = confidenceOf(profile({ reliability: 'baja', timeouts: 6, parameters: [{ name: 'theta', mean: 0.2, ci_low: 0.03, ci_high: 0.47, description: '' }] } as Partial<Profile>), 15)
    expect(c.inconclusive).toBe(true)
    expect(c.reasons.join(' ')).toContain('6 de 15')
    expect(c.reasons.join(' ')).toMatch(/entre el 3\s?%/)
    expect(c.missing.length).toBe(2)
  })
  it('never leaves an inconclusive profile without an explanation', () => {
    expect(confidenceOf(profile({ reliability: 'baja' }), 15).reasons.length).toBeGreaterThan(0)
  })
})
