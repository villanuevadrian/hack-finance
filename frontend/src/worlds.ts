/**
 * Worlds: the 3D skin of the game, chosen from the player's goal (O1).
 *
 * NEUTRALITY RULE: a world changes only the look. Every world uses the same column heights,
 * the same storm for the same market move and the same calm for the same recovery, so players
 * with different worlds face the same information. Nothing is shown collapsing or being destroyed.
 * The world is recorded with the decisions so the team can check it does not shift behaviour.
 */

import type { Goal } from './api/types'

export type WorldKind = 'city' | 'forest' | 'fortress' | 'peaks'

export interface World {
  kind: WorldKind
  name: string
  tagline: string
  sky: string        // background and fog colour
  ground: string     // island surface
  accent: string     // light of the player and highlights
  body: string       // main colour of the columns
}

export const WORLDS: Record<WorldKind, World> = {
  city: {
    kind: 'city', name: 'La Ciudad', tagline: 'Cada mes, un edificio de tu barrio.',
    sky: '#0d0b24', ground: '#2a2550', accent: '#ffc94a', body: '#3b3470',
  },
  forest: {
    kind: 'forest', name: 'El Bosque', tagline: 'Lo que plantas hoy crece despacio.',
    sky: '#0a1620', ground: '#1f3b33', accent: '#3ddc97', body: '#6b4a2f',
  },
  fortress: {
    kind: 'fortress', name: 'La Fortaleza', tagline: 'Tus torres te protegen de los imprevistos.',
    sky: '#130f26', ground: '#33294f', accent: '#ff8a3d', body: '#8b84b8',
  },
  peaks: {
    kind: 'peaks', name: 'Las Cumbres', tagline: 'Una cordillera que dibujas mes a mes.',
    sky: '#0b0820', ground: '#241d4f', accent: '#4cc3ff', body: '#5b4f9a',
  },
}

/** One world per goal (O1 in docs/CUESTIONARIO.md). */
const BY_GOAL: Record<Goal, WorldKind> = {
  purchase: 'city',
  retirement: 'forest',
  emergency_fund: 'fortress',
  long_term_growth: 'peaks',
}

export const worldFor = (goal: Goal): World => WORLDS[BY_GOAL[goal]]

/**
 * Column height from wealth, relative to the starting wealth only (never to future values,
 * which the player has not seen): h = 0.4 + 2.6 * W_t / W_0, clamped to [0.3, 6].
 */
export function columnHeight(wealth: number, initial: number): number {
  const h = 0.4 + 2.6 * (wealth / initial)
  return Math.min(Math.max(h, 0.3), 6)
}

/** Storm strength in [0, 1] from this week's market move: 0 at 0 %, 1 at -6 % or worse. Same for every world. */
export function stormStrength(marketReturn: number): number {
  return Math.min(Math.max(-marketReturn / 0.06, 0), 1)
}
