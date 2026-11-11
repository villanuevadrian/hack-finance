import type { RunView, Tone } from '../game'
import { formatEur } from '../format'

interface Props {
  run: RunView
}

const W = 800
const H = 320
const PAD = { top: 44, right: 24, bottom: 30, left: 24 }

/**
 * The run as a ridge: wealth line with a glow, the drawdown from the running peak
 * as a striped "danger zone", a flag on the peak and the player marker on the last point.
 */
export function WealthChart({ run }: Props) {
  const wealthPath = run.path
  const totalRounds = run.nRounds
  const lo = Math.min(...wealthPath)
  const hi = Math.max(...wealthPath)
  const span = Math.max(hi - lo, hi * 0.08)
  const yMin = lo - span * 0.35
  const yMax = hi + span * 0.1
  const bottom = H - PAD.bottom

  const x = (i: number) => PAD.left + (i / totalRounds) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (bottom - PAD.top)

  const last = wealthPath.length - 1
  const peaks = wealthPath.map((_, i) => Math.max(...wealthPath.slice(0, i + 1)))
  const peakIdx = wealthPath.indexOf(hi)
  const pts = wealthPath.map((v, i) => [x(i), y(v)] as const)
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ')
  const ground = `${line} L${x(last)},${bottom} L${x(0)},${bottom}Z`
  const peakLine = peaks.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  const danger =
    peakLine + pts.slice().reverse().map(([px, py]) => `L${px},${py}`).join(' ') + 'Z'
  const ddNow = peaks[last] > 0 ? 1 - wealthPath[last] / peaks[last] : 0
  const [nx, ny] = pts[last]

  return (
    <svg
      className="wealth-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Tu dinero: ahora ${formatEur(wealthPath[last])}, máximo ${formatEur(hi)}.`}
    >
      <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--hold)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--hold)" stopOpacity="0" />
        </linearGradient>
        <pattern id="stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="var(--sell)" opacity="0.12" />
          <rect width="4" height="10" fill="var(--sell)" opacity="0.35" />
        </pattern>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="var(--grid)" strokeWidth="1" />
        </pattern>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill="url(#grid)" />
      <rect className="fog" x={x(last)} y="0" width={Math.max(0, W - x(last))} height={H} />

      <path d={ground} fill="url(#ground)" />
      {ddNow > 0.001 && <path d={danger} fill="url(#stripes)" />}
      <path className="peak" d={peakLine} />
      <path className="ridge" d={line} filter="url(#glow)" />

      {run.marks.map((m) => (
        <Marker key={m.round0} tone={m.tone} cx={x(m.round0 + 1)} cy={y(wealthPath[m.round0 + 1] ?? wealthPath[last])} />
      ))}

      <g className="flag" transform={`translate(${x(peakIdx)},${y(hi)})`}>
        <path d="M0 0V-30" />
        <path className="flag-cloth" d="M0 -30 L18 -24 L0 -18Z" />
        <text x={x(peakIdx) > W - 170 ? -6 : 22} y="-22" textAnchor={x(peakIdx) > W - 170 ? "end" : "start"}>Máximo {formatEur(hi)}</text>
      </g>

      <g className="player" transform={`translate(${nx},${ny})`}>
        <circle className="player-pulse" r="16" />
        <circle className="player-core" r="8" />
        <text className="player-label" y="34" x={nx > W - 70 ? -10 : 0} textAnchor={nx > W - 70 ? "end" : "middle"}>Tú {formatEur(wealthPath[last])}</text>
      </g>
    </svg>
  )
}

/** Shape encodes the kind of decision so the chart does not rely on colour alone. */
function Marker({ tone, cx, cy }: { tone: Tone; cx: number; cy: number }) {
  const s = 7
  if (tone === 'out')
    return <path className="mk mk-sell" d={`M${cx - s},${cy - s} L${cx + s},${cy - s} L${cx},${cy + s}Z`} />
  if (tone === 'in')
    return <path className="mk mk-contribute" d={`M${cx - s},${cy} H${cx + s} M${cx},${cy - s} V${cy + s}`} />
  return <rect className="mk mk-hold" x={cx - 4.5} y={cy - 4.5} width={9} height={9} rx={2} />
}
