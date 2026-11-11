import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Action, GameState, Goal } from '../api/types'
import type { Avatar } from '../character'
import { IconExit, IconPause, IconPlus } from '../components/Icons'
import { PhaseProgress } from '../components/PhaseProgress'
import { WealthChart } from '../components/WealthChart'
import { formatEur } from '../format'
import { actionView, lastMoveEur, monthsOfSalary, runView, wealthPath, type Tone } from '../game'
import { headlineFor } from '../headlines'
import { hasWebGL, usePrefersReducedMotion } from '../hooks'
import { LEVELS, roundsPerLevel } from '../levels'
import { lifeEventFor, MISSION } from '../life'
import type { World } from '../worlds'
import { SpeakButton } from '../voice/voice'

const World3D = lazy(() => import('../components/World3D').then((m) => ({ default: m.World3D })))

interface Props {
  game: GameState
  world: World
  avatar: Avatar
  goal: Goal
  /** Time per decision, from the server (GET /config). */
  timeoutMs: number
  busy: boolean
  error: string | null
  /** action null = no decision within the time limit. */
  onDecide: (action: Action | null, responseTimeMs: number, feeling?: string) => void
}

const TONE_ICON: Record<Tone, ReactNode> = { out: <IconExit />, stay: <IconPause />, in: <IconPlus /> }
const months = (eur: number, salary: number) => {
  const m = monthsOfSalary(eur, salary)
  return m < 0.1 ? 'menos de una décima de tu sueldo' : `${m.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${m === 1 ? 'mes' : 'meses'} de tu sueldo`
}

/**
 * Voice in the game is only on demand (speaker buttons), never automatic: an automatic narration would change
 * the decision time of players with and without sound, and response time is part of the measurement.
 *
 * The game as a scene: the 3D world fills the stage with a HUD on top, the month arrives as an event card
 * (a scene of everyday life plus the market news) and the options are played as action cards.
 * Every figure comes from the backend GameState.
 */
export function Game({ game, world, avatar, goal, timeoutMs, busy, error, onDecide }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const [webgl] = useState(hasWebGL)
  const [view3d, setView3d] = useState(webgl)
  const level = LEVELS[game.phase ?? 'recovery']
  const path = wealthPath(game)
  const wealth = game.cash_eur + game.invested_eur
  const belowPeak = Math.max(...path) - wealth
  const run = runView(game)
  const mission = MISSION[goal]

  return (
    <main className="game2">
      <header className="game-hud">
        <div className="hud-chip hud-level">
          <span className="hud-level-n">{level.number}</span>
          <span><span className="hud-k">Nivel</span>{level.name}</span>
        </div>
        <div className="hud-chip hud-months">
          <PhaseProgress phaseRounds={roundsPerLevel(game.n_rounds)} roundIndex={game.round_index - 1} totalRounds={game.n_rounds} />
        </div>
        <div className="hud-chip hud-money" aria-live="polite">
          <span className="hud-k">Tu dinero</span>
          <strong>{formatEur(wealth)}</strong>
        </div>
      </header>

      <section className="step-block" aria-labelledby="step1">
        <h2 id="step1" className="step-label"><span>1</span> Qué ha pasado este mes</h2>
        <EventCard game={game} belowPeak={belowPeak} />
      </section>

      <section className="step-block" aria-labelledby="step2">
        <h2 id="step2" className="step-label"><span>2</span> Tu mundo</h2>
        <div className="stage-view">
          {view3d ? (
            <Suspense fallback={<div className="world3d world-loading">Cargando {world.name}…</div>}>
              <World3D run={run} world={world} avatar={avatar} reducedMotion={reducedMotion} />
            </Suspense>
          ) : (
            <div className="stage-2d"><WealthChart run={run} /></div>
          )}
          <div className="hud-bottom">
            <div className="hud-chip hud-mission"><span aria-hidden="true">{mission.icon}</span> <span><span className="hud-k">Misión</span>{mission.text}</span></div>
            {webgl && (
              <button className="hud-chip view-toggle2" onClick={() => setView3d((v) => !v)} aria-pressed={!view3d}>
                {view3d ? 'Ver en 2D' : `Ver ${world.name}`}
              </button>
            )}
          </div>
        </div>
      </section>

      <DecisionPanel key={game.round_index} game={game} timeoutMs={timeoutMs} busy={busy} error={error} onDecide={onDecide} />
    </main>
  )
}

function EventCard({ game, belowPeak }: { game: GameState; belowPeak: number }) {
  const life = lifeEventFor(game)
  const news = headlineFor(game)
  const move = lastMoveEur(game)
  return (
    <div className="event-banner" aria-live="polite" key={game.round_index}>
      <div className="eb-cell eb-life">
        <span className="ec-month">Mes {game.round_index} de {game.n_rounds}</span>
        <div className="ec-life">
          <span className="ec-icon" aria-hidden="true">{life.icon}</span>
          <div>
            <p className="ec-title">{life.title} <SpeakButton voiceKey={life.voiceKey} text={`${life.title}. ${life.text}`} /></p>
            <p className="ec-text">{life.text}</p>
          </div>
        </div>
      </div>
      <div className="eb-cell eb-news">
        <p className="ec-tag">Noticias del mercado</p>
        <p className="ec-headline">{news.text} <SpeakButton voiceKey={news.voiceKey} text={news.text} /></p>
        {game.kind === 'raise' && <p className="ec-raise">Subida de sueldo: <strong>+{formatEur(game.salary_raise_eur)} al mes</strong></p>}
      </div>
      <div className="eb-cell eb-money">
        {move !== null && Math.abs(move) >= 0.5 ? (
          <p className="eb-move">
            <span className="hud-k">Tu inversión este mes</span>
            <strong className={move < 0 ? 'neg' : 'pos'}>{move < 0 ? '−' : '+'}{formatEur(Math.abs(move))}</strong>
            <span className="muted small">{months(move, game.salary_eur)}</span>
          </p>
        ) : (
          <p className="eb-move"><span className="hud-k">Tu inversión este mes</span><strong>Sin cambios</strong></p>
        )}
        <dl className="ec-stats">
          <div><dt>Invertido</dt><dd>{formatEur(game.invested_eur)}</dd></div>
          <div><dt>En efectivo</dt><dd>{formatEur(game.cash_eur)}</dd></div>
          <div><dt>Bajo tu máximo</dt><dd className={belowPeak >= 0.5 ? 'neg' : undefined}>{belowPeak >= 0.5 ? `−${formatEur(belowPeak)}` : 'En máximos'}</dd></div>
          <div><dt>Sueldo</dt><dd>{formatEur(game.salary_eur)}</dd></div>
        </dl>
      </div>
    </div>
  )
}

/** Decision area of one round. Remounted every round (key), so its clock and text start fresh. */
function DecisionPanel({ game, timeoutMs, busy, error, onDecide }: Pick<Props, 'game' | 'timeoutMs' | 'busy' | 'error' | 'onDecide'>) {
  const [feeling, setFeeling] = useState('')
  const [showFeeling, setShowFeeling] = useState(false)
  const [left, setLeft] = useState(timeoutMs)
  const [played, setPlayed] = useState<Action | null>(null)
  const shownAt = useRef(0)
  const sent = useRef(false)
  const feelingRef = useRef('')
  // Refs so the round clock is not restarted by unrelated re-renders.
  const onDecideRef = useRef(onDecide)
  const busyRef = useRef(busy)
  useEffect(() => {
    onDecideRef.current = onDecide
    busyRef.current = busy
  })

  const decide = useCallback((action: Action | null) => {
    if (busyRef.current || sent.current) return
    sent.current = true
    setPlayed(action)
    onDecideRef.current(action, Math.round(performance.now() - shownAt.current), feelingRef.current.trim() || undefined)
  }, [])

  // Only the clock runs here (CALIBRACION.md §8, rule 4: 15 s, no decision = do nothing).
  useEffect(() => {
    shownAt.current = performance.now()
    sent.current = false
    const id = window.setInterval(() => {
      const remaining = timeoutMs - (performance.now() - shownAt.current)
      setLeft(Math.max(0, remaining))
      if (remaining <= 0) decide(null)
    }, 200)
    return () => window.clearInterval(id)
  }, [decide, timeoutMs])

  // If the request failed, allow deciding again in the same round.
  useEffect(() => {
    if (error) sent.current = false
  }, [error])

  // Keyboard: 1, 2, 3 choose the cards in the order shown (the backend changes it every round).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const i = Number(e.key) - 1
      if (i >= 0 && i < game.available_actions.length) decide(game.available_actions[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [decide, game.available_actions])

  const secs = Math.ceil(left / 1000)
  return (
    <section className="hand" aria-labelledby="decide-q">
      <div className="hand-head">
        <h2 id="decide-q" className="step-label"><span>3</span> ¿Qué haces este mes?</h2>
        <div className="fuse" role="timer" aria-label={`Quedan ${secs} segundos`} data-low={secs <= 5}>
          <span style={{ width: `${(left / timeoutMs) * 100}%` }} />
          <b>{secs} s</b>
        </div>
      </div>
      {/* Same size and weight for every card; the backend shuffles their order each round. */}
      <div className="cards-row" style={{ gridTemplateColumns: `repeat(${game.available_actions.length}, minmax(0, 1fr))` }}>
        {game.available_actions.map((a, i) => {
          const v = actionView(a, game)
          return (
            <button key={a} className={`play-card pc-${v.tone}`} data-played={played === a} onClick={() => decide(a)} disabled={busy || played !== null}>
              <kbd>{i + 1}</kbd>
              <span className="pc-art" aria-hidden="true">{TONE_ICON[v.tone]}</span>
              <span className="pc-name">{v.name}</span>
              <span className="pc-desc">{v.desc}</span>
            </button>
          )
        })}
      </div>
      <div className="hand-foot">
        {showFeeling ? (
          <label className="feeling">
            <span className="muted small">¿Cómo te sientes? (opcional; no escribas datos personales)</span>
            <input autoFocus type="text" maxLength={500} value={feeling} placeholder="Por ejemplo: nervioso, tranquilo…"
              onChange={(e) => { setFeeling(e.target.value); feelingRef.current = e.target.value }} />
          </label>
        ) : (
          <button className="ghost small" onClick={() => setShowFeeling(true)}>💬 Contar cómo te sientes</button>
        )}
        <p className="muted small">Si no decides en {Math.round(timeoutMs / 1000)} segundos, cuenta como no hacer nada.</p>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  )
}
