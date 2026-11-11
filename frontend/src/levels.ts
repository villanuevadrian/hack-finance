import type { GameState, Phase } from './api/types'

/**
 * The three phases of the game (contracts/game.py: rounds 1-5, 6-10, 11-15) presented as levels.
 * Progress depends only on reaching the next phase. CALIBRACION.md §8: no score or ranking during the game,
 * so there are no points, experience or ranks.
 */
export const LEVEL_ORDER: Phase[] = ['drop', 'salary', 'recovery']

export const LEVELS: Record<Phase, { number: number; name: string; tagline: string }> = {
  drop: { number: 1, name: 'La caída', tagline: 'Los mercados se tiñen de rojo.' },
  salary: { number: 2, name: 'El ascenso', tagline: 'Te suben el sueldo. ¿Qué haces con el extra?' },
  recovery: { number: 3, name: 'La recuperación', tagline: 'Vuelve la calma. O eso parece.' },
}

export const levelIndex = (phase: Phase): number => LEVEL_ORDER.indexOf(phase)

/** Rounds per level: the contract splits the game into three equal phases. */
export function roundsPerLevel(nRounds: number): Record<Phase, number> {
  const k = Math.round(nRounds / LEVEL_ORDER.length)
  return { drop: k, salary: k, recovery: nRounds - 2 * k }
}

/** Index of the level just completed when moving from `prev` to `next`, or null. */
export function completedLevel(prev: GameState, next: GameState): number | null {
  if (!prev.phase) return null
  if (next.finished || next.phase !== prev.phase) return levelIndex(prev.phase)
  return null
}
