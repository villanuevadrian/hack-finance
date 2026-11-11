import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Phase } from '../api/types'
import type { RunView, Tone } from '../game'
import { formatEur } from '../format'
import { LEVEL_ORDER, roundsPerLevel } from '../levels'
import { columnHeight, stormStrength, type World } from '../worlds'
import type { Avatar } from '../character'
import { AvatarModel } from './Avatar3D'

const SPACING = 1.15
const PHASE_COLOR: Record<Phase, string> = { drop: '#7a2e5c', salary: '#a8741a', recovery: '#1f7a85' }
const TONE_COLOR: Record<Tone, string> = { out: '#ff8a3d', stay: '#4cc3ff', in: '#3ddc97' }

interface Props {
  run: RunView
  world: World
  avatar: Avatar
  reducedMotion: boolean
}

/** Phase of each round index, from the level order and the number of rounds per level. */
function phaseOf(i: number, phaseRounds: Record<Phase, number>): Phase {
  let start = 0
  for (const p of LEVEL_ORDER) {
    if (i < start + phaseRounds[p]) return p
    start += phaseRounds[p]
  }
  return LEVEL_ORDER[LEVEL_ORDER.length - 1]
}

export function World3D({ run, world, avatar, reducedMotion }: Props) {
  const n = run.nRounds
  const initial = run.path[0]
  const phaseRounds = roundsPerLevel(n)
  const x = (i: number) => (i - (n - 1) / 2) * SPACING
  // run.path[i + 1] is the wealth at round i + 1; only revealed rounds have one.
  const heights = run.path.slice(1).map((w) => columnHeight(w, initial))
  const current = run.current
  const peakIdx = heights.indexOf(Math.max(...heights))
  const markAt = new Map(run.marks.map((m) => [m.round0, m.tone]))
  const wealth = run.path[run.path.length - 1]
  // Everything the camera must keep in frame: the tallest column with the player or flag on top, and the
  // storm clouds, which float just above it instead of at a fixed height (they used to be cut off).
  const columnsTop = Math.max(...heights, 1) + topOffset(world.kind)
  const storm = stormStrength(run.lastReturn)
  const cloudY = columnsTop + 2.2

  return (
    <div className="world3d" role="img" aria-label={`${world.name}. Mes ${current + 1} de ${n}. Tu dinero: ${formatEur(wealth)}.`}>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 5.5, 16], fov: 38 }} shadows gl={{ antialias: true }}>
        <color attach="background" args={[world.sky]} />
        <fog attach="fog" args={[world.sky, 15, 38]} />
        <ambientLight intensity={0.9} color="#b9b0ff" />
        <directionalLight position={[-6, 10, 6]} intensity={2.2} color="#e6e0ff" castShadow shadow-mapSize={[1024, 1024]} />
        <CameraRig width={n * SPACING} focusX={x(current)} topY={storm > 0.02 ? cloudY + 1.2 : columnsTop + 1.7} reducedMotion={reducedMotion} />

        <Island width={n * SPACING} world={world} />

        {Array.from({ length: n }, (_, i) => {
          const revealed = i < heights.length
          return (
            <group key={i} position={[x(i), 0, 0]}>
              <MonthLabel n={i + 1} current={i === current} />
              <mesh position={[0, 0.03, 0]} receiveShadow>
                <boxGeometry args={[0.98, 0.06, 0.98]} />
                <meshStandardMaterial color={PHASE_COLOR[phaseOf(i, phaseRounds)]} emissive={PHASE_COLOR[phaseOf(i, phaseRounds)]} emissiveIntensity={revealed ? 0.5 : 0.08} />
              </mesh>
              {revealed ? (
                <Column kind={world.kind} h={heights[i]} world={world} current={i === current} />
              ) : (
                <mesh position={[0, 0.2, 0]}>
                  <boxGeometry args={[0.7, 0.3, 0.7]} />
                  <meshStandardMaterial color={world.body} transparent opacity={0.25} />
                </mesh>
              )}
              {markAt.has(i) && heights[i] !== undefined && <ActionMarker tone={markAt.get(i)!} y={heights[i] + topOffset(world.kind) + 0.45} reducedMotion={reducedMotion} />}
            </group>
          )
        })}

        {heights.length > 0 && <Flag x={x(peakIdx) - 0.3} y={heights[peakIdx] + topOffset(world.kind)} />}
        <Player x={x(current)} y={(heights[current] ?? 0.3) + topOffset(world.kind)} accent={world.accent} avatar={avatar} reducedMotion={reducedMotion} />
        <Storm strength={storm} x={x(current)} y={cloudY} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  )
}

/** Month number painted on a small sign in front of each column, so the row reads as a calendar. */
function MonthLabel({ n, current }: { n: number; current: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = current ? '#ffc94a' : '#1c1742'
    g.beginPath()
    g.roundRect(4, 4, 120, 56, 14)
    g.fill()
    g.fillStyle = current ? '#1a1300' : '#f4f1ff'
    g.font = 'bold 34px sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(`Mes ${n}`, 64, 34)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [n, current])
  return (
    <mesh position={[0, 0.2, 0.62]}>
      <planeGeometry args={[0.78, 0.39]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  )
}

/** Extra height of the decoration on top of a column (a canopy, a roof), so the player stands on it. */
function topOffset(kind: World['kind']): number {
  return kind === 'forest' ? 0.55 : kind === 'fortress' ? 0.12 : 0.08
}

function CameraRig({ width, focusX, topY, reducedMotion }: { width: number; focusX: number; topY: number; reducedMotion: boolean }) {
  const { camera, size } = useThree()
  const centre = useRef(0)
  useFrame(({ clock }) => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    // The camera follows the player and frames about seven months, so the columns are big enough to read.
    const narrow = aspect < 1.4
    const visible = Math.min(width, 7 * SPACING)
    const limit = Math.max(0, (width - visible) / 2)
    const target = THREE.MathUtils.clamp(focusX, -limit, limit)
    centre.current = reducedMotion ? target : THREE.MathUtils.lerp(centre.current, target, 0.06)
    // Distance so the visible months fit both across (width) and up (from the island to the tallest column).
    const half = THREE.MathUtils.degToRad(cam.fov / 2)
    const dAcross = (visible / 2 + 0.6) / (Math.tan(half) * aspect)
    const dUp = ((topY + 0.8) / 2) * 1.12 / Math.tan(half)
    const d = Math.max(5, dAcross, dUp) * (narrow ? 1.12 : 1)
    const sway = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.15) * 0.18
    const lookY = Math.max(1.2, (topY - 0.6) / 2)
    cam.position.set(centre.current + d * Math.sin(sway), lookY + 1.2 + d * 0.1, d * Math.cos(sway))
    cam.lookAt(centre.current, lookY, 0)
  })
  return null
}

function Island({ width, world }: { width: number; world: World }) {
  return (
    <group>
      <mesh position={[0, -0.36, 0]} receiveShadow>
        <boxGeometry args={[width + 1.2, 0.7, 2.6]} />
        <meshStandardMaterial color={world.ground} roughness={0.9} />
      </mesh>
      <mesh position={[0, -1.6, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[width * 0.2, 2.2, 24]} />
        <meshStandardMaterial color={world.ground} roughness={0.95} />
      </mesh>
    </group>
  )
}

/** Window grid for the city's buildings, drawn once on a canvas and used as a glow map. */
function useWindowTexture(): THREE.Texture {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = '#000'
    g.fillRect(0, 0, 64, 64)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 2; k++) {
        const lit = (r * 7 + k * 3) % 5 !== 0
        g.fillStyle = lit ? '#ffd27a' : '#1a1630'
        g.fillRect(8 + k * 30, 6 + r * 15, 18, 9)
      }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }, [])
}

function Column({ kind, h, world, current }: { kind: World['kind']; h: number; world: World; current: boolean }) {
  const windows = useWindowTexture()
  const floors = Math.max(1, Math.round(h * 1.4))
  const tex = useMemo(() => {
    const t = windows.clone()
    t.repeat.set(1, floors)
    t.needsUpdate = true
    return t
  }, [windows, floors])
  const glow = current ? 0.55 : 0.12
  if (kind === 'city') {
    return (
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[0.72, h, 0.72]} />
        <meshStandardMaterial color={world.body} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={current ? 1.6 : 0.9} roughness={0.6} />
      </mesh>
    )
  }
  if (kind === 'forest')
    return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, h, 12]} />
          <meshStandardMaterial color={world.body} roughness={0.9} />
        </mesh>
        <mesh position={[0, h + 0.25, 0]} castShadow>
          <sphereGeometry args={[0.48, 18, 14]} />
          <meshStandardMaterial color="#2f8f5b" emissive="#3ddc97" emissiveIntensity={glow} roughness={0.8} />
        </mesh>
      </group>
    )
  if (kind === 'fortress')
    return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.4, h, 14]} />
          <meshStandardMaterial color={world.body} roughness={0.85} />
        </mesh>
        <mesh position={[0, h + 0.06, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.12, 14]} />
          <meshStandardMaterial color="#c9c3ef" emissive={world.accent} emissiveIntensity={current ? 0.8 : 0.05} />
        </mesh>
      </group>
    )
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[0.8, h, 0.8]} />
        <meshStandardMaterial color={world.body} roughness={0.7} />
      </mesh>
      <mesh position={[0, h + 0.04, 0]}>
        <boxGeometry args={[0.86, 0.08, 0.86]} />
        <meshStandardMaterial color="#f4f1ff" emissive={current ? '#ffc94a' : '#aaa4d8'} emissiveIntensity={current ? 1.2 : 0.15} />
      </mesh>
    </group>
  )
}

/** One shape per kind of decision, so the scene does not rely on colour alone: cone = out, cube = stay, ring = in. */
function ActionMarker({ tone, y, reducedMotion }: { tone: Tone; y: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y += dt * 0.8
  })
  const color = TONE_COLOR[tone]
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={tone === 'out' ? [Math.PI, 0, 0] : [0, 0, 0]}>
      {tone === 'out' && <coneGeometry args={[0.16, 0.3, 4]} />}
      {tone === 'stay' && <boxGeometry args={[0.22, 0.22, 0.22]} />}
      {tone === 'in' && <torusGeometry args={[0.14, 0.05, 10, 24]} />}
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
    </mesh>
  )
}

function Flag({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.2, 8]} />
        <meshStandardMaterial color="#f4f1ff" />
      </mesh>
      <mesh position={[0.22, 1.05, 0]}>
        <boxGeometry args={[0.42, 0.26, 0.02]} />
        <meshStandardMaterial color="#ffc94a" emissive="#ffc94a" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

/** The player hops from its last column to the new one; with reduced motion it moves at once. */
function Player({ x, y, accent, avatar, reducedMotion }: { x: number; y: number; accent: string; avatar: Avatar; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const from = useRef(new THREE.Vector3(x, y, 0))
  const target = useRef(new THREE.Vector3(x, y, 0))
  const t = useRef(1)
  useEffect(() => {
    from.current.copy(ref.current ? ref.current.position : target.current)
    target.current.set(x, y, 0)
    t.current = reducedMotion ? 1 : 0
  }, [x, y, reducedMotion])
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    t.current = Math.min(1, t.current + dt * 2.2)
    const k = t.current
    g.position.lerpVectors(from.current, target.current, k)
    g.position.y += Math.sin(Math.PI * k) * 0.7 // hop arc
  })
  return (
    <group ref={ref} position={[x, y, 0]}>
      <pointLight position={[0, 1.4, 1]} intensity={6} distance={5} color={accent} />
      <group scale={1.35}>
        <AvatarModel avatar={avatar} />
      </group>
    </group>
  )
}

/**
 * Clouds over the player, as dense as this week's drop, and lightning when it is strong.
 * The same market move gives the same storm in every world.
 */
function Storm({ strength, x, y, reducedMotion }: { strength: number; x: number; y: number; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const bolt = useRef<THREE.Mesh>(null)
  const flash = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x, 0.05)
    const on = strength > 0.6 && !reducedMotion && Math.floor(clock.elapsedTime * 10) % 23 < 2
    if (bolt.current) bolt.current.visible = on
    if (flash.current) flash.current.intensity = on ? 60 : 0
  })
  if (strength <= 0.02) return null
  const clouds = [-1.4, -0.6, 0.2, 1.0, 1.7]
  return (
    <group ref={group} position={[x, 0, 0]}>
      {clouds.map((cx, k) => (
        <mesh key={k} position={[cx, y + (k % 2) * 0.3, -1.2 + (k % 3) * 0.35]}>
          <sphereGeometry args={[0.7 + (k % 3) * 0.18, 16, 12]} />
          <meshStandardMaterial color="#5a5191" transparent opacity={0.35 + 0.6 * strength} roughness={1} />
        </mesh>
      ))}
      <mesh ref={bolt} position={[0.4, y - 1.8, 0.2]} rotation={[0, 0, 0.25]} visible={false}>
        <boxGeometry args={[0.07, 2.9, 0.07]} />
        <meshStandardMaterial color="#ffffff" emissive="#e9e4ff" emissiveIntensity={4} />
      </mesh>
      <pointLight ref={flash} position={[0, y + 0.8, 2]} intensity={0} distance={14} color="#d9d2ff" />
    </group>
  )
}
