import { useEffect, useState } from 'react'
import type { Avatar } from '../character'
import { LEVEL_ORDER, LEVELS } from '../levels'
import type { World, WorldKind } from '../worlds'

const W = 960
const H = 420
const SPOTS: [number, number][] = [[190, 290], [480, 150], [770, 280]]

/**
 * Overworld of the player's world: three zones (the three levels) joined by a path, and the player's token
 * standing on the next zone. Progress depends only on completing zones, never on how the player decided.
 */
export function WorldMap({ world, avatar, done }: { world: World; avatar: Avatar; done: number }) {
  const target = Math.min(done, LEVEL_ORDER.length - 1)
  const [pos, setPos] = useState(Math.max(0, target - (done > 0 ? 1 : 0)))
  useEffect(() => {
    const id = window.setTimeout(() => setPos(target), 350)
    return () => window.clearTimeout(id)
  }, [target])
  const [tx, ty] = SPOTS[pos]
  const path = `M${SPOTS[0][0]},${SPOTS[0][1]} C 300,300 340,150 ${SPOTS[1][0]},${SPOTS[1][1]} S 660,280 ${SPOTS[2][0]},${SPOTS[2][1]}`

  return (
    <svg className="worldmap" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Mapa de ${world.name}: ${done} de 3 zonas completadas`}>
      <defs>
        <radialGradient id="wm-sky" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor={world.accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={world.sky} stopOpacity="1" />
        </radialGradient>
        <filter id="wm-glow"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <rect width={W} height={H} fill="url(#wm-sky)" />
      <Stars />
      <path d={`M60,${H - 40} C 120,120 300,40 480,60 C 700,40 880,120 ${W - 60},${H - 40} Z`} fill={world.ground} opacity="0.9" />
      <path d={`M60,${H - 40} C 300,${H - 10} 660,${H - 10} ${W - 60},${H - 40}`} fill="none" stroke={world.accent} strokeOpacity="0.3" strokeWidth="2" />
      <Decor kind={world.kind} color={world.body} accent={world.accent} />
      <path d={path} fill="none" stroke="#f4f1ff" strokeOpacity="0.35" strokeWidth="5" strokeDasharray="2 14" strokeLinecap="round" />
      {LEVEL_ORDER.map((p, i) => {
        const [x, y] = SPOTS[i]
        const state = i < done ? 'done' : i === done ? 'open' : 'locked'
        return (
          <g key={p} className="wm-zone" data-state={state} transform={`translate(${x},${y})`}>
            {state === 'open' && <circle r="66" fill={world.accent} opacity="0.35" filter="url(#wm-glow)" />}
            <ellipse cy="30" rx="70" ry="18" fill="#000" opacity="0.25" />
            <circle r="52" className="wm-plate" />
            <text className="wm-num" y="12" textAnchor="middle">{state === 'done' ? '✓' : state === 'locked' ? '🔒' : LEVELS[p].number}</text>
            <text className="wm-label" y="86" textAnchor="middle">Nivel {LEVELS[p].number}: {LEVELS[p].name}</text>
          </g>
        )
      })}
      <g className="wm-token" style={{ transform: `translate(${tx}px, ${ty - 78}px)` }}>
        <ellipse cy="46" rx="18" ry="5" fill="#000" opacity="0.35" />
        <rect x="-11" y="10" width="22" height="34" rx="9" fill={avatar.suit} stroke="#0b0820" strokeWidth="2" />
        <circle cy="0" r="14" fill={avatar.suit} stroke="#0b0820" strokeWidth="2" />
        <rect x="-10" y="-3" width="20" height="6" rx="3" fill={avatar.visor} />
      </g>
    </svg>
  )
}

function Stars() {
  const stars = Array.from({ length: 28 }, (_, i) => [(i * 137) % W, ((i * 71) % 120) + 10, (i % 3) + 1])
  return <g>{stars.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r * 0.7} fill="#f4f1ff" opacity={0.25 + (i % 4) * 0.12} />)}</g>
}

/** Decorations of each world, drawn with simple shapes. Purely visual. */
export function Decor({ kind, color, accent }: { kind: WorldKind; color: string; accent: string }) {
  const xs = [110, 300, 360, 620, 660, 860, 250, 560, 820]
  const base = (i: number) => 330 - (i % 3) * 28
  if (kind === 'city')
    return <g>{xs.map((x, i) => {
      const h = 50 + ((i * 37) % 60)
      return (
        <g key={i} transform={`translate(${x},${base(i)})`} opacity="0.85">
          <rect x="-14" y={-h} width="28" height={h} fill={color} />
          {Array.from({ length: Math.floor(h / 14) }, (_, r) => <rect key={r} x="-8" y={-h + 6 + r * 14} width="5" height="6" fill={accent} opacity={(r + i) % 3 ? 0.9 : 0.25} />)}
          {Array.from({ length: Math.floor(h / 14) }, (_, r) => <rect key={`b${r}`} x="3" y={-h + 6 + r * 14} width="5" height="6" fill={accent} opacity={(r + i) % 2 ? 0.8 : 0.2} />)}
        </g>
      )
    })}</g>
  if (kind === 'forest')
    return <g>{xs.map((x, i) => (
      <g key={i} transform={`translate(${x},${base(i)})`} opacity="0.9">
        <rect x="-4" y="-24" width="8" height="24" fill={color} />
        <polygon points="0,-78 -24,-24 24,-24" fill="#2f8f5b" />
        <polygon points="0,-96 -18,-52 18,-52" fill="#3ddc97" opacity="0.8" />
      </g>
    ))}</g>
  if (kind === 'fortress')
    return <g>{xs.map((x, i) => {
      const h = 46 + ((i * 29) % 40)
      return (
        <g key={i} transform={`translate(${x},${base(i)})`} opacity="0.9">
          <rect x="-15" y={-h} width="30" height={h} fill={color} />
          <polygon points={`-19,${-h} 0,${-h - 26} 19,${-h}`} fill={accent} opacity="0.85" />
          <rect x="-4" y="-16" width="8" height="16" fill="#1a1540" />
        </g>
      )
    })}</g>
  return <g>{xs.map((x, i) => {
    const h = 60 + ((i * 41) % 70)
    return (
      <g key={i} transform={`translate(${x},${base(i)})`} opacity="0.85">
        <polygon points={`-40,0 0,${-h} 40,0`} fill={color} />
        <polygon points={`-12,${-h + 34} 0,${-h} 12,${-h + 34}`} fill="#f4f1ff" opacity="0.85" />
      </g>
    )
  })}</g>
}

/** Small scene of a world for cards: its sky, ground and decorations. */
export function WorldThumb({ world }: { world: World }) {
  return (
    <svg className="world-thumb" viewBox="250 150 460 250" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`th-${world.kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={world.accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={world.sky} />
        </linearGradient>
      </defs>
      <rect x="250" y="150" width="460" height="250" fill={`url(#th-${world.kind})`} />
      <Stars />
      <ellipse cx="480" cy="380" rx="300" ry="50" fill={world.ground} />
      <Decor kind={world.kind} color={world.body} accent={world.accent} />
    </svg>
  )
}
