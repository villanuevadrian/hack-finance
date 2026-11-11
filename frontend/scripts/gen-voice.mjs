// Generates the narration audio with ElevenLabs, once, so the demo never depends on a live call (RNF-04).
// Usage (from frontend/):  ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... npm run gen:voice
// Optional: ELEVENLABS_MODEL (default eleven_multilingual_v2), FORCE=1 to regenerate existing files,
// --manifest-only to just record which voice the existing files use (no credits spent).
// Keys must match src/voice/lines.ts. Never commit the API key.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const KEY = process.env.ELEVENLABS_API_KEY
const VOICE = process.env.ELEVENLABS_VOICE_ID
const MODEL = process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2'
// Vega's voice: the SAME settings as backend/behaviorlab/text/tts.py, so pre-recorded and dynamic lines sound
// like the same person. Change both together.
const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true }
const MANIFEST_ONLY = process.argv.includes('--manifest-only')
if ((!KEY && !MANIFEST_ONLY) || !VOICE) {
  console.error('Faltan ELEVENLABS_API_KEY y ELEVENLABS_VOICE_ID (ver .env.example).')
  process.exit(1)
}

const N = JSON.parse(readFileSync(new URL('../src/voice/narration.json', import.meta.url), 'utf8'))
const lines = {}
for (const [k, v] of Object.entries(N.mentor)) lines[`mentor_${k}`] = v
for (const [k, l] of Object.entries(N.lessons)) lines[`lesson_${k}`] = `${l.title}. ${l.points.join(' ')}`
N.life.forEach((e, i) => (lines[`life_${i + 1}`] = `${e.title}. ${e.text}`))
lines.life_raise = `${N.raise.title}. ${N.raise.text}`
for (const [k, list] of Object.entries(N.headlines)) list.forEach((h, i) => (lines[`headline_${k}_${i}`] = h))

const outDir = new URL('../public/audio/', import.meta.url)
mkdirSync(outDir, { recursive: true })
// Which voice the files were made with: the app checks it against the server's voice (GET /config).
writeFileSync(new URL('manifest.json', outDir), JSON.stringify({ voice_id: VOICE, model: MODEL, voice_settings: VOICE_SETTINGS }, null, 2) + '\n')
if (MANIFEST_ONLY) {
  console.log(`manifest.json escrito para la voz ${VOICE}.`)
  process.exit(0)
}
let made = 0
let chars = 0
for (const [key, text] of Object.entries(lines)) {
  const file = new URL(`${key}.mp3`, outDir)
  if (existsSync(file) && !process.env.FORCE) continue
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: VOICE_SETTINGS }),
  })
  if (!res.ok) {
    console.error(`Error ${res.status} en ${key}: ${await res.text()}`)
    process.exit(1)
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  made += 1
  chars += text.length
  console.log(`✓ ${key}`)
}
console.log(`Hecho: ${made} audios nuevos (${chars} caracteres) en public/audio/.`)
