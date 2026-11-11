import { useEffect, useRef } from 'react'
import type { Phase } from '../api/types'
import { Mentor } from '../components/Mentor'
import { lessonFor } from '../learning'
import { LEVELS } from '../levels'
import { N } from '../voice/lines'
import { SpeakButton } from '../voice/voice'
import type { World } from '../worlds'

/** Before each level: Vega introduces the zone and a short lesson about products (never how to react). */
export function Briefing({ phase, world, onStart }: { phase: Phase; world: World; onStart: () => void }) {
  const lesson = lessonFor(phase)
  const level = LEVELS[phase]
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus()
  }, [])
  return (
    <main className="briefing">
      <p className="kicker">{world.name}, nivel {level.number}: {level.name}</p>
      <h1>Antes de empezar</h1>
      <Mentor screen="leccion" text={N.mentor[`level_${phase}`]} voiceKey={`mentor_level_${phase}`} />
      {phase === 'drop' && (
        <section className="panel howto" aria-labelledby="howto-h">
          <h2 id="howto-h">Cómo se juega</h2>
          <ol className="howto-steps">
            <li><span>1</span><div><strong>Qué ha pasado este mes.</strong> Arriba verás qué ocurre en tu vida, la noticia del mercado y cuánto ha cambiado tu inversión.</div></li>
            <li><span>2</span><div><strong>Tu mundo.</strong> Cada mes se levanta una columna con la altura de tu dinero. La bandera marca tu máximo.</div></li>
            <li><span>3</span><div><strong>Qué haces.</strong> Elige una carta. Tienes un tiempo limitado: si no eliges, cuenta como no hacer nada.</div></li>
          </ol>
          <p className="muted small">No hay respuestas correctas ni puntos. Decide como lo harías con tu dinero.</p>
        </section>
      )}
      <section className="panel lesson">
        <p className="lesson-tag">Lección <SpeakButton voiceKey={lesson.voiceKey} text={`${lesson.title}. ${lesson.points.join(' ')}`} label="Escuchar la lección" /></p>
        <h2>{lesson.title}</h2>
        <ol>{lesson.points.map((p) => <li key={p}>{p}</li>)}</ol>
      </section>
      <p className="lead">{level.tagline}</p>
      <button ref={button} className="start" onClick={onStart}>Jugar nivel {level.number}</button>
    </main>
  )
}
