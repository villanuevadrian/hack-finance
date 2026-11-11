import { createContext, useContext } from 'react'

export interface Voice {
  available: boolean
  on: boolean
  toggle: () => void
  /** Plays the ElevenLabs file of `key`; if there is no file, reads `text` with the browser's voice. */
  play: (key: string | undefined, text?: string) => void
  /** Like play, but only the first time this line appears in the session (no repetition when going back). */
  playOnce: (key: string, text?: string) => void
  /** Reads any text with the browser's voice (used for Vega's chat answers). */
  speak: (text: string) => void
  stop: () => void
}

const noop = () => {}
export const VoiceCtx = createContext<Voice>({ available: false, on: false, toggle: noop, play: noop, playOnce: noop, speak: noop, stop: noop })

export const useVoice = () => useContext(VoiceCtx)
