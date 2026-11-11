/**
 * Games started in this browser, so the bank portal still works in a one-laptop demo when the backend has no
 * GET /games yet. Only game ids and the date: no answers and no personal data.
 */
const KEY = 'behaviorlab.games'

export interface LocalGame {
  game_id: string
  created_at: string
  finished?: boolean
}

export function rememberGame(gameId: string): void {
  try {
    const list = localGames().filter((g) => g.game_id !== gameId)
    list.unshift({ game_id: gameId, created_at: new Date().toISOString() })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)))
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

export function localGames(): LocalGame[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LocalGame[]) : []
  } catch {
    return []
  }
}

export function markFinished(gameId: string): void {
  try {
    const list = localGames().map((g) => (g.game_id === gameId ? { ...g, finished: true } : g))
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable */
  }
}

export const finishedCount = () => localGames().filter((g) => g.finished).length
