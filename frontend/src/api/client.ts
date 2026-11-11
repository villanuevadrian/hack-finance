import type { Action, Catalog, GameState, OnboardingAnswers, PortfolioProposal, Posterior, Profile, Scenario } from './types'

/** Base URL of the FastAPI backend (backend/api/main.py). */
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/** Row of GET /games (defined in backend/api/main.py, not in contracts/). */
export interface GameSummary {
  game_id: string
  created_at: string
  finished: boolean
  round_index: number
  n_rounds: number
  goal: string
  horizon: string
  final_level?: number | null
  limiting?: string[]
  portfolio_name?: string | null
  stated_level?: number | null
  revealed_level?: number | null
  reliability?: string | null
  provisional_model?: boolean | null
}

/** GET /games/{id}/counterfactuals (backend/api/main.py, proposal for Núcleo): same market, other decisions. */
export interface Replay {
  policy: 'actual' | 'hold' | 'always_add' | 'sell_first_drop' | string
  wealth_path: number[]
  final_eur: number
  contributed_eur: number
}
export interface Counterfactuals {
  actual: Replay
  alternatives: Replay[]
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init })
  } catch {
    throw new ApiError('No hay conexión con el servidor. Comprueba que la API está arrancada (make run-api).', 0)
  }
  if (!res.ok) {
    let detail = `El servidor respondió con un error (${res.status}).`
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      /* keep the generic message */
    }
    throw new ApiError(detail, res.status)
  }
  return (await res.json()) as T
}

const post = <T,>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
  catalog: () => request<Catalog>('/catalog'),
  createGame: (answers: OnboardingAnswers, seed?: number) => post<GameState>('/games', { answers, seed }),
  game: (id: string) => request<GameState>(`/games/${id}`),
  /** action null = no decision in time (counts as "do nothing" in the engine). */
  decide: (id: string, action: Action | null, responseTimeMs: number, feelingText?: string) =>
    post<GameState>(`/games/${id}/decision`, { action, response_time_ms: responseTimeMs, feeling_text: feelingText || null }),
  scenario: (id: string) => request<Scenario>(`/games/${id}/scenario`),
  profile: (id: string) => request<Profile>(`/games/${id}/profile`),
  proposal: (id: string) => request<PortfolioProposal>(`/games/${id}/proposal`),
  posterior: (id: string) => request<Posterior>(`/games/${id}/posterior`),
  /** Bank portal. Needs GET /games in the backend (proposal for Núcleo); 404/405 if it is not there yet. */
  listGames: () => request<GameSummary[]>('/games'),
  counterfactuals: (id: string) => request<Counterfactuals>(`/games/${id}/counterfactuals`),
  /** Server settings (proposal for Núcleo). 404 on servers without it: the frontend uses its defaults. */
  config: () => request<{ decision_timeout_ms: number; assistant_uses_claude: boolean }>('/config'),
  /** Vega's help desk (proposal for Núcleo + text/). Only the question and the screen name are sent. */
  ask: (question: string, screen: string) => post<{ answer: string; source: string }>('/assistant', { question, screen }),
}
