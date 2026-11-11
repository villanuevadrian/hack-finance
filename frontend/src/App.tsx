import { useEffect, useState } from 'react'
import { api } from './api/client'
import type { Action, GameState, Phase } from './api/types'
import type { InvestorSheet } from './character'
import { completedLevel, LEVEL_ORDER } from './levels'
import { DECISION_TIMEOUT_MS } from './game'
import { markFinished, rememberGame } from './localIndex'
import { BankPanel } from './screens/BankPanel'
import { BankPortal } from './screens/BankPortal'
import { Briefing } from './screens/Briefing'
import { Game } from './screens/Game'
import { Intro } from './screens/Intro'
import { MapScreen } from './screens/MapScreen'
import { Onboarding } from './screens/Onboarding'
import { ResultsScreen, type Results } from './screens/Results'
import { useVoice } from './voice/context'
import { VoiceProvider } from './voice/voice'
import { worldFor } from './worlds'
import { Backdrop } from './components/Backdrop'
import { APP_NAME } from './config'

/**
 * Player journey (docs/CUESTIONARIO.md §2): welcome -> "Crea tu yo inversor" -> map of the world -> for each
 * level a lesson and the level, with the map between levels -> plan and suitability report.
 * Bank side (#banco): portal with the evaluated clients and each client's panel. All figures come from the API.
 */
type Screen = 'intro' | 'onboarding' | 'map' | 'briefing' | 'game' | 'results' | 'panel'

export default function App() {
  return (
    <VoiceProvider>
      <Shell />
    </VoiceProvider>
  )
}

const isBank = () => window.location.hash === '#banco'

function Shell() {
  const voice = useVoice()
  const [bank, setBank] = useState(isBank)
  const [screen, setScreen] = useState<Screen>('intro')
  const [sheet, setSheet] = useState<InvestorSheet | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [done, setDone] = useState(0)
  const [briefingPhase, setBriefingPhase] = useState<Phase>('drop')
  const [results, setResults] = useState<Results | null>(null)
  const [bankView, setBankView] = useState<{ game: GameState; results: Results } | null>(null)
  const [busy, setBusy] = useState(false)
  const [timeoutMs, setTimeoutMs] = useState(DECISION_TIMEOUT_MS)
  const [error, setError] = useState<string | null>(null)

  // The engine's time limit, so the clock on screen and the backend always agree.
  useEffect(() => {
    api.config().then((c) => setTimeoutMs(c.decision_timeout_ms)).catch(() => { /* older server: default */ })
  }, [])

  useEffect(() => {
    const on = () => setBank(isBank())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const world = sheet ? worldFor(sheet.answers.goal) : null

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo ha fallado. Inténtalo de nuevo.')
      return null
    } finally {
      setBusy(false)
    }
  }

  const loadResults = (id: string) =>
    Promise.all([
      api.profile(id), api.proposal(id), api.posterior(id).catch(() => null), api.catalog().catch(() => null),
      api.counterfactuals(id).catch(() => null),
    ]).then(([profile, proposal, posterior, catalog, counterfactuals]) => ({ profile, proposal, posterior, catalog, counterfactuals }))

  async function start(s: InvestorSheet) {
    setSheet(s)
    const g = await run(() => api.createGame(s.answers))
    if (g) {
      rememberGame(g.game_id)
      setGame(g)
      setDone(0)
      setScreen('map')
    }
  }

  async function decide(action: Action | null, responseTimeMs: number, feeling?: string) {
    if (!game) return
    const g = await run(() => api.decide(game.game_id, action, responseTimeMs, feeling))
    if (!g) return
    const finished = completedLevel(game, g)
    setGame(g)
    if (finished !== null) {
      setDone(finished + 1)
      setScreen('map')
    }
  }

  async function continueFromMap() {
    if (!game) return
    if (done < LEVEL_ORDER.length) {
      setBriefingPhase(LEVEL_ORDER[done])
      setScreen('briefing')
      return
    }
    const r = await run(() => loadResults(game.game_id))
    if (r) {
      markFinished(game.game_id)
      setResults(r)
      setScreen('results')
      window.scrollTo({ top: 0 })
    }
  }

  async function openClient(id: string) {
    const r = await run(async () => ({ game: await api.game(id), results: await loadResults(id) }))
    if (r) setBankView(r)
  }

  function restart() {
    setSheet(null)
    setGame(null)
    setResults(null)
    setError(null)
    setScreen('intro')
  }

  const go = (hash: string) => {
    window.location.hash = hash
    setBank(hash === '#banco')
    setBankView(null)
  }

  return (
    <div className="app" data-screen={bank ? 'bank' : screen} data-phase={!bank && screen === 'game' && game?.phase ? game.phase : 'none'}>
      <Backdrop />
      <div className="brand no-print">
        <span>{APP_NAME}</span>
        <span className="brand-right">
          {voice.available && (
            <button className="hud-chip voice-toggle" onClick={voice.toggle} aria-pressed={voice.on}>{voice.on ? '🔊 Voz' : '🔇 Voz'}</button>
          )}
          {bank ? (
            <a className="mode" href="#" onClick={(e) => { e.preventDefault(); go('') }}>Ir al juego</a>
          ) : (
            <a className="mode" href="#banco" onClick={(e) => { e.preventDefault(); go('#banco') }}>Acceso entidad</a>
          )}
        </span>
      </div>
      {error && !(screen === 'game' && !bank) && <p className="error banner" role="alert">{error}</p>}

      {bank ? (
        bankView ? (
          <BankPanel game={bankView.game} results={bankView.results} onBack={() => setBankView(null)} />
        ) : (
          <BankPortal onOpen={openClient} onExit={() => go('')} />
        )
      ) : (
        <>
          {screen === 'intro' && <Intro onStart={() => setScreen('onboarding')} busy={busy} error={null} />}
          {screen === 'onboarding' && <Onboarding onDone={start} />}
          {screen === 'map' && world && sheet && <MapScreen world={world} avatar={sheet.avatar} done={done} busy={busy} onContinue={continueFromMap} />}
          {screen === 'briefing' && world && <Briefing phase={briefingPhase} world={world} onStart={() => setScreen('game')} />}
          {screen === 'game' && game && sheet && world && (
            <Game game={game} world={world} avatar={sheet.avatar} goal={sheet.answers.goal} timeoutMs={timeoutMs} busy={busy} error={error} onDecide={decide} />
          )}
          {screen === 'results' && sheet && world && results && (
            <ResultsScreen sheet={sheet} world={world} results={results} onPanel={() => setScreen('panel')} onRestart={restart} />
          )}
          {screen === 'panel' && game && results && <BankPanel game={game} results={results} onBack={() => setScreen('results')} />}
        </>
      )}
    </div>
  )
}
