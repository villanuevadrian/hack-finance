import type { Action, GameState } from './api/types'
import { formatEur } from './format'

/**
 * CALIBRACION.md §8, rule 4: time per decision; the engine counts no decision as "do nothing".
 * Default 15 s; the real value comes from the server (GET /config) so frontend and engine always agree.
 */
export const DECISION_TIMEOUT_MS = 15_000

/**
 * Wealth path shown in the game: starting capital, then the wealth the player had when deciding each
 * round (Decision.wealth_eur, from the backend), then the current wealth. No figure is computed here.
 */
export function wealthPath(s: GameState): number[] {
  const path = [s.starting_capital_eur, ...(s.history ?? []).map((d) => d.wealth_eur)]
  if (!s.finished) path.push(s.cash_eur + s.invested_eur)
  return path
}

/** Euros and months of salary (CALIBRACION.md §8, rule 1: euros, not percentages). */
export const monthsOfSalary = (eur: number, salary: number) => (salary > 0 ? Math.abs(eur) / salary : 0)

/** Change of the player's money in the last round, in euros: invested before the move times the move. */
export function lastMoveEur(s: GameState): number | null {
  if (s.last_portfolio_return == null) return null
  const r = s.last_portfolio_return
  // invested_eur already includes the move: before = after / (1 + r).
  return s.invested_eur - s.invested_eur / (1 + r)
}

export type Tone = 'out' | 'stay' | 'in'

/** Label, description and tone of each action. Tones only pick an outline colour; all buttons look equal. */
export function actionView(a: Action, s: GameState): { name: string; desc: string; tone: Tone } {
  const contribution = 0.1 * s.salary_eur
  const raise = s.salary_raise_eur
  switch (a) {
    case 'sell_all': return { name: 'Vender todo', desc: 'Pasas tu inversión a efectivo', tone: 'out' }
    case 'hold': return { name: 'Mantener', desc: 'No tocas nada', tone: 'stay' }
    case 'contribute': return { name: `Aportar ${formatEur(contribution)}`, desc: 'El 10 % de tu sueldo de este mes', tone: 'in' }
    case 'stay_out': return { name: 'Seguir fuera', desc: 'Mantienes tu dinero en efectivo', tone: 'stay' }
    case 'buy_back': return { name: 'Volver a invertir', desc: 'Inviertes todo tu efectivo', tone: 'in' }
    case 'invest_raise_0': return { name: 'No invertir la subida', desc: `Te quedas los ${formatEur(raise)} al mes`, tone: 'stay' }
    case 'invest_raise_50': return { name: `Invertir ${formatEur(raise / 2)} al mes`, desc: 'La mitad de tu subida', tone: 'in' }
    case 'invest_raise_100': return { name: `Invertir ${formatEur(raise)} al mes`, desc: 'Toda tu subida', tone: 'in' }
  }
}

/** Short name of an action for tables (no amounts). */
export const ACTION_SHORT: Record<Action, string> = {
  sell_all: 'Vender todo', hold: 'Mantener', contribute: 'Aportar el 10 % del sueldo', stay_out: 'Seguir fuera',
  buy_back: 'Volver a invertir', invest_raise_0: 'No invertir la subida', invest_raise_50: 'Invertir la mitad de la subida',
  invest_raise_100: 'Invertir toda la subida',
}

export const toneOf = (a: Action): Tone =>
  a === 'sell_all' ? 'out' : a === 'hold' || a === 'stay_out' || a === 'invest_raise_0' ? 'stay' : 'in'

/** What the game views (2D chart and 3D world) draw. Built only from backend fields. */
export interface RunView {
  /** path[0] = starting capital, path[i] = wealth at round i (1-based). */
  path: number[]
  nRounds: number
  /** 0-based index of the round on screen. */
  current: number
  marks: { round0: number; tone: Tone }[]
  lastReturn: number
}

export function runView(s: GameState): RunView {
  return {
    path: wealthPath(s),
    nRounds: s.n_rounds,
    current: Math.min(s.round_index, s.n_rounds) - 1,
    marks: (s.history ?? []).map((d) => ({ round0: d.round_index - 1, tone: toneOf(d.action) })),
    lastReturn: s.last_portfolio_return ?? 0,
  }
}
