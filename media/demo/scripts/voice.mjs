// Voz de Sofía para la demo narrada (T-096) con ElevenLabs.
// La clave llega solo por la variable de entorno ELEVENLABS_API_KEY del proceso local; nunca se imprime ni se escribe.
// Uso (desde media/demo):
//   node scripts/voice.mjs check    → nombre de la voz, plan y saldo de caracteres (sin consumir caracteres)
//   node scripts/voice.mjs sample   → muestra corta en build/voice/sample.mp3
//   node scripts/voice.mjs clips    → un clip por escena de script.json, con caché por texto, voz y ajustes
//   node scripts/voice.mjs plan     → caracteres pendientes según la caché, sin red
// Cada clip guarda el MP3 y la alineación por carácter (JSON) que usa el montaje para los subtítulos.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VOICE_ID = 'h60rOzgfLmYsntfqgGu2'
const EXPECTED_NAME = /sof[ií]a/i
const MODEL = 'eleven_multilingual_v2'
const SETTINGS = { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1.0 }
const FORMAT = 'mp3_44100_128'
const API = 'https://api.elevenlabs.io/v1'
const OUT = path.join(ROOT, 'build', 'voice')
const SAMPLE = 'Hola, soy Sofía. Te muestro devnotes en un recorrido completo.'

const command = process.argv[2]
const script = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'script.json'), 'utf8'))
const key = () => {
  const value = process.env.ELEVENLABS_API_KEY
  if (!value) {
    console.error('Falta ELEVENLABS_API_KEY en el entorno de este proceso.')
    process.exit(3)
  }
  return value
}
const digest = (text) =>
  createHash('sha256').update(JSON.stringify({ text, VOICE_ID, MODEL, SETTINGS, FORMAT })).digest('hex').slice(0, 16)

async function api(pathname, init = {}) {
  const response = await fetch(API + pathname, {
    ...init,
    headers: { 'xi-api-key': key(), 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!response.ok) {
    // El cuerpo de error de ElevenLabs no incluye la clave; se resume para no volcar datos de la cuenta.
    let detail = ''
    try {
      const body = await response.json()
      detail = body?.detail?.status ?? body?.detail?.code ?? ''
    } catch {}
    throw new Error(`ElevenLabs ${pathname.split('?')[0]} → HTTP ${response.status} ${detail}`.trim())
  }
  return response.json()
}

async function check() {
  const voice = await api(`/voices/${VOICE_ID}`)
  const sub = await api('/user/subscription')
  const remaining = sub.character_limit - sub.character_count
  const pending = plan(false)
  console.log(JSON.stringify({
    voiceId: VOICE_ID,
    voiceName: voice.name,
    voiceCategory: voice.category ?? null,
    matchesSofia: EXPECTED_NAME.test(voice.name ?? ''),
    tier: sub.tier,
    characterLimit: sub.character_limit,
    characterCount: sub.character_count,
    remaining,
    pendingCharacters: pending,
    enough: remaining >= pending,
  }, null, 2))
  if (!EXPECTED_NAME.test(voice.name ?? '')) process.exit(4)
}

async function synthesize(text, base) {
  const result = await api(`/text-to-speech/${VOICE_ID}/with-timestamps?output_format=${FORMAT}`, {
    method: 'POST',
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS, language_code: 'es' }),
  })
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(base + '.mp3', Buffer.from(result.audio_base64, 'base64'))
  fs.writeFileSync(base + '.json', JSON.stringify({ text, voiceId: VOICE_ID, model: MODEL, settings: SETTINGS,
    alignment: result.alignment ?? result.normalized_alignment }, null, 1))
}

function plan(print = true) {
  let pending = 0
  const missing = []
  for (const scene of script().scenes) {
    const base = path.join(OUT, `${scene.id}-${digest(scene.dialogue)}`)
    if (!fs.existsSync(base + '.mp3') || !fs.existsSync(base + '.json')) {
      pending += scene.dialogue.length
      missing.push(scene.id)
    }
  }
  if (print) console.log(JSON.stringify({ pendingCharacters: pending, missing }, null, 2))
  return pending
}

async function clips() {
  const scenes = script().scenes
  const manifest = []
  for (const scene of scenes) {
    const base = path.join(OUT, `${scene.id}-${digest(scene.dialogue)}`)
    if (!fs.existsSync(base + '.mp3') || !fs.existsSync(base + '.json')) {
      try {
        await synthesize(scene.dialogue, base)
        console.log(`generado ${scene.id} (${scene.dialogue.length} caracteres)`)
      } catch (error) {
        console.error(`detenido en ${scene.id}: ${error.message}. Retomar con «node scripts/voice.mjs clips».`)
        process.exit(5)
      }
    } else console.log(`reusado ${scene.id}`)
    manifest.push({ id: scene.id, file: path.relative(ROOT, base + '.mp3').split(path.sep).join('/') })
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ voiceId: VOICE_ID, model: MODEL, clips: manifest }, null, 1))
  console.log(`ok ${manifest.length} clips`)
}

switch (command) {
  case 'check': await check(); break
  case 'sample': await synthesize(SAMPLE, path.join(OUT, 'sample')); console.log(`ok ${path.join(OUT, 'sample.mp3')}`); break
  case 'clips': await clips(); break
  case 'plan': plan(); break
  default:
    console.error('Uso: node scripts/voice.mjs check|sample|clips|plan')
    process.exit(2)
}
