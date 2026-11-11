import type { Phase } from '../api/types'
import { LEVEL_ORDER, LEVELS } from '../levels'

interface Props {
  phaseRounds: Record<Phase, number>
  roundIndex: number
  totalRounds: number
}

/** Week nodes grouped by level. Completed, current and upcoming weeks differ in shape, not only colour. */
export function PhaseProgress({ phaseRounds, roundIndex, totalRounds }: Props) {
  // First round index of each level: cumulative sum of the previous levels' rounds.
  const starts = LEVEL_ORDER.map((_, i) => LEVEL_ORDER.slice(0, i).reduce((acc, q) => acc + phaseRounds[q], 0))
  return (
    <nav className="levelmap" aria-label={`Mes ${roundIndex + 1} de ${totalRounds}`}>
      {LEVEL_ORDER.map((p, idx) => {
        const first = starts[idx]
        const n = phaseRounds[p]
        const active = roundIndex >= first && roundIndex < first + n
        return (
          <div key={p} className="stage" data-active={active} style={{ flexGrow: n }}>
            <p className="stage-title">
              {active ? `Mes ${roundIndex - first + 1} de ${n}` : `Nivel ${LEVELS[p].number}`}
            </p>
            <ol className="nodes">
              {Array.from({ length: n }, (_, k) => {
                const i = first + k
                const state = i < roundIndex ? 'done' : i === roundIndex ? 'current' : 'next'
                return <li key={i} className="node" data-state={state} aria-current={state === 'current' ? 'step' : undefined} />
              })}
            </ol>
          </div>
        )
      })}
    </nav>
  )
}
