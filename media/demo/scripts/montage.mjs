// Montaje de la demo narrada (T-096): cuadros de la captura + voz de Sofía + música de fondo + SRT.
// Entradas: build/capture (frames.jsonl, markers.jsonl, frames/, pacing.json), script.json y, si existen,
// build/voice/manifest.json con un MP3 y su alineación por carácter por escena. Sin clips arma el ensayo en
// silencio con subtítulos estimados. Salidas en build/: demo.mp4 (H.264 1920×1080 30 fps, AAC, pista de
// subtítulos mov_text en español), demo.es.srt (UTF-8) y timeline.json con los tiempos finales por escena.
// Uso: node scripts/montage.mjs [--burn]   (--burn agrega demo-subtitulado.mp4 con subtítulos quemados)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUILD = path.join(ROOT, 'build')
const CAP = path.join(BUILD, 'capture')
const FPS = 30
const W = 1920
const H = 1080
const BG = '0x15171b'
const burn = process.argv.includes('--burn')

const jsonl = (file) => fs.readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'script.json'), 'utf8'))
const pacing = JSON.parse(fs.readFileSync(path.join(CAP, 'pacing.json'), 'utf8'))
const frames = jsonl(path.join(CAP, 'frames.jsonl'))
const markers = jsonl(path.join(CAP, 'markers.jsonl'))
const manifestFile = path.join(BUILD, 'voice', 'manifest.json')
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { clips: [] }
const clipFile = Object.fromEntries(manifest.clips.map((c) => [c.id, path.join(ROOT, c.file)]))

// ---------- Línea de tiempo: capturas menos cortes ----------
const t0 = markers.find((m) => m.type === 'start').t
const tEnd = markers.find((m) => m.type === 'end').t
const cuts = []
for (const m of markers) {
  if (m.type === 'cut-start') cuts.push([m.t, null])
  if (m.type === 'cut-end') cuts.at(-1)[1] = m.t
}
const segments = []
let cursor = t0
let offset = 0
for (const [a, b] of cuts) {
  segments.push({ s: cursor, e: a, o: offset })
  offset += a - cursor
  cursor = b
}
segments.push({ s: cursor, e: tEnd, o: offset })
const total = (offset + tEnd - cursor) / 1000
const toOutput = (t) => {
  for (const seg of segments) {
    if (t < seg.s) return seg.o / 1000
    if (t <= seg.e) return (seg.o + t - seg.s) / 1000
  }
  return total
}
const toCapture = (tau) => {
  const ms = tau * 1000
  for (const seg of segments) if (ms < seg.o + (seg.e - seg.s)) return seg.s + (ms - seg.o)
  return tEnd
}

// ---------- Video: remuestreo a 30 fps con el último cuadro recibido ----------
frames.sort((a, b) => a.t - b.t)
const frameAt = (t) => {
  let lo = 0
  let hi = frames.length - 1
  if (t < frames[0].t) return frames[0]
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (frames[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  return frames[lo]
}
const count = Math.round(total * FPS)
const runs = []
for (let k = 0; k < count; k++) {
  const file = frameAt(toCapture(k / FPS)).file
  if (runs.length && runs.at(-1).file === file) runs.at(-1).n++
  else runs.push({ file, n: 1 })
}
const concat = runs.map((r) => `file 'frames/${r.file}'\nduration ${(r.n / FPS).toFixed(6)}`).join('\n')
  + `\nfile 'frames/${runs.at(-1).file}'\n`
fs.writeFileSync(path.join(CAP, 'concat.txt'), concat)

// ---------- Escenas: inicio de la voz en tiempo de salida ----------
const timeline = []
for (const scene of script.scenes) {
  const mark = markers.find((m) => m.type === 'scene' && m.id === scene.id)
  if (!mark) throw new Error(`Falta la marca de ${scene.id} en la captura`)
  const voiceStart = toOutput(mark.t) + pacing.lead
  const file = clipFile[scene.id]
  let alignment = null
  let voice = pacing.scenes[scene.id].voice
  if (file && fs.existsSync(file)) {
    alignment = JSON.parse(fs.readFileSync(file.replace(/\.mp3$/, '.json'), 'utf8')).alignment
    voice = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { encoding: 'utf8' }).trim())
  }
  timeline.push({ id: scene.id, chapter: scene.chapter, sceneStart: toOutput(mark.t), voiceStart, voice,
    file: file && fs.existsSync(file) ? file : null, alignment, dialogue: scene.dialogue })
}
for (const m of markers.filter((x) => x.type === 'overrun')) console.warn(`aviso: ${m.id} superó el clip por ${m.ms} ms`)

// ---------- Subtítulos ----------
const MAX_LINE = 42
// Divide en dos líneas de hasta 42 caracteres lo más parejas posible; null si no entra en dos líneas.
function wrapLines(text) {
  if (text.length <= MAX_LINE) return text
  const words = text.split(' ')
  let best = null
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    if (a.length <= MAX_LINE && b.length <= MAX_LINE) {
      const score = Math.abs(a.length - b.length)
      if (!best || score < best.score) best = { score, text: `${a}\n${b}` }
    }
  }
  return best?.text ?? null
}
// Agrupa piezas consecutivas mientras el grupo entre en dos líneas.
function pack(parts) {
  const out = []
  let current = ''
  for (const part of parts) {
    const next = current ? `${current} ${part}` : part
    if (current && !wrapLines(next)) { out.push(current); current = part } else current = next
  }
  if (current) out.push(current)
  return out
}
// Cues por oración; si una oración no entra en dos líneas, por comas; si aún no entra, por palabras.
function chunks(text) {
  return text.split(/(?<=[.!?:])\s+/).flatMap((sentence) => {
    if (wrapLines(sentence)) return [sentence]
    return pack(sentence.split(/(?<=,)\s+/)).flatMap((piece) => (wrapLines(piece) ? [piece] : pack(piece.split(' '))))
  })
}
function wrap(text) {
  const lines = wrapLines(text)
  if (!lines) throw new Error(`Subtítulo demasiado largo: ${text}`)
  return lines
}
const cues = []
for (const scene of timeline) {
  let from = 0
  for (const chunk of chunks(scene.dialogue)) {
    const start = scene.dialogue.indexOf(chunk, from)
    const end = start + chunk.length - 1
    from = end + 1
    let a
    let b
    if (scene.alignment) {
      a = scene.alignment.character_start_times_seconds[start]
      b = scene.alignment.character_end_times_seconds[end]
    } else {
      a = (start / scene.dialogue.length) * scene.voice
      b = ((end + 1) / scene.dialogue.length) * scene.voice
    }
    cues.push({ start: scene.voiceStart + a, end: scene.voiceStart + b + 0.3, text: wrap(chunk) })
  }
}
for (let i = 0; i < cues.length; i++) {
  const next = cues[i + 1]
  if (cues[i].end - cues[i].start < 1.0) cues[i].end = cues[i].start + 1.0
  if (next && cues[i].end > next.start - 0.05) cues[i].end = next.start - 0.05
  if (cues[i].end > total) cues[i].end = total
  if (cues[i].end <= cues[i].start) throw new Error(`Cue sin duración: ${cues[i].text}`)
}
const stamp = (s) => {
  const ms = Math.round(s * 1000)
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}
const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n')
fs.writeFileSync(path.join(BUILD, 'demo.es.srt'), srt, 'utf8')

// ---------- Audio: voz + música atenuada bajo la voz ----------
execFileSync('node', [path.join(ROOT, 'scripts', 'make-music.mjs'), String(Math.ceil(total) + 1),
  path.join(BUILD, 'music.wav')], { stdio: 'inherit' })
const voiced = timeline.filter((s) => s.file)
const inputs = ['-f', 'concat', '-safe', '0', '-i', path.join(CAP, 'concat.txt'), '-i', path.join(BUILD, 'music.wav')]
for (const s of voiced) inputs.push('-i', s.file)
const filters = [
  `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${BG},`
    + `fps=${FPS},format=yuv420p[v]`,
]
if (voiced.length) {
  voiced.forEach((s, i) => {
    const ms = Math.round(s.voiceStart * 1000)
    filters.push(`[${i + 2}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[a${i}]`)
  })
  filters.push(`${voiced.map((_, i) => `[a${i}]`).join('')}amix=inputs=${voiced.length}:normalize=0:dropout_transition=0,`
    + `apad,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11,asplit=2[voice][key]`)
  filters.push(`[1:a]aresample=48000,atrim=0:${total.toFixed(3)},volume=-13dB[bed]`)
  filters.push('[bed][key]sidechaincompress=threshold=0.015:ratio=5:attack=60:release=700:makeup=1[ducked]')
  filters.push('[voice][ducked]amix=inputs=2:normalize=0,alimiter=limit=0.89[a]')
} else {
  filters.push(`[1:a]aresample=48000,atrim=0:${total.toFixed(3)},volume=-13dB,alimiter=limit=0.89[a]`)
}
const out = path.join(BUILD, 'demo.mp4')
const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit', cwd: BUILD })
ffmpeg([...inputs, '-i', path.join(BUILD, 'demo.es.srt'), '-filter_complex', filters.join(';'),
  '-map', '[v]', '-map', '[a]', '-map', `${voiced.length + 2}:s`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k',
  '-c:s', 'mov_text', '-metadata:s:s:0', 'language=spa', '-metadata:s:s:0', 'title=Español',
  '-metadata', `title=${script.title}`, '-t', total.toFixed(3), '-movflags', '+faststart', out])
if (burn) {
  ffmpeg(['-i', 'demo.mp4', '-vf', "subtitles=demo.es.srt:charenc=UTF-8:force_style='FontName=Segoe UI,FontSize=22,"
    + "Outline=1.2,Shadow=0,BorderStyle=3,BackColour=&H90000000,MarginV=34'", '-map', '0:v', '-map', '0:a',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'copy', '-movflags', '+faststart', 'demo-subtitulado.mp4'])
}
fs.writeFileSync(path.join(BUILD, 'timeline.json'), JSON.stringify({
  total, fps: FPS, cuts: cuts.map(([a, b]) => ({ at: toOutput(a), removed: (b - a) / 1000 })),
  scenes: timeline.map(({ alignment, dialogue, file, ...s }) => ({ ...s, file: file && path.relative(ROOT, file) })),
  cues: cues.length,
}, null, 1))
console.log(`ok ${out} duración=${total.toFixed(2)}s escenas=${timeline.length} con_voz=${voiced.length} cues=${cues.length}`)
