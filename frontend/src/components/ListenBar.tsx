import { useEffect, useRef, useState } from 'react'
import { hasBrowserVoice, makeUtterance } from '../voice/browser'
import { deviceFallbackOn, vegaAudio } from '../voice/engine'
import { useVoice } from '../voice/context'

type Status = 'idle' | 'loading' | 'playing' | 'paused'

/** Only one reading at a time across the whole page. */
let stopCurrent: (() => void) | null = null

/**
 * Accessibility (RF-11): reads a whole piece of content aloud (results, recommendation, profile, round)
 * with play, pause and replay, always in Vega's ElevenLabs voice (voice/engine.ts; the key never reaches the
 * browser). The device's own voice only if the player chose it. Always available, whatever the voice setting.
 */
export function ListenBar({ text, label = 'Escuchar', autoPlay = false, compact = false }: { text: string; label?: string; autoPlay?: boolean; compact?: boolean }) {
  const [status, setStatus] = useState<Status>('idle')
  const [source, setSource] = useState<'elevenlabs' | 'navegador' | 'none' | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const usingBrowser = useRef(false)
  const voice = useVoice()

  function stop() {
    audio.current?.pause()
    audio.current = null
    if (usingBrowser.current && hasBrowserVoice()) window.speechSynthesis.cancel()
    usingBrowser.current = false
    setStatus('idle')
  }

  async function play() {
    stopCurrent?.()
    voice.stop()
    stopCurrent = stop
    setStatus('loading')
    try {
      const { url } = await vegaAudio(undefined, text)
      const a = new Audio(url)
      audio.current = a
      a.onended = () => setStatus('idle')
      await a.play()
      setSource('elevenlabs')
      setStatus('playing')
    } catch {
      // No voice of Vega available: the device's voice only if the player chose it.
      if (!deviceFallbackOn() || !hasBrowserVoice()) {
        setSource('none')
        return setStatus('idle')
      }
      usingBrowser.current = true
      const u = makeUtterance(text)
      u.onend = () => setStatus('idle')
      u.onerror = () => setStatus('idle')
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
      setSource('navegador')
      setStatus('playing')
    }
  }

  function pause() {
    if (usingBrowser.current) window.speechSynthesis.pause()
    else audio.current?.pause()
    setStatus('paused')
  }

  function resume() {
    if (usingBrowser.current) window.speechSynthesis.resume()
    else void audio.current?.play()
    setStatus('playing')
  }

  useEffect(() => {
    if (!autoPlay) return
    const id = window.setTimeout(() => void play(), 250)
    return () => window.clearTimeout(id)
    // autoplay once per text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay])

  useEffect(() => () => {
    if (stopCurrent === stop) stopCurrent = null
    audio.current?.pause()
    if (usingBrowser.current && hasBrowserVoice()) window.speechSynthesis.cancel()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`listen${compact ? ' listen-compact' : ''}`} role="group" aria-label={label}>
      {status === 'playing' ? (
        <button onClick={pause} aria-label={`Pausar: ${label}`}>⏸ Pausar</button>
      ) : status === 'paused' ? (
        <button onClick={resume} aria-label={`Continuar: ${label}`}>▶ Continuar</button>
      ) : (
        <button onClick={() => void play()} disabled={status === 'loading'} aria-label={label}>
          {status === 'loading' ? '… Preparando' : `🔊 ${label}`}
        </button>
      )}
      {status !== 'idle' && status !== 'loading' && (
        <button onClick={() => { stop(); void play() }} aria-label={`Volver a escuchar: ${label}`}>↺</button>
      )}
      {source === 'none' && <span className="listen-src" role="status">La voz de Vega no está disponible ahora mismo</span>}
      {!compact && source && source !== 'none' && <span className="listen-src" aria-live="polite">{source === 'elevenlabs' ? 'Voz de Vega' : 'Voz del dispositivo'}</span>}
    </div>
  )
}
