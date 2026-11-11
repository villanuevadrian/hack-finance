import type { Counterfactuals, Replay } from '../api/client'
import { formatEur } from '../format'

/**
 * "The revelation", shown only after the game: the player's own path next to the SAME market played with fixed
 * decisions. Every figure comes from backend replays with the real engine. It is told as information about this
 * particular market, never as "what you should have done": hindsight is easy and the next market will differ.
 */
const LABEL: Record<string, { name: string; cls: string; dash?: string }> = {
  actual: { name: 'Tus decisiones', cls: 'rv-actual' },
  hold: { name: 'Si no hubieras tocado nada', cls: 'rv-hold', dash: '8 6' },
  always_add: { name: 'Si hubieras aportado todos los meses', cls: 'rv-add', dash: '2 6' },
  sell_first_drop: { name: 'Si hubieras vendido en la primera caída', cls: 'rv-sell', dash: '14 6 2 6' },
}

const W = 760
const H = 260
const PAD = { l: 64, r: 16, t: 14, b: 26 }

export function Revelation({ data }: { data: Counterfactuals }) {
  const series: Replay[] = [data.actual, ...data.alternatives]
  const all = series.flatMap((s) => s.wealth_path)
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const n = Math.max(...series.map((s) => s.wealth_path.length)) - 1
  const x = (i: number) => PAD.l + (i / n) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b)
  const start = data.actual.wealth_path[0]
  const ticks = [lo, (lo + hi) / 2, hi]

  return (
    <section className="panel revelation">
      <p className="plan-tag">La revelación</p>
      <h2>Tu mercado, otras decisiones</h2>
      <p className="muted">
        El mismo mercado que viviste, repetido con el motor del juego y otras formas de decidir. Mirar atrás es fácil:
        en otro mercado el resultado podría ser distinto, así que no es una recomendación.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="rv-chart" role="img"
        aria-label={series.map((s) => `${LABEL[s.policy]?.name ?? s.policy}: ${formatEur(s.final_eur)}`).join('. ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="rv-grid" />
            <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="rv-tick">{formatEur(t)}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} className="rv-tick">Inicio</text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="rv-tick">Mes {n - 1}</text>
        {[...series].reverse().map((s) => (
          <polyline key={s.policy} className={`rv-line ${LABEL[s.policy]?.cls ?? ''}`} strokeDasharray={LABEL[s.policy]?.dash}
            points={s.wealth_path.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
        ))}
      </svg>
      <div className="bp-table-wrap">
        <table className="bp-table rv-table">
          <thead><tr><th>Camino</th><th>Dinero al final</th><th>Dinero que pusiste</th><th>Ganancia o pérdida</th></tr></thead>
          <tbody>
            {series.map((s) => {
              const put = start + s.contributed_eur
              const diff = s.final_eur - put
              return (
                <tr key={s.policy} data-actual={s.policy === 'actual'}>
                  <td><span className={`rv-key ${LABEL[s.policy]?.cls ?? ''}`} aria-hidden="true" /> {LABEL[s.policy]?.name ?? s.policy}</td>
                  <td>{formatEur(s.final_eur)}</td>
                  <td>{formatEur(put)}</td>
                  <td className={diff < 0 ? 'neg' : 'pos'}>{diff < 0 ? '−' : '+'}{formatEur(Math.abs(diff))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">"Dinero que pusiste" incluye lo que tenías al empezar y lo que aportaste después. Las cifras son de una simulación.</p>
    </section>
  )
}
