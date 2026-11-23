// Guion legible de la demo (T-096) desde script.json. Agrega el tiempo previsto de cada escena y, si existe
// build/timeline.json del último montaje, el inicio y la duración real de la voz en el video final.
// Uso: node scripts/guion.mjs   → escribe GUION.md
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'script.json'), 'utf8'))
const timelineFile = path.join(ROOT, 'build', 'timeline.json')
const timeline = fs.existsSync(timelineFile) ? JSON.parse(fs.readFileSync(timelineFile, 'utf8')) : null
const final = Object.fromEntries((timeline?.scenes ?? []).map((s) => [s.id, s]))
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const cell = (text) => String(text).replace(/\|/g, '\\|')

const lines = [
  `# Guion · ${script.title}`,
  '',
  'Generado con `node scripts/guion.mjs` desde [`script.json`](script.json), que es la fuente editable. '
    + `Voz: ${script.voice.name} (${script.voice.provider}, \`${script.voice.id}\`). `
    + `Cada escena arranca con ${script.lead} s de acción antes de la voz y termina con su pausa. `
    + 'El tiempo previsto estima 14,5 caracteres por segundo. Las columnas finales salen del último montaje.',
  '',
]
for (const chapter of script.chapters) {
  lines.push(`## ${chapter.id} · ${chapter.title}`, '', chapter.description + '.', '')
  lines.push('| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |')
  lines.push('|---|---|---|---|---|---|---|---|---|')
  for (const scene of script.scenes.filter((s) => s.chapter === chapter.id)) {
    const expected = script.lead + scene.dialogue.length / 14.5 + scene.pause
    const done = final[scene.id]
    lines.push(`| ${scene.id} | ${cell(scene.route)} | ${cell(scene.gesture)} | ${cell(scene.dialogue)} | ${cell(scene.result)} | `
      + `${scene.pause} s | ${expected.toFixed(1)} s | ${done ? clock(done.voiceStart) : '—'} | `
      + `${done?.file ? done.voice.toFixed(1) + ' s' : '—'} |`)
  }
  lines.push('')
}
if (timeline) lines.push(`Duración final del video: ${clock(timeline.total)} (${timeline.total.toFixed(2)} s), ${timeline.cues} subtítulos.`, '')
fs.writeFileSync(path.join(ROOT, 'GUION.md'), lines.join('\n'))
console.log(`ok ${path.join(ROOT, 'GUION.md')}`)
