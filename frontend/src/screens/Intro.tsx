import { useEffect, useRef, useState } from 'react'
import { HeroScene } from '../components/HeroScene'
import { Mentor } from '../components/Mentor'
import { WorldThumb } from '../components/WorldMap'
import { MISSION } from '../life'
import { N } from '../voice/lines'
import { WORLDS } from '../worlds'
import type { Prefs } from '../prefs'

const WORLD_GOAL = { city: 'purchase', forest: 'retirement', fortress: 'emergency_fund', peaks: 'long_term_growth' } as const

/**
 * Welcome screen: an animated hero with one clear call to action. The consent (CUESTIONARIO.md §3) opens in a
 * dialog before playing, so it is read at the right moment instead of at the bottom of a long page.
 */
export function Intro({ onStart, busy, error, prefs, onPrefs, resume }: {
  onStart: () => void; busy: boolean; error: string | null; prefs: Prefs; onPrefs: (p: Prefs) => void
  /** A game left half-way in this browser. */
  resume?: { round: number; total: number; onResume: () => void } | null
}) {
  const [askConsent, setAskConsent] = useState(false)
  return (
    <main className="intro2" id="contenido">
      {resume && (
        <section className="panel resume-card" aria-live="polite">
          <div>
            <p className="kicker">Tienes una partida a medias</p>
            <p>Vas por el mes {resume.round} de {resume.total}. Termínala para que tu perfil sea más fiable.</p>
          </div>
          <button className="start" onClick={resume.onResume} disabled={busy}>Continuar mi partida</button>
        </section>
      )}
      <section className="hero">
        <div className="hero-text">
          <p className="hero-chips">
            <span>⏱ Unos 10 minutos</span>
            <span>📅 15 meses de mercado</span>
            <span>🗺️ 3 niveles</span>
          </p>
          <h1 className="hero-title">Un año<br />en los <span className="shine">mercados</span></h1>
          <p className="lead">Crea tu yo inversor, vive quince meses de mercado con dinero simulado y descubre qué riesgo eres capaz de mantener de verdad.</p>
          <div className="hero-cta">
            <button className="start start-xl" onClick={() => setAskConsent(true)}>Empezar mi aventura</button>
            <a className="ghost" href="#como-funciona">Cómo funciona</a>
          </div>
          <p className="muted small">Sin nombre ni datos identificativos. No es asesoramiento financiero.</p>
        </div>
        <div className="hero-art"><HeroScene /></div>
      </section>

      <section id="como-funciona" className="steps3" aria-label="Cómo funciona">
        <article className="step3">
          <span className="step3-n">1</span>
          <span className="step3-ico" aria-hidden="true">🧑‍🚀</span>
          <h3>Crea tu yo inversor</h3>
          <p>Tu situación y tus objetivos, en preguntas cerradas. Tu misión decide tu mundo.</p>
        </article>
        <article className="step3">
          <span className="step3-n">2</span>
          <span className="step3-ico" aria-hidden="true">⛈️</span>
          <h3>Recorre tu mundo</h3>
          <p>Caídas, subidas de sueldo y recuperación. Decide como lo harías con tu dinero.</p>
        </article>
        <article className="step3">
          <span className="step3-n">3</span>
          <span className="step3-ico" aria-hidden="true">🎯</span>
          <h3>Recibe tu plan</h3>
          <p>La cartera que eres capaz de mantener, explicada, y qué habría pasado con otras decisiones.</p>
        </article>
      </section>

      <section className="worlds2" aria-labelledby="worlds-h">
        <h2 id="worlds-h">Cuatro mundos. Tu misión decide el tuyo.</h2>
        <div className="world-cards2">
          {(['city', 'forest', 'fortress', 'peaks'] as const).map((k) => {
            const w = WORLDS[k]
            const m = MISSION[WORLD_GOAL[k]]
            return (
              <article key={k} className="world-card2" style={{ ['--wc' as string]: w.accent }}>
                <WorldThumb world={w} />
                <div className="wc2-body">
                  <h3>{w.name}</h3>
                  <p className="small"><span aria-hidden="true">{m.icon}</span> {m.text}</p>
                  <p className="muted small">{w.tagline}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <Mentor screen="intro" text={N.mentor.intro} voiceKey="mentor_intro" />
      {askConsent && <ConsentDialog busy={busy} error={error} onStart={onStart} onClose={() => setAskConsent(false)} prefs={prefs} onPrefs={onPrefs} />}
    </main>
  )
}

function ConsentDialog({ busy, error, onStart, onClose, prefs, onPrefs }: { busy: boolean; error: string | null; onStart: () => void; onClose: () => void; prefs: Prefs; onPrefs: (p: Prefs) => void }) {
  const [accepted, setAccepted] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal panel" role="dialog" aria-modal="true" aria-labelledby="consent-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="consent-h">Antes de empezar</h2>
        <ul className="notice consent-text">
          <li>Este juego también es tu evaluación de idoneidad: lo que respondas y decidas sirve, de verdad, para conocer qué inversión encaja contigo.</li>
          <li>En la partida no hay respuestas buenas ni malas, ni puntuación. Decide como lo harías con tu dinero.</li>
          <li>Los escenarios son simulados. Rentabilidades pasadas no garantizan rentabilidades futuras.</li>
          <li>Usaremos tus respuestas para elaborar tu perfil de inversor (RGPD, art. 22: elaboración de perfiles). Puedes pedir revisión humana de tu resultado.</li>
        </ul>
        <fieldset className="a11y-opts">
          <legend>Accesibilidad (opcional)</legend>
          <label className="consent">
            <input type="checkbox" checked={prefs.moreTime} onChange={(e) => onPrefs({ ...prefs, moreTime: e.target.checked })} />
            <span className="toggle" aria-hidden="true" />
            <span>Necesito más tiempo para leer y decidir (el doble). Quedará anotado en tu partida.</span>
          </label>
          <label className="consent">
            <input type="checkbox" checked={prefs.listen} onChange={(e) => onPrefs({ ...prefs, listen: e.target.checked })} />
            <span className="toggle" aria-hidden="true" />
            <span>Prefiero escuchar: leer en voz alta lo que pasa cada mes.</span>
          </label>
          <label className="consent">
            <input type="checkbox" checked={prefs.deviceVoice} onChange={(e) => onPrefs({ ...prefs, deviceVoice: e.target.checked })} />
            <span className="toggle" aria-hidden="true" />
            <span>Si la voz de Vega no está disponible, leer con la voz de mi dispositivo.</span>
          </label>
        </fieldset>
        <label className="consent">
          <input ref={first} type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span className="toggle" aria-hidden="true" />
          <span>Doy mi consentimiento para que se elabore mi perfil con mis respuestas.</span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="creation-nav">
          <button className="start" disabled={!accepted || busy} onClick={onStart}>{busy ? 'Cargando…' : 'Empezar partida'}</button>
          <button className="ghost" onClick={onClose}>Volver</button>
        </div>
      </section>
    </div>
  )
}
