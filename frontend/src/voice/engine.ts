import { api } from '../api/client'

/**
 * One voice for Vega everywhere. Every spoken line goes through here:
 *  1. Pre-recorded ElevenLabs file (public/audio/<key>.mp3), ONLY if it was made with the same voice the
 *     server uses (public/audio/manifest.json against GET /config), or the server has no voice.
 *  2. Otherwise, ElevenLabs through the backend (POST /tts, key only on the server, cached there).
 *  3. The device's own voice ONLY if the player turned that option on (accessibility); never by accident.
 * If none is possible, the line is not spoken and the text stays on screen.
 */
export type VoiceSource = 'file' | 'server' | 'device'

const BASE = import.meta.env.BASE_URL
const state = {
  serverTts: false,
  serverVoice: null as string | null,
  fileVoice: undefined as string | null | undefined,
  deviceFallback: false,
}
const blobs = new Map<string, string>()
const fileOk = new Map<string, boolean>()

export function configureVoice(p: Partial<typeof state>): void {
  Object.assign(state, p)
}

export const deviceFallbackOn = () => state.deviceFallback

export async function loadVoiceManifest(): Promise<void> {
  try {
    const r = await fetch(`${BASE}audio/manifest.json`)
    const type = r.headers.get('content-type') ?? ''
    state.fileVoice = r.ok && type.includes('json') ? ((await r.json()) as { voice_id?: string }).voice_id ?? null : null
  } catch {
    state.fileVoice = null
  }
}

/** Files are Vega's voice if the server has no voice, or if both were made with the same voice. */
export function filesAreVega(): boolean {
  if (!state.serverTts) return true
  return Boolean(state.fileVoice) && state.fileVoice === state.serverVoice
}

async function fileExists(url: string): Promise<boolean> {
  if (fileOk.has(url)) return fileOk.get(url)!
  try {
    const r = await fetch(url, { method: 'HEAD' })
    const ok = r.ok && (r.headers.get('content-type') ?? '').includes('audio')
    fileOk.set(url, ok)
    return ok
  } catch {
    return false
  }
}

export class VoiceUnavailableError extends Error {}

/** URL of the audio of a line in Vega's voice. Throws VoiceUnavailableError if there is none. */
export async function vegaAudio(key: string | undefined, text: string): Promise<{ url: string; source: VoiceSource }> {
  if (key && filesAreVega()) {
    const url = `${BASE}audio/${key}.mp3`
    if (await fileExists(url)) return { url, source: 'file' }
  }
  if (state.serverTts && text.trim()) {
    let url = blobs.get(text)
    if (!url) {
      try {
        url = URL.createObjectURL(await api.tts(text))
      } catch {
        throw new VoiceUnavailableError('server tts failed')
      }
      blobs.set(text, url)
    }
    return { url, source: 'server' }
  }
  throw new VoiceUnavailableError('no voice for this line')
}
