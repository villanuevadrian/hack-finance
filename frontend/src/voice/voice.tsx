import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { makeUtterance } from './browser'
import { deviceFallbackOn, vegaAudio } from './engine'
import { VoiceCtx, useVoice } from './context'

/**
 * Vega's voice (RF-11) behind VITE_ENABLE_VOICE. Every line goes through voice/engine.ts, so it is always the
 * same ElevenLabs voice: the pre-recorded file when it matches the server's voice, otherwise the server's
 * synthesis. The device's voice is used ONLY if the player chose it (accessibility option). Captions are always
 * on screen. Each line plays by itself only the first time it appears; the 🔊 button replays it. Browsers block
 * sound until the first click: a blocked line plays on the first click. The player can mute everything.
 */
const ENABLED = import.meta.env.VITE_ENABLE_VOICE === 'true'
const STORAGE_KEY = 'behaviorlab.voice'
const heard = new Set<string>()

function readPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

function browserSpeak(text: string, onStart?: () => void, onBlocked?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = makeUtterance(text)
  u.onstart = () => onStart?.()
  u.onerror = (e) => {
    if (e.error === 'not-allowed') onBlocked?.()
  }
  synth.speak(u)
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(() => ENABLED && readPref())
  const current = useRef<HTMLAudioElement | null>(null)
  const playToken = useRef<object | null>(null)

  const stop = useCallback(() => {
    playToken.current = null
    current.current?.pause()
    current.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  // A line the browser did not let us play yet (no click on the page so far): it plays on the first click.
  const pending = useRef<{ key: string; text?: string } | null>(null)
  const playRef = useRef<(key: string | undefined, text?: string) => void>(() => {})

  const block = useCallback((key: string, text?: string) => {
    pending.current = { key, text }
    const resume = () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      const p = pending.current
      pending.current = null
      if (p) playRef.current(p.key || undefined, p.text)
    }
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown', resume, { once: true })
  }, [])

  const [notice, setNotice] = useState<string | null>(null)
  const unavailable = useCallback(() => {
    setNotice('La voz de Vega no está disponible ahora mismo. Tienes el texto en pantalla.')
    window.setTimeout(() => setNotice(null), 4000)
  }, [])

  const play = useCallback(
    (key: string | undefined, text?: string) => {
      if (!ENABLED || !on) return
      stop()
      const token = {}
      playToken.current = token
      void vegaAudio(key, text ?? '')
        .then(({ url }) => {
          if (playToken.current !== token) return // another line started meanwhile
          const audio = new Audio(url)
          current.current = audio
          // Marked as heard only when it really starts, so a blocked or interrupted line is not lost.
          if (key) audio.addEventListener('playing', () => heard.add(key))
          audio.play().catch((e: unknown) => {
            // Autoplay blocked until the user interacts with the page: try again on the first click.
            if (e instanceof DOMException && e.name === 'NotAllowedError') block(key ?? '', text)
          })
        })
        .catch(() => {
          if (playToken.current !== token) return
          if (deviceFallbackOn() && text) browserSpeak(text, () => key && heard.add(key), () => block(key ?? '', text))
          else unavailable()
        })
    },
    [on, stop, block, unavailable],
  )

  const speak = useCallback((text: string) => play(undefined, text), [play])
  useEffect(() => {
    playRef.current = play
  }, [play])

  const playOnce = useCallback((key: string, text?: string) => {
    if (!heard.has(key)) play(key, text)
  }, [play])

  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
      } catch {
        /* private mode: keep it for this session */
      }
      if (!next) {
        current.current?.pause()
        if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ available: ENABLED, on, toggle, play, playOnce, speak, stop }), [on, toggle, play, playOnce, speak, stop])
  return (
    <VoiceCtx.Provider value={value}>
      {children}
      {notice && <p className="voice-notice" role="status">{notice}</p>}
    </VoiceCtx.Provider>
  )
}

/** Small speaker button: replays a line whenever the player wants. Hidden when voice is disabled for the build. */
export function SpeakButton({ voiceKey, text, label = 'Escuchar' }: { voiceKey: string; text?: string; label?: string }) {
  const v = useVoice()
  if (!v.available) return null
  return (
    <button className="speak" onClick={() => v.play(voiceKey, text)} disabled={!v.on} aria-label={label} title={v.on ? label : 'Voz desactivada'}>
      🔊
    </button>
  )
}
