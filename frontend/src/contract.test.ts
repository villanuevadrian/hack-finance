import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { GameState } from './api/types'
import { actionView, lastMoveEur, toneOf, wealthPath } from './game'
import { completedLevel, roundsPerLevel } from './levels'
import { amountOf, blockComplete, BLOCKS, missingRequired, QUESTIONS, toAnswers } from './questionnaire'

/** Enum values of a schema, read from the generated OpenAPI types (they come from contracts/). */
const generated = readFileSync(new URL('./api/generated.ts', import.meta.url), 'utf8')
function enumOf(schema: string): string[] {
  const m = generated.match(new RegExp(`\\n\\s+${schema}: ([^;]+);`))
  if (!m) throw new Error(`schema ${schema} not found`)
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
}

const SCHEMA: Record<string, string> = {
  education: 'Education', occupation: 'Occupation', known_products: 'Product', invested_products: 'Product',
  trading_frequency: 'TradingFrequency', invested_volume: 'InvestedVolume', quiz_risk: 'QuizRisk',
  quiz_recovery: 'QuizRecovery', quiz_guarantee: 'QuizGuarantee', income: 'Income', income_source: 'IncomeSource',
  monthly_saving: 'MonthlySaving', financial_wealth: 'FinancialWealth', fixed_commitments: 'FixedCommitments',
  emergency_months: 'EmergencyMonths', share_invested: 'ShareInvested', goal: 'Goal', horizon: 'Horizon',
  return_preference: 'ReturnPreference', stated_reaction: 'StatedReaction',
}

describe('questionnaire matches the OnboardingAnswers contract', () => {
  it('asks every field of the contract except consent, once', () => {
    const fields = BLOCKS.flatMap((b) => b.fields)
    expect(new Set(fields).size).toBe(fields.length)
    expect(new Set(fields)).toEqual(new Set([...Object.keys(SCHEMA), 'amount_eur']))
  })

  it('offers exactly the enum values of the contract', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'amount') continue
      const values = q.options.map((o) => o.value)
      expect(new Set(values), q.id).toEqual(new Set(enumOf(SCHEMA[q.id])))
    }
  })

  it('the right answer of each challenge is a value of the contract', () => {
    for (const q of QUESTIONS) if (q.kind === 'quiz') expect(enumOf(SCHEMA[q.id])).toContain(q.correct)
  })

  it('nothing is answered by default and "Prefiero no responder" counts as answered', () => {
    for (const b of BLOCKS) expect(blockComplete({}, b.key)).toBe(false)
    expect(blockComplete({ education: 'university', occupation: null }, 'who')).toBe(true)
  })

  it('missing required financial data blocks the profile, like the backend', () => {
    expect(missingRequired({ income: null })).toContain('income')
    expect(missingRequired({ income: '1000_1800', income_source: 'permanent', fixed_commitments: 'lt_20', emergency_months: '3_6', share_invested: 'lt_25' })).toEqual([])
  })

  it('sends consent and uses the default amount when S8 is skipped', () => {
    expect(toAnswers({}).consent).toBe(true)
    expect(amountOf({ amount_eur: null })).toBe(10_000)
  })
})

const state = (over: Partial<GameState>): GameState => ({
  game_id: 'g', seed: 1, portfolio_id: 'pop', equity_pct: 39, n_rounds: 15, round_index: 1, finished: false,
  phase: 'drop', kind: 'market', available_actions: ['hold', 'sell_all', 'contribute'], starting_capital_eur: 1000,
  cash_eur: 0, invested_eur: 900, salary_eur: 1400, monthly_auto_invest_eur: 0, contributed_eur: 0, portfolio_drawdown: 0.1,
  history: [], ...over,
} as GameState)

describe('game helpers', () => {
  it('builds the wealth path only from backend fields', () => {
    const s = state({ round_index: 2, history: [{ wealth_eur: 950 } as never] })
    expect(wealthPath(s)).toEqual([1000, 950, 900])
  })

  it('last move in euros: invested after the move minus invested before it', () => {
    expect(lastMoveEur(state({ invested_eur: 900, last_portfolio_return: -0.1 }))!).toBeCloseTo(-100)
    expect(lastMoveEur(state({ last_portfolio_return: null }))).toBeNull()
  })

  it('every action of the contract has a label and a tone', () => {
    for (const a of enumOf('Action')) {
      const v = actionView(a as never, state({ salary_raise_eur: 200 }))
      expect(v.name.length).toBeGreaterThan(0)
      expect(['out', 'stay', 'in']).toContain(toneOf(a as never))
    }
  })

  it('splits 15 rounds into three levels of 5 and detects the change of level', () => {
    expect(roundsPerLevel(15)).toEqual({ drop: 5, salary: 5, recovery: 5 })
    expect(completedLevel(state({ phase: 'drop' }), state({ phase: 'salary' }))).toBe(0)
    expect(completedLevel(state({ phase: 'drop' }), state({ phase: 'drop' }))).toBeNull()
    expect(completedLevel(state({ phase: 'recovery' }), state({ finished: true, phase: null }))).toBe(2)
  })
})
