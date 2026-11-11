import { useEffect, useRef } from 'react'
import type { Avatar } from '../character'
import { Mentor } from '../components/Mentor'
import { WorldMap } from '../components/WorldMap'
import { N } from '../voice/lines'
import type { World } from '../worlds'

/** The map of the world: shown when entering it and between levels. Shows only progress, never results. */
export function MapScreen({ world, avatar, done, busy, onContinue }: { world: World; avatar: Avatar; done: number; busy: boolean; onContinue: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus()
  }, [])
  const key = done === 0 ? `world_${world.kind}` : `map_${done}`
  const text = N.mentor[key as keyof typeof N.mentor]
  const title = done === 0 ? `Bienvenida a ${world.name}` : done === 3 ? '¡Mundo completado!' : '¡Zona completada!'
  return (
    <main className="mapscreen">
      <div className="title-block">
        <p className="kicker">{world.name}</p>
        <h1>{title}</h1>
      </div>
      <div className="panel map-frame"><WorldMap world={world} avatar={avatar} done={done} /></div>
      <Mentor screen="mapa" text={text} voiceKey={`mentor_${key}`} />
      <button ref={button} className="start" onClick={onContinue} disabled={busy}>
        {busy ? 'Cargando…' : done < 3 ? `Entrar en el nivel ${done + 1}` : 'Ver mi plan'}
      </button>
    </main>
  )
}
