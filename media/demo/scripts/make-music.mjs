// Música de fondo de la demo narrada (T-096) como WAV determinista.
// Misma armonía (Am–F–C–G), semilla y timbres que la banda del tráiler v2 (media/trailer-v2), pero más lenta,
// sin golpes de batería marcados ni efectos: pads cálidos, bajo sostenido, arpegio suave con eco y un pulso
// muy leve que entra y sale por secciones para sostener la atención sin competir con la voz.
// Uso: node scripts/make-music.mjs <segundos> [salida.wav]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DUR = Number(process.argv[2])
if (!Number.isFinite(DUR) || DUR < 10 || DUR > 3600) {
  console.error('Uso: node scripts/make-music.mjs <segundos entre 10 y 3600> [salida.wav]')
  process.exit(2)
}
const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.resolve(process.argv[3] ?? path.join(here, '..', 'build', 'music.wav'))

const sr = 44100
const N = Math.ceil(sr * DUR)
const TAU = Math.PI * 2
const BPM = 96
const BEAT = 60 / BPM
const BAR = BEAT * 4
const L = new Float32Array(N)
const R = new Float32Array(N)
const AL = new Float32Array(N)
const AR = new Float32Array(N)

let seed = 1337
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}
const add = (l, r, i, v, pan = 0) => {
  if (i < 0 || i >= N) return
  l[i] += v * (1 - Math.max(0, pan))
  r[i] += v * (1 + Math.min(0, pan))
}
const lpCoef = (fc) => 1 - Math.exp((-TAU * Math.min(fc, sr * 0.45)) / sr)
const saw = (p) => 2 * (p - Math.floor(p)) - 1

function pad(t0, dur, freqs, amp, fc0, fc1) {
  const i0 = Math.round(t0 * sr)
  const att = Math.min(1.2, dur * 0.4)
  const rel = 1.4
  const n = Math.round((dur + rel) * sr)
  freqs.forEach((f, k) => {
    ;[-0.005, 0, 0.005].forEach((det, d) => {
      let p = rnd()
      let lp = 0
      let lp2 = 0
      const pan = (d - 1) * 0.55 + (k % 2 ? 0.12 : -0.12)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        p += (f * (1 + det)) / sr
        const x = Math.min(1, t / dur)
        const fc = fc0 + (fc1 - fc0) * Math.sin(x * Math.PI)
        lp += lpCoef(fc) * (saw(p) - lp)
        lp2 += lpCoef(fc * 1.3) * (lp - lp2)
        const env = Math.min(1, t / att) * Math.min(1, (n - i) / (rel * sr))
        add(L, R, i0 + i, lp2 * env * amp, pan)
      }
    })
  })
}
function bass(t0, f, dur, amp) {
  const i0 = Math.round(t0 * sr)
  const n = Math.round((dur + 0.3) * sr)
  let p = 0
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    p += f / sr
    const osc = Math.sin(TAU * p) + 0.25 * saw(p)
    lp += lpCoef(220) * (osc - lp)
    const env = Math.min(1, t / 0.25) * Math.min(1, (n - i) / (0.3 * sr))
    add(L, R, i0 + i, lp * env * amp)
  }
}
function pluck(t0, f, amp, pan) {
  const i0 = Math.round(t0 * sr)
  const n = Math.round(0.9 * sr)
  let p1 = 0
  let p2 = 0
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    p1 += (f * 1.003) / sr
    p2 += (f * 0.997) / sr
    const osc = Math.sin(TAU * p1) * 0.8 + saw(p2) * 0.35
    lp += lpCoef(700 + 2600 * Math.exp(-t * 9)) * (osc - lp)
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 4.2)
    add(AL, AR, i0 + i, lp * env * amp, pan)
  }
}
function softKick(t0, amp) {
  const i0 = Math.round(t0 * sr)
  let ph = 0
  for (let i = 0; i < 0.35 * sr; i++) {
    const t = i / sr
    ph += (TAU * (48 + 60 * Math.exp(-t * 25))) / sr
    add(L, R, i0 + i, Math.sin(ph) * Math.exp(-t * 11) * amp)
  }
}
function shaker(t0, amp, pan) {
  const i0 = Math.round(t0 * sr)
  let lp = 0
  for (let i = 0; i < 0.09 * sr; i++) {
    const t = i / sr
    const n = rnd() * 2 - 1
    lp += 0.3 * (n - lp)
    const env = Math.min(1, t / 0.012) * Math.exp(-t * 45)
    add(L, R, i0 + i, (n - lp) * env * amp, pan)
  }
}

const CH = {
  Am: { root: 55.0, tones: [220.0, 261.63, 329.63, 440.0] },
  F: { root: 43.65, tones: [174.61, 220.0, 261.63, 349.23] },
  C: { root: 65.41, tones: [196.0, 261.63, 329.63, 392.0] },
  G: { root: 49.0, tones: [196.0, 246.94, 293.66, 392.0] },
}
const PROG = ['Am', 'F', 'C', 'G']
const PAT = [0, 2, 1, 3, 2, 1, 3, 2]
// Secciones de 8 compases (unos 20 s): 0 calma, 1 arpegio, 2 arpegio con pulso leve, 3 arpegio. Se repiten.
const SECTION = [0, 1, 2, 1, 2, 1]
const bars = Math.ceil(DUR / BAR) + 1
for (let b = 0; b < bars; b++) {
  const t = b * BAR
  const c = CH[PROG[b % 4]]
  const section = b < 4 ? 0 : SECTION[Math.floor(b / 8) % SECTION.length]
  pad(t, BAR, c.tones.slice(0, 3), 0.022, 500, 1300)
  bass(t, c.root, BAR - 0.1, 0.16)
  if (section >= 1) {
    for (let k = 0; k < 8; k++) {
      if (section === 1 && k % 2) continue
      const f = c.tones[PAT[k]] * 2
      pluck(t + k * (BEAT / 2), f, 0.05 * (k === 0 ? 1.15 : 0.85), k % 2 ? 0.45 : -0.45)
    }
  }
  if (section === 2) {
    softKick(t, 0.22)
    softKick(t + 2 * BEAT, 0.16)
    for (let k = 0; k < 4; k++) shaker(t + k * BEAT + BEAT / 2, 0.035, k % 2 ? 0.25 : -0.25)
  }
}

// Eco ping-pong del arpegio (3/8 de compás).
const d = Math.round(BEAT * 0.75 * sr)
for (let i = d; i < N; i++) {
  AL[i] += 0.38 * AR[i - d]
  AR[i] += 0.38 * AL[i - d]
}

let peak = 0
const out = [new Float32Array(N), new Float32Array(N)]
const fadeIn = 3
const fadeOut = 4
for (let i = 0; i < N; i++) {
  const t = i / sr
  let g = Math.min(1, t / fadeIn)
  if (t > DUR - fadeOut) g *= Math.max(0, (DUR - t) / fadeOut)
  out[0][i] = Math.tanh((L[i] + AL[i]) * 1.1) * g
  out[1][i] = Math.tanh((R[i] + AR[i]) * 1.1) * g
  peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]))
}
// Pico normalizado a -6 dBFS: el nivel final bajo la voz lo fija el montaje.
const gain = 0.5 / peak
const data = Buffer.alloc(N * 4)
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(out[0][i] * gain * 32767), i * 4)
  data.writeInt16LE(Math.round(out[1][i] * gain * 32767), i * 4 + 2)
}
const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + data.length, 4)
header.write('WAVEfmt ', 8)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20)
header.writeUInt16LE(2, 22)
header.writeUInt32LE(sr, 24)
header.writeUInt32LE(sr * 4, 28)
header.writeUInt16LE(4, 32)
header.writeUInt16LE(16, 34)
header.write('data', 36)
header.writeUInt32LE(data.length, 40)
fs.mkdirSync(path.dirname(file), { recursive: true })
fs.writeFileSync(file, Buffer.concat([header, data]))
console.log(`ok ${file} seconds=${DUR} bpm=${BPM}`)
