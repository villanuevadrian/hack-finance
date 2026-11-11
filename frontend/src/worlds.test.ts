import { describe, expect, it } from 'vitest'
import { columnHeight, stormStrength, worldFor, WORLDS } from './worlds'

describe('worlds', () => {
  it('every goal of the contract (O1) has a world', () => {
    for (const g of ['emergency_fund', 'purchase', 'long_term_growth', 'retirement'] as const) expect(WORLDS[worldFor(g).kind]).toBeDefined()
  })
  it('column height depends only on current and starting wealth (no future information)', () => {
    expect(columnHeight(5000, 5000)).toBeCloseTo(3.0)
    expect(columnHeight(2500, 5000)).toBeCloseTo(1.7)
    expect(columnHeight(20000, 5000)).toBe(6)
  })
  it('the storm depends only on the market move, the same in every world', () => {
    expect(stormStrength(0.02)).toBe(0)
    expect(stormStrength(-0.03)).toBeCloseTo(0.5)
    expect(stormStrength(-0.2)).toBe(1)
  })
})
