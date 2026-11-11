import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { usePrefersReducedMotion } from '../hooks'
import { useVoice } from '../voice/context'
import { SpeakButton } from '../voice/voice'

/**
 * Vega, the helper in the corner. She speaks only OUTSIDE the measured decisions (welcome, character, world,
 * lessons, between levels, plan) and never comments on how the player decided. She is not shown during the
 * rounds of the game. The player can fold her away at any time.
 */
export function Mentor({ text, voiceKey, screen = '' }: { text: string; voiceKey: string; screen?: string }) {
  const reduced = usePrefersReducedMotion()
  const voice = useVoice()
  // On small screens she starts folded (portrait with a dot) so she does not cover the content.
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 640)
  const [shown, setShown] = useState(reduced ? text.length : 0)

  // Speaks by herself only the first time a line appears; going back does not repeat it (🔊 replays it).
  // Small delay: in development React mounts twice, and the first mount must not cut the line.
  useEffect(() => {
    const id = window.setTimeout(() => voice.playOnce(voiceKey, text), 200)
    return () => {
      window.clearTimeout(id)
      voice.stop()
    }
    // play once per line
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceKey])

  useEffect(() => {
    if (reduced || !open) return
    const id = window.setInterval(() => setShown((n) => (n >= text.length ? n : n + 2)), 18)
    return () => window.clearInterval(id)
  }, [text, reduced, open])

  const done = shown >= text.length
  const [chat, setChat] = useState(false)
  return (
    <aside className="mentor-dock no-print" data-open={open} aria-label="Vega, tu ayudante">
      {open && (
        <div className="mentor-bubble" role="status">
          <p className="mentor-name">
            Vega <SpeakButton voiceKey={voiceKey} text={text} label="Escuchar a Vega" />
            <button className="mentor-fold" onClick={() => setOpen(false)} aria-label="Ocultar a Vega">–</button>
          </p>
          {chat ? (
            <HelpChat screen={screen} />
          ) : (
            <p className="mentor-text" onClick={() => setShown(text.length)}>
              <span aria-hidden="true">{text.slice(0, shown)}{!done && <span className="caret">▍</span>}</span>
              <span className="sr-only">{text}</span>
            </p>
          )}
          <button className="mentor-ask" onClick={() => setChat((c) => !c)}>{chat ? '← Volver' : '💬 Pregúntame'}</button>
        </div>
      )}
      <button className="mentor-avatar" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Ocultar a Vega' : 'Mostrar a Vega'}>
        <MentorPortrait />
        {!open && <span className="mentor-ping" aria-hidden="true" />}
      </button>
    </aside>
  )
}

function MentorPortrait() {
  return (
    <svg className="mentor-portrait" viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <radialGradient id="mbg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#3b2f86" />
          <stop offset="100%" stopColor="#15112f" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#mbg)" stroke="#ffc94a" strokeWidth="2.5" />
      <path d="M18 74c3-14 12-20 22-20s19 6 22 20" fill="#3ddc97" />
      <path d="M30 56l10 8 10-8" fill="none" stroke="#1c7a55" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="36" r="15" fill="#ffd9b8" />
      <path d="M24 34c0-11 8-17 16-17s16 6 16 17c-3-5-8-8-16-8s-13 3-16 8z" fill="#5b3a8f" />
      <rect x="29" y="33" width="22" height="7" rx="3.5" fill="#4cc3ff" />
      <path d="M35 45c3 2.5 7 2.5 10 0" fill="none" stroke="#7a3d2a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const SUGGESTIONS = ['¿Qué es este juego?', '¿Por qué me preguntáis mis ingresos?', '¿Qué es un fondo indexado?', '¿Qué cartera me recomiendas?']

/**
 * Questions to Vega about how the game works. Answers come from the backend (Claude with guardrails, or a fixed
 * FAQ without network). Not available during the rounds: the Mentor is not shown there.
 */
function HelpChat({ screen }: { screen: string }) {
  const voice = useVoice()
  const [q, setQ] = useState('')
  const [log, setLog] = useState<{ q: string; a: string }[]>([])
  const [busy, setBusy] = useState(false)

  async function ask(question: string, e?: FormEvent) {
    e?.preventDefault()
    const text = question.trim()
    if (!text || busy) return
    setBusy(true)
    setQ('')
    try {
      const r = await api.ask(text, screen)
      setLog((l) => [...l, { q: text, a: r.answer }])
      voice.speak(r.answer)
    } catch {
      setLog((l) => [...l, { q: text, a: 'Ahora no puedo responder: mi servidor no tiene todavía la ayuda activada (nucleo-backend.patch).' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="help-chat">
      <div className="help-log" aria-live="polite">
        {log.length === 0 && <p className="help-hint">Pregúntame cómo funciona el juego. No puedo decirte qué decidir.</p>}
        {log.map((m, i) => (
          <div key={i} className="help-pair">
            <p className="help-q">{m.q}</p>
            <p className="help-a">{m.a}</p>
          </div>
        ))}
        {busy && <p className="help-a muted">Pensando…</p>}
      </div>
      {log.length === 0 && (
        <div className="help-sugs">
          {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}
        </div>
      )}
      <form className="help-form" onSubmit={(e) => ask(q, e)}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder="Escribe tu pregunta" aria-label="Tu pregunta para Vega" />
        <button type="submit" disabled={busy || !q.trim()}>Enviar</button>
      </form>
    </div>
  )
}
