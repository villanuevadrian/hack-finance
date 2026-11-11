import type { GameState } from './api/types'
import { N } from './voice/lines'

/**
 * Market headlines (RF-09). The bank comes from the API (GET /headlines): generated once with Claude and
 * cached in data/cache/headlines.json, or the templates if there is no cache. Until it arrives, or if the
 * server does not offer it, the local templates (voice/narration.json) are used. No figures, no episodes.
 */
type Bucket = keyof typeof N.headlines
let remote: Record<string, string[]> | null = null

export function setHeadlineBank(bank: Record<string, string[]> | null): void {
  remote = bank
}

export function headlineFor(s: GameState): { text: string; voiceKey: string } {
  const r = s.last_portfolio_return ?? 0
  const key: Bucket = r <= -0.03 ? 'strong_drop' : r <= -0.005 ? 'drop' : r < 0.005 ? 'flat' : r < 0.03 ? 'rise' : 'strong_rise'
  const local = N.headlines[key]
  const list = remote?.[key]?.length ? remote[key] : local
  const i = s.round_index % list.length
  const text = list[i]
  // Pre-recorded audio exists only for the template texts; other headlines use the browser voice.
  const t = local.indexOf(text)
  return { text, voiceKey: t >= 0 ? `headline_${key}_${t}` : `headline_live_${key}_${i}` }
}
