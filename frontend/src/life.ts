import type { GameState, Goal } from './api/types'
import { N } from './voice/lines'

/**
 * Life around the decisions: narrative only (texts in voice/narration.json). These scenes never change any
 * figure and are the SAME for every player in the same month, so they cannot bias the comparison between
 * players. They state that everyday costs are paid from the salary or the emergency cushion, never from the
 * investment, so nobody sells "to pay the washing machine". No figures, no episode names, no dates.
 */
export interface LifeEvent {
  icon: string
  title: string
  text: string
  voiceKey: string
}

export function lifeEventFor(s: GameState): LifeEvent {
  if (s.kind === 'raise') return { ...N.raise, voiceKey: 'life_raise' }
  const i = (s.round_index - 1) % N.life.length
  return { ...N.life[i], voiceKey: `life_${i + 1}` }
}

export const MISSION: Record<Goal, { icon: string; text: string }> = {
  purchase: { icon: '🏡', text: 'Comprar algo en unos años' },
  retirement: { icon: '🌳', text: 'Preparar tu jubilación' },
  emergency_fund: { icon: '🛡️', text: 'Tener un colchón para imprevistos' },
  long_term_growth: { icon: '⛰️', text: 'Hacer crecer tus ahorros' },
}
