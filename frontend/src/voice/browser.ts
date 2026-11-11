/**
 * The device's own Spanish voice (Web Speech API): the fallback when ElevenLabs is not available.
 * High-quality voices first (Google's in Chrome, the "enhanced"/"premium" ones of macOS).
 */
export function bestSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const es = voices.filter((v) => v.lang.toLowerCase().startsWith('es'))
  const score = (v: SpeechSynthesisVoice) =>
    (/google|premium|enhanced|mejorada|natural|neural/i.test(v.name) ? 4 : 0) + (v.lang === 'es-ES' ? 2 : 0) + (v.localService ? 0 : 1)
  return [...es].sort((a, b) => score(b) - score(a))[0]
}

export function makeUtterance(text: string): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'es-ES'
  u.rate = 1.0
  const voice = bestSpanishVoice(window.speechSynthesis.getVoices())
  if (voice) u.voice = voice
  return u
}

export const hasBrowserVoice = () => typeof window !== 'undefined' && 'speechSynthesis' in window
