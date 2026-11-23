// Ritmo de la captura (T-096): duración de voz y pausa por escena para e2e/tests/demo-tour.spec.ts.
// Con clips de voz usa su duración real (ffprobe); sin clip, una estimación de 14,5 caracteres por segundo
// (ensayo en silencio). Escribe build/pacing.json e informa cuántas escenas son estimadas.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'script.json'), 'utf8'))
const manifestFile = path.join(ROOT, 'build', 'voice', 'manifest.json')
const clips = fs.existsSync(manifestFile)
  ? Object.fromEntries(JSON.parse(fs.readFileSync(manifestFile, 'utf8')).clips.map((c) => [c.id, c.file]))
  : {}
const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
    path.join(ROOT, file)], { encoding: 'utf8' }).trim())

const scenes = {}
let estimated = 0
for (const scene of script.scenes) {
  const file = clips[scene.id]
  const voice = file && fs.existsSync(path.join(ROOT, file)) ? duration(file) : scene.dialogue.length / 14.5
  if (!file) estimated++
  scenes[scene.id] = { voice: Number(voice.toFixed(3)), pause: scene.pause, source: file ? 'clip' : 'estimate' }
}
const out = path.join(ROOT, 'build', 'pacing.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ lead: script.lead, scenes }, null, 1))
const total = Object.values(scenes).reduce((sum, s) => sum + script.lead + s.voice + s.pause, 0)
console.log(`ok ${out} escenas=${script.scenes.length} estimadas=${estimated} voz+pausas=${total.toFixed(1)}s`)
