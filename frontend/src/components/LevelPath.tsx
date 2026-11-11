import { LEVEL_ORDER, LEVELS } from '../levels'

interface Props {
  done: number               // number of completed levels
  justUnlocked?: number      // index of the level to animate as newly unlocked
}

/** Level path: done levels show a check, the next one glows, the rest are locked. */
export function LevelPath({ done, justUnlocked }: Props) {
  return (
    <ol className="levelpath">
      {LEVEL_ORDER.map((p, i) => {
        const state = i < done ? 'done' : i === done ? 'open' : 'locked'
        const L = LEVELS[p]
        return (
          <li key={p} className="lp-item" data-state={state} data-new={i === justUnlocked}>
            <span className="lp-badge" aria-hidden="true">
              {state === 'done' ? <Check /> : state === 'locked' ? <Lock /> : L.number}
            </span>
            <span className="lp-text">
              <span className="lp-num">Nivel {L.number}</span>
              <span className="lp-name">{L.name}</span>
              <span className="sr-only">
                {state === 'done' ? ', completado' : state === 'open' ? ', disponible' : ', bloqueado'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const Check = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
const Lock = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
)
