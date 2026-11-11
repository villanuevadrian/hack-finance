import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { VoiceCtx, useVoice } from './context'

/**
 * Voice (RF-11, T2) behind VITE_ENABLE_VOICE. Hybrid:
 *  1. ElevenLabs files from public/audio/<key>.mp3 (generated once with scripts/gen-voice.mjs): best quality,
 *     no cost per game, works offline.
 *  2. If a file is missing, the browser's own Spanish voice reads the same text (free, more robotic, varies by
 *     device). It also reads Vega's chat answers, which cannot be pre-generated.
 * Captions are always on screen. Each line plays by itself only the first time it appears; the 🔊 button
 * replays it. Browsers block sound until the first click on the page: a line blocked that way plays on the
 * first click. The player can mute everything (remembered in this browser).
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

/**
 * The most natural Spanish voice the device has: high-quality voices first (Google's in Chrome, the "enhanced"
 * or "premium" ones of macOS), then any voice from Spain, then any Spanish voice.
 */
function bestSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const es = voices.filter((v) => v.lang.toLowerCase().startsWith('es'))
  const score = (v: SpeechSynthesisVoice) =>
    (/google|premium|enhanced|mejorada|natural|neural/i.test(v.name) ? 4 : 0) + (v.lang === 'es-ES' ? 2 : 0) + (v.localService ? 0 : 1)
  return [...es].sort((a, b) => score(b) - score(a))[0]
}

function browserSpeak(text: string, onStart?: () => void, onBlocked?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'es-ES'
  u.rate = 1.03
  const voice = bestSpanishVoice(synth.getVoices())
  if (voice) u.voice = voice
  u.onstart = () => onStart?.()
  u.onerror = (e) => {
    if (e.error === 'not-allowed') onBlocked?.()
  }
  synth.speak(u)
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(() => ENABLED && readPref())
  const current = useRef<HTMLAudioElement | null>(null)

  const stop = useCallback(() => {
    current.current?.pause()
    current.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  // A line the browser did not let us play yet (no click on the page so far): it plays on the first click.
  const pending = useRef<{ key: string; text?: string } | null>(null)
  const playRef = useRef<(key: string, text?: string) => void>(() => {})

  const block = useCallback((key: string, text?: string) => {
    pending.current = { key, text }
    const resume = () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      const p = pending.current
      pending.current = null
      if (p) playRef.current(p.key, p.text)
    }
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown', resume, { once: true })
  }, [])

  const speak = useCallback((text: string) => {
    if (!ENABLED || !on) return
    stop()
    browserSpeak(text)
  }, [on, stop])

  const play = useCallback(
    (key: string, text?: string) => {
      if (!ENABLED || !on) return
      stop()
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/${key}.mp3`)
      current.current = audio
      // Marked as heard only when it really starts, so a blocked or interrupted line is not lost.
      audio.addEventListener('playing', () => heard.add(key))
      // No file for this line: the browser's voice reads the same text instead.
      audio.addEventListener('error', () => {
        if (current.current === audio && text) browserSpeak(text, () => heard.add(key), () => block(key, text))
      })
      audio.play().catch((e: unknown) => {
        // Autoplay blocked until the user interacts with the page: try again on the first click.
        if (e instanceof DOMException && e.name === 'NotAllowedError') block(key, text)
      })
    },
    [on, stop, block],
  )
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
  return <VoiceCtx.Provider value={value}>{children}</VoiceCtx.Provider>
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
