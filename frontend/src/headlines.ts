import type { GameState } from './api/types'
import { N } from './voice/lines'

/**
 * Deterministic headline templates (texts in voice/narration.json): the fallback of TextGenerator. They contain
 * NO figures and never name an episode or a date (CALIBRACION.md §8, rule 5).
 * TODO(Frontend): serve them from backend/behaviorlab/text/ (Claude + cache) once the API exposes them.
 */
type Bucket = keyof typeof N.headlines

export function headlineFor(s: GameState): { text: string; voiceKey: string } {
  const r = s.last_portfolio_return ?? 0
  const key: Bucket = r <= -0.03 ? 'strong_drop' : r <= -0.005 ? 'drop' : r < 0.005 ? 'flat' : r < 0.03 ? 'rise' : 'strong_rise'
  const list = N.headlines[key]
  const i = s.round_index % list.length
  return { text: list[i], voiceKey: `headline_${key}_${i}` }
}
