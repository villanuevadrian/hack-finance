import type { GameState } from '../api/types'
import { WealthChart } from '../components/WealthChart'
import { ENTITY_NAME } from '../config'
import { formatEur, formatPctPlain } from '../format'
import { ACTION_SHORT, runView, toneOf } from '../game'
import { PARAM_UI, STATED_REACTION, domainOf } from '../params'
import { Levels, type Results } from './Results'

/**
 * What the bank sees (RF-07): trajectory and decisions, profile with uncertainty and the comparison of
 * catalog portfolios, plus declared versus revealed (RF-10). Every figure comes from the API.
 */
export function BankPanel({ game, results, onBack }: { game: GameState; results: Results; onBack: () => void }) {
  const { profile, proposal, posterior } = results
  const run = runView(game)
  return (
    <main className="panel-screen">
      <div className="title-block">
        <p className="kicker">{ENTITY_NAME}: vista de la entidad</p>
        <h1>Panel del cliente</h1>
        <p className="muted small">Partida {game.game_id.slice(0, 8)}, {game.n_rounds} meses, semilla {game.seed}. Sin datos identificativos.</p>
      </div>

      <section className="panel bp-block">
        <h2>1. Trayectoria y decisiones</h2>
        <WealthChart run={run} />
        <p className="muted small">Triángulo: sale del mercado. Cuadrado: mantiene. Cruz: invierte más.</p>
        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead><tr><th>Mes</th><th>Dinero</th><th>Caída de la cartera</th><th>Decisión</th><th>Tiempo</th><th>Cómo se sentía</th></tr></thead>
            <tbody>
              {(game.history ?? []).map((d) => (
                <tr key={d.round_index} data-tone={toneOf(d.action)}>
                  <td>{d.round_index}</td>
                  <td>{formatEur(d.wealth_eur)}</td>
                  <td>{d.portfolio_drawdown > 0.0005 ? `−${formatPctPlain(d.portfolio_drawdown)}` : '0 %'}</td>
                  <td>{ACTION_SHORT[d.action]}{d.timed_out ? ' (sin responder)' : ''}</td>
                  <td>{(d.response_time_ms / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s</td>
                  <td>{d.feeling_text ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel bp-block">
        <h2>2. Perfil con incertidumbre</h2>
        {profile.provisional_model && <p className="example small">Modelo provisional de inferencia.</p>}
        <div className="bp-marginals">
          {profile.parameters.map((p) => {
            const ui = PARAM_UI[p.name] ?? { name: p.name, format: (x: number) => x.toFixed(2) }
            const grid = posterior?.grid[p.name] ?? []
            const w = posterior?.marginals[p.name] ?? []
            return (
              <figure key={p.name} className="marginal">
                <figcaption><strong>{ui.name}</strong><br />Entre {ui.format(p.ci_low)} y {ui.format(p.ci_high)} (90 %)</figcaption>
                <Marginal grid={grid} weights={w} low={p.ci_low} high={p.ci_high} domain={domainOf(posterior, p.name)} format={ui.format} />
              </figure>
            )
          })}
        </div>
        <p className="small">Fiabilidad: <strong>{profile.reliability}</strong>. Conocimiento: <strong>{profile.knowledge_level}</strong>. Decisiones sin responder a tiempo: {profile.timeouts}.</p>
      </section>

      <Levels profile={profile} />

      <section className="panel bp-block">
        <h2>3. Comparación de carteras</h2>
        <p className="muted small">
          Cada fila simula la conducta estimada del cliente durante {proposal.horizon_years} años con {formatEur(proposal.amount_eur)}. Se propone la de mayor escenario malo
          con una probabilidad de venta en pánico de como máximo {formatPctPlain(proposal.max_panic_prob)}.
        </p>
        <Candidates results={results} />
      </section>

      <section className="panel bp-block">
        <h2>4. Declarado frente a revelado</h2>
        <table className="bp-table"><tbody>
          <tr><th scope="row">Reacción declarada ante una caída del 20 %</th><td>{STATED_REACTION[profile.stated_reaction] ?? profile.stated_reaction}</td></tr>
          <tr><th scope="row">Nivel declarado (montaña rusa)</th><td>{profile.stated_level}</td></tr>
          <tr><th scope="row">Nivel revelado en la partida</th><td>{profile.levels.revealed}</td></tr>
          <tr><th scope="row">Diferencia</th><td><strong>{profile.stated_level - profile.levels.revealed > 0 ? '+' : ''}{profile.stated_level - profile.levels.revealed}</strong> {profile.stated_level > profile.levels.revealed ? '(se sobrestima)' : profile.stated_level < profile.levels.revealed ? '(se subestima)' : '(coincide)'}</td></tr>
        </tbody></table>
      </section>

      <p className="notice">{proposal.disclaimer}</p>
      <button className="ghost" onClick={onBack}>Volver al plan</button>
    </main>
  )
}

/** Posterior marginal as bars, with the 90 % interval shaded. */
function Marginal({ grid, weights, low, high, domain, format }: { grid: number[]; weights: number[]; low: number; high: number; domain: [number, number]; format: (x: number) => string }) {
  const W = 320
  const H = 110
  if (grid.length === 0) return <p className="muted small">Sin datos del posterior.</p>
  const max = Math.max(...weights)
  const [d0, d1] = domain
  const x = (v: number) => 10 + ((v - d0) / (d1 - d0 || 1)) * (W - 20)
  const bw = Math.max(2, (W - 20) / grid.length - 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="marginal-svg" role="img" aria-label={`Distribución entre ${format(low)} y ${format(high)}`}>
      <rect x={x(low)} y={8} width={Math.max(1, x(high) - x(low))} height={H - 30} className="mg-ci" />
      {grid.map((g, i) => {
        const h = max > 0 ? (weights[i] / max) * (H - 34) : 0
        return <rect key={i} x={x(g) - bw / 2} y={H - 22 - h} width={bw} height={h} className="mg-bar" />
      })}
      <text x={10} y={H - 6} className="mg-tick">{format(d0)}</text>
      <text x={W - 10} y={H - 6} textAnchor="end" className="mg-tick">{format(d1)}</text>
    </svg>
  )
}

function Candidates({ results }: { results: Results }) {
  const { proposal } = results
  const amount = proposal.amount_eur
  const maxOut = Math.max(...proposal.candidates.map((c) => c.final_multiple_p90 * amount))
  const W = 170
  const x = (v: number) => (v / maxOut) * W
  return (
    <div className="bp-table-wrap">
      <table className="bp-table cand">
        <thead><tr><th>Cartera</th><th>Nivel</th><th>Idónea por horizonte y capacidad</th><th>Venta en pánico</th><th>Escenario malo, central y bueno</th></tr></thead>
        <tbody>
          {proposal.candidates.map((c) => {
            const chosen = c.portfolio_id === proposal.portfolio_id
            return (
              <tr key={c.portfolio_id} data-chosen={chosen}>
                <td>{c.name}{chosen && <strong className="gold"> (propuesta)</strong>}</td>
                <td>{c.risk_level}</td>
                <td>{c.eligible ? 'Sí' : 'No'}</td>
                <td>
                  <svg viewBox="0 0 110 16" className="panic-bar" role="img" aria-label={`${formatPctPlain(c.p_panic)}, umbral ${formatPctPlain(proposal.max_panic_prob)}`}>
                    <rect x={0} y={4} width={100} height={8} className="pb-track" />
                    <rect x={0} y={4} width={c.p_panic * 100} height={8} className={c.p_panic > proposal.max_panic_prob ? 'pb-over' : 'pb-ok'} />
                    <line x1={proposal.max_panic_prob * 100} x2={proposal.max_panic_prob * 100} y1={1} y2={15} className="pb-th" />
                  </svg>
                  <span className="small"> {formatPctPlain(c.p_panic)}</span>
                </td>
                <td>
                  <svg viewBox={`0 0 ${W + 10} 16`} className="range-bar" role="img"
                    aria-label={`Malo ${formatEur(c.final_multiple_p10 * amount)}, central ${formatEur(c.final_multiple_p50 * amount)}, bueno ${formatEur(c.final_multiple_p90 * amount)}`}>
                    <line x1={x(amount)} x2={x(amount)} y1={0} y2={16} className="rb-amount" />
                    <rect x={x(c.final_multiple_p10 * amount)} y={5} width={Math.max(1, x(c.final_multiple_p90 * amount) - x(c.final_multiple_p10 * amount))} height={6} className="rb-band" />
                    <circle cx={x(c.final_multiple_p50 * amount)} cy={8} r={4} className="rb-mid" />
                  </svg>
                  <span className="small"> {formatEur(c.final_multiple_p10 * amount)} / {formatEur(c.final_multiple_p50 * amount)} / {formatEur(c.final_multiple_p90 * amount)}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="muted small">La línea vertical de la última columna marca lo invertido; la de la columna de pánico, el umbral.</p>
    </div>
  )
}
