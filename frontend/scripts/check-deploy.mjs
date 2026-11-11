/* eslint-disable no-unused-expressions -- ternaries used as compact "check: ok or fail" statements */
// Checks a real deployment, end to end, from your computer (Node 20+):
//   node scripts/check-deploy.mjs https://tu-api.onrender.com https://tu-web.vercel.app
// It does not change anything except creating one test game. Exit code 1 if any check fails.
const [API, WEB] = process.argv.slice(2).map((u) => u?.replace(/\/+$/, ''))
if (!API || !WEB) {
  console.error('Uso: node scripts/check-deploy.mjs <URL de la API> <URL de la web>')
  process.exit(1)
}
let failed = 0
const ok = (msg) => console.log(`✓ ${msg}`)
const bad = (msg, hint) => { failed += 1; console.log(`✗ ${msg}${hint ? `\n    → ${hint}` : ''}`) }
const warn = (msg) => console.log(`! ${msg}`)
const j = async (path, init) => {
  const r = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init })
  return { status: r.status, body: r.headers.get('content-type')?.includes('json') ? await r.json() : null, res: r }
}

try {
  const h = await j('/health')
  h.status === 200 ? ok('La API responde') : bad(`La API no responde (${h.status})`, 'Mira los Logs de Render')
} catch (e) {
  bad('No se puede conectar con la API', `¿Está bien la URL? ¿Render está desplegado? (${e.message})`)
  process.exit(1)
}

const { body: cfg } = await j('/config')
if (!cfg || !('storage' in cfg)) bad('/config no tiene los campos nuevos', 'Render no está desplegando la última versión del backend')
else {
  cfg.storage === 'postgres' ? ok('Base de datos: PostgreSQL (los datos sobreviven a reinicios)')
    : cfg.storage === 'disk' ? warn('Datos en disco: en Render gratuito se pierden al reiniciar. Configura DATABASE_URL')
      : bad('Datos solo en memoria: se pierden al reiniciar', 'Añade DATABASE_URL en Render (PostgreSQL)')
  cfg.assistant_uses_claude ? ok('ANTHROPIC_API_KEY configurada') : bad('Falta ANTHROPIC_API_KEY en Render')
  cfg.tts_available ? ok(`ElevenLabs configurado (voz ${cfg.tts_voice_id})`) : bad('Falta ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ID en Render')
}

const chat = await j('/assistant', { method: 'POST', body: JSON.stringify({ question: '¿Qué diferencia hay entre ahorrar e invertir?', screen: 'check' }) })
if (chat.status !== 200) bad(`Vega no responde (${chat.status})`)
else if (chat.body.source === 'claude') ok(`Vega responde con Claude: "${chat.body.answer.slice(0, 70)}…"`)
else bad('Vega responde, pero SIN Claude (respuestas básicas)', 'La clave de Anthropic no es válida, no tiene crédito o el modelo no está disponible: revisa la clave y los Logs')

const tts = await fetch(`${API}/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hola, soy Vega.' }) })
const audio = tts.ok ? await tts.arrayBuffer() : null
tts.ok && (tts.headers.get('content-type') ?? '').includes('audio') && audio.byteLength > 1000
  ? ok(`ElevenLabs genera audio (${Math.round(audio.byteLength / 1024)} kB)`)
  : bad(`La voz de Vega no funciona en el servidor (${tts.status})`, 'Revisa la clave y el Voice ID de ElevenLabs (voz "premade" en el plan gratuito) y tus créditos')

const hl = await j('/headlines')
hl.body?.source === 'claude' ? ok('Titulares generados con Claude') : warn('Titulares de plantilla (opcional: generar la caché con Claude)')

const cors = await fetch(`${API}/health`, { headers: { Origin: WEB } })
cors.headers.get('access-control-allow-origin') === WEB ? ok('La API acepta peticiones de la web (CORS)')
  : bad('La API rechaza las peticiones de la web (CORS)', `En Render, BEHAVIORLAB_CORS_ORIGINS debe ser exactamente ${WEB}`)

const web = await fetch(WEB)
const html = web.ok ? await web.text() : ''
html.includes('id="root"') ? ok('La web carga') : bad(`La web no carga (${web.status})`, 'Revisa el despliegue de Vercel (Root Directory: frontend)')
const man = await fetch(`${WEB}/audio/manifest.json`)
if (man.ok && (man.headers.get('content-type') ?? '').includes('json')) {
  const m = await man.json()
  !cfg?.tts_voice_id || m.voice_id === cfg.tts_voice_id ? ok('Los audios grabados usan la misma voz que el servidor')
    : bad('Los audios grabados usan OTRA voz que el servidor', 'Usa el mismo ELEVENLABS_VOICE_ID en Render y en el script de voces (la web usará la del servidor)')
} else warn('Sin public/audio/manifest.json: la web usará la voz del servidor para todo (correcto, pero gasta créditos)')

// One complete game through the API.
const answers = {
  consent: true, education: 'university', occupation: 'employee', known_products: ['index_funds_etf'], invested_products: [],
  trading_frequency: 'yearly', invested_volume: 'lt_3k', quiz_risk: 'single_stock', quiz_recovery: 'p100', quiz_guarantee: 'false',
  income: '1800_2500', income_source: 'permanent', monthly_saving: '100_300', financial_wealth: '5k_20k', fixed_commitments: 'lt_20',
  emergency_months: '3_6', share_invested: 'lt_25', amount_eur: 3000, goal: 'long_term_growth', horizon: 'gt_7',
  return_preference: 'minus15_plus6', stated_reaction: 'wait',
}
let { body: s } = await j('/games', { method: 'POST', body: JSON.stringify({ answers }) })
if (!s?.game_id) bad('No se puede crear una partida')
else {
  while (!s.finished) {
    const a = ['hold', 'stay_out', 'invest_raise_50'].find((x) => s.available_actions.includes(x)) ?? s.available_actions[0]
    s = (await j(`/games/${s.game_id}/decision`, { method: 'POST', body: JSON.stringify({ action: a, response_time_ms: 2000 }) })).body
  }
  const [p, pr, cf] = await Promise.all(['profile', 'proposal', 'counterfactuals'].map((x) => j(`/games/${s.game_id}/${x}`)))
  p.status === 200 && pr.status === 200 ? ok(`Partida completa: propuesta ${pr.body.portfolio_name}, confianza ${p.body.reliability}`) : bad('Fallan el perfil o la propuesta')
  cf.status === 200 ? ok('La revelación funciona') : bad('La revelación no funciona', 'Backend desactualizado')
  const ctx = await j('/assistant', { method: 'POST', body: JSON.stringify({ question: '¿Por qué me proponéis esta cartera?', screen: 'plan', game_id: s.game_id }) })
  ctx.status === 200 && ctx.body.answer.includes(pr.body.portfolio_name.replace('Cartera ', ''))
    ? ok('Vega explica la propuesta con los datos de la partida') : warn('Vega respondió sin mencionar la cartera propuesta: revisa la respuesta a mano')
  const list = await j('/games')
  list.body?.some((g) => g.game_id === s.game_id) ? ok('La partida aparece en el portal de la entidad') : bad('La partida no aparece en GET /games')
  console.log(`  (partida de prueba: ${s.game_id})`)
}

console.log(failed ? `\n${failed} comprobaciones fallidas.` : '\nTodo correcto.')
process.exit(failed ? 1 : 0)
