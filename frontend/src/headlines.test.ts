import { describe, expect, it } from 'vitest'
import type { GameState } from './api/types'
import { headlineFor, setHeadlineBank } from './headlines'
import { N } from './voice/lines'

const s = (r: number, round = 1) => ({ last_portfolio_return: r, round_index: round } as GameState)

describe('headlines', () => {
  it('local templates have no figures and use the pre-recorded audio', () => {
    setHeadlineBank(null)
    for (const list of Object.values(N.headlines)) for (const h of list) expect(h).not.toMatch(/[0-9%€]/)
    const h = headlineFor(s(-0.05))
    expect(N.headlines.strong_drop).toContain(h.text)
    expect(h.voiceKey).toMatch(/^headline_strong_drop_\d$/)
  })

  it('uses the bank from the server, with the browser voice for new texts', () => {
    setHeadlineBank({ drop: ['Titular nuevo generado sin cifras'] })
    const h = headlineFor(s(-0.01))
    expect(h.text).toBe('Titular nuevo generado sin cifras')
    expect(h.voiceKey).toMatch(/^headline_live_drop_/)
    // Buckets missing on the server fall back to the local templates.
    expect(N.headlines.rise).toContain(headlineFor(s(0.01)).text)
    setHeadlineBank(null)
  })
})
