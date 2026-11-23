// Banda sonora del tráiler v2 de escritorio (música + efectos) como WAV determinista.
// Deriva de trailer/scripts/make-soundtrack.mjs (v1, 30 s): mismos instrumentos, armonía y semilla.
// 120 BPM: un beat = 0.5 s, un compás = 2 s. Los tiempos coinciden con index.html.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sr = 44100
const DUR = 46
const N = sr * DUR
const TAU = Math.PI * 2
const mk = () => [new Float32Array(N), new Float32Array(N)]
const music = mk()
const arp = mk()
const drums = mk()
const fx = mk()

let seed = 1337
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}
const add = (bus, i, v, pan = 0) => {
  if (i < 0 || i >= N) return
  bus[0][i] += v * (1 - Math.max(0, pan))
  bus[1][i] += v * (1 + Math.min(0, pan))
}
const lpCoef = (fc) => 1 - Math.exp((-TAU * Math.min(fc, sr * 0.45)) / sr)
const saw = (p) => 2 * (p - Math.floor(p)) - 1

const kickTimes = []
function kick(t0, amp = 1, duck = true) {
  if (duck) kickTimes.push(t0)
  const i0 = Math.round(t0 * sr)
  let ph = 0
  for (let i = 0; i < 0.45 * sr; i++) {
    const t = i / sr
    ph += (TAU * (44 + 120 * Math.exp(-t * 30))) / sr
    let v = Math.sin(ph) * Math.exp(-t * 8.5)
    if (t < 0.004) v += (rnd() * 2 - 1) * 0.35
    add(drums, i0 + i, v * amp)
  }
}
function hat(t0, amp, decay = 0.03, pan = 0.2) {
  const i0 = Math.round(t0 * sr)
  let lp = 0
  for (let i = 0; i < decay * 6 * sr; i++) {
    const n = rnd() * 2 - 1
    lp += 0.35 * (n - lp)
    add(drums, i0 + i, (n - lp) * Math.exp(-i / sr / decay) * amp, pan)
  }
}
function clap(t0, amp) {
  const i0 = Math.round(t0 * sr)
  let lp = 0
  let lp2 = 0
  for (let i = 0; i < 0.3 * sr; i++) {
    const t = i / sr
    const n = rnd() * 2 - 1
    lp += 0.45 * (n - lp)
    lp2 += 0.06 * (lp - lp2)
    const burst = t < 0.03 ? 0.6 + 0.4 * Math.sin(t * TAU * 110) ** 2 : 1
    add(drums, i0 + i, (lp - lp2) * Math.exp(-t * 20) * burst * amp * 1.8)
    add(drums, i0 + i, Math.sin(TAU * 185 * t) * Math.exp(-t * 35) * amp * 0.4)
  }
}
function crash(t0, amp) {
  const i0 = Math.round(t0 * sr)
  let lp = 0
  for (let i = 0; i < 0.9 * sr; i++) {
    const t = i / sr
    const n = rnd() * 2 - 1
    lp += 0.25 * (n - lp)
    add(drums, i0 + i, (n - lp) * Math.exp(-t * 5.5) * amp, i % 2 ? 0.3 : -0.3)
  }
}
function bassNote(t0, f, dur, amp) {
  const i0 = Math.round(t0 * sr)
  let p = 0
  let lp = 0
  const n = Math.round((dur + 0.04) * sr)
  for (let i = 0; i < n; i++) {
    const t = i / sr
    p += f / sr
    const osc = saw(p) * 0.7 + Math.sin(TAU * p) * 0.9 + (saw(p * 2) > 0 ? 0.15 : -0.15)
    lp += lpCoef(160 + 700 * Math.exp(-t * 14)) * (osc - lp)
    const env = Math.min(1, t / 0.004) * Math.min(1, (n - i) / (0.03 * sr))
    add(music, i0 + i, lp * env * amp)
  }
}
function arpNote(t0, f, dur, amp, pan) {
  const i0 = Math.round(t0 * sr)
  let p1 = 0
  let p2 = 0
  let lp = 0
  const n = Math.round(dur * sr)
  for (let i = 0; i < n; i++) {
    const t = i / sr
    p1 += (f * 1.004) / sr
    p2 += (f * 0.996) / sr
    const osc = saw(p1) + saw(p2)
    lp += lpCoef(500 + 4200 * Math.exp(-t * 13)) * (osc - lp)
    const env = Math.min(1, t / 0.003) * Math.exp(-t * 7) * Math.min(1, (n - i) / (0.01 * sr))
    add(arp, i0 + i, lp * env * amp, pan)
  }
}
function pad(t0, dur, freqs, amp, fc0, fc1) {
  const i0 = Math.round(t0 * sr)
  const rel = 0.7
  const n = Math.round((dur + rel) * sr)
  freqs.forEach((f, k) => {
    ;[-0.006, 0, 0.006].forEach((det, d) => {
      let p = rnd()
      let lp = 0
      const pan = (d - 1) * 0.6 + (k % 2 ? 0.15 : -0.15)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        p += (f * (1 + det)) / sr
        const fc = fc0 + (fc1 - fc0) * Math.min(1, t / dur)
        lp += lpCoef(fc) * (saw(p) - lp)
        const env = Math.min(1, t / 0.35) * Math.min(1, (n - i) / (rel * sr))
        add(music, i0 + i, lp * env * amp, pan)
      }
    })
  })
}
function riser(t0, dur, amp) {
  const i0 = Math.round(t0 * sr)
  let lp = 0
  let ph = 0
  for (let i = 0; i < dur * sr; i++) {
    const x = i / (dur * sr)
    const n = rnd() * 2 - 1
    lp += lpCoef(300 + 9000 * x * x) * (n - lp)
    ph += (TAU * (180 + 1500 * x * x)) / sr
    const trem = 0.75 + 0.25 * Math.sin(TAU * (4 + 12 * x) * (i / sr))
    const v = (lp * 0.9 + Math.sin(ph) * 0.18) * x * x * trem * amp
    add(fx, i0 + i, v, Math.sin(x * 9) * 0.3)
  }
}
function impact(t0, amp) {
  const i0 = Math.round(t0 * sr)
  let ph = 0
  let lp = 0
  for (let i = 0; i < 2.6 * sr; i++) {
    const t = i / sr
    ph += (TAU * (34 + 75 * Math.exp(-t * 3.2))) / sr
    const n = rnd() * 2 - 1
    lp += lpCoef(250 + 7000 * Math.exp(-t * 6)) * (n - lp)
    add(fx, i0 + i, (Math.sin(ph) * Math.exp(-t * 2.1) + lp * Math.exp(-t * 3.4) * 0.8) * amp)
  }
}
function whoosh(tPeak, dur, amp) {
  const i0 = Math.round((tPeak - dur * 0.7) * sr)
  let lp = 0
  let lp2 = 0
  for (let i = 0; i < dur * sr; i++) {
    const x = i / (dur * sr)
    const n = rnd() * 2 - 1
    lp += lpCoef(400 + 6000 * x) * (n - lp)
    lp2 += lpCoef(150 + 900 * x) * (lp - lp2)
    const env = x < 0.7 ? (x / 0.7) ** 2.2 : ((1 - x) / 0.3) ** 1.5
    add(fx, i0 + i, (lp - lp2) * env * amp, -0.7 + 1.4 * x)
  }
}
function click(t0, amp) {
  const i0 = Math.round(t0 * sr)
  const f = 1700 + rnd() * 1300
  const pan = rnd() * 0.6 - 0.3
  let lp = 0
  for (let i = 0; i < 0.03 * sr; i++) {
    const t = i / sr
    const n = rnd() * 2 - 1
    lp += 0.5 * (n - lp)
    const v = (n - lp) * Math.exp(-t * 700) * 0.9 + Math.sin(TAU * f * t) * Math.exp(-t * 320) * 0.5
    add(fx, i0 + i, v * amp, pan)
  }
}
function pop(t0, amp) {
  const i0 = Math.round(t0 * sr)
  let ph = 0
  for (let i = 0; i < 0.12 * sr; i++) {
    const t = i / sr
    ph += (TAU * (170 + 380 * Math.exp(-t * 45))) / sr
    add(fx, i0 + i, Math.sin(ph) * Math.exp(-t * 34) * amp)
  }
  click(t0, amp * 0.5)
}
function ding(t0, amp, f = 1318.5) {
  const i0 = Math.round(t0 * sr)
  for (let i = 0; i < 1.1 * sr; i++) {
    const t = i / sr
    const v =
      Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.5 * t) * Math.exp(-t * 4) + 0.25 * Math.sin(TAU * f * 2 * t)
    add(fx, i0 + i, v * Math.exp(-t * 5.5) * Math.min(1, t / 0.002) * amp, 0.15)
  }
}
function beep(t0, amp) {
  for (const off of [0, 0.16]) {
    const i0 = Math.round((t0 + off) * sr)
    const n = 0.1 * sr
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / 200) * Math.min(1, (n - i) / 200)
      add(fx, i0 + i, Math.sin((TAU * 880 * i) / sr) * env * amp)
    }
  }
}
function typing(t0, count, dt, amp) {
  for (let i = 0; i < count; i++) click(t0 + i * dt + (rnd() - 0.5) * 0.008, amp * (0.75 + rnd() * 0.5))
}

// ---------- Armonía ----------
const CH = {
  Am: { root: 55.0, tones: [220.0, 261.63, 329.63, 440.0] },
  F: { root: 43.65, tones: [174.61, 220.0, 261.63, 349.23] },
  C: { root: 65.41, tones: [196.0, 261.63, 329.63, 392.0] },
  G: { root: 49.0, tones: [196.0, 246.94, 293.66, 392.0] },
}
const PAT = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2]

function fullBar(b, name, { arpAmp = 0.13, crashes = false } = {}) {
  const t = b * 2
  const c = CH[name]
  for (let k = 0; k < 4; k++) {
    kick(t + k * 0.5, 0.95)
    hat(t + k * 0.5 + 0.25, 0.17, 0.045, 0.25)
    bassNote(t + k * 0.5 + 0.25, c.root, 0.2, 0.42)
    if (crashes) crash(t + k * 0.5, 0.22)
  }
  for (let k = 0; k < 16; k++) hat(t + k * 0.125, k % 2 ? 0.06 : 0.035, 0.02, -0.25)
  clap(t + 0.5, 0.36)
  clap(t + 1.5, 0.36)
  for (let k = 0; k < 16; k++) {
    const f = c.tones[PAT[k]] * (k >= 8 ? 2 : 1)
    arpNote(t + k * 0.125, f, 0.3, arpAmp, k % 2 ? 0.55 : -0.55)
  }
  pad(t, 2, c.tones.slice(0, 3), 0.028, 900, 1400)
}

// Intro (0–4 s): tensión
impact(0, 0.4)
pad(0, 4, CH.Am.tones.slice(0, 3), 0.04, 180, 1700)
for (const t of [1, 2, 3]) kick(t, 0.5, false)
riser(2, 2, 0.5)
;[3.5, 3.625, 3.75, 3.8125, 3.875, 3.9375].forEach((t, i) => clap(t, 0.16 + i * 0.045))

// Drop (4–18 s)
impact(4, 1)
crash(4, 0.35)
;['Am', 'F', 'C', 'G', 'Am', 'F', 'G'].forEach((name, i) => fullBar(2 + i, name))
for (const t of [8, 12, 16]) crash(t, 0.16)

// Breakdown de voz (18–22 s)
;[
  [9, 'Am'],
  [10, 'F'],
].forEach(([b, name]) => {
  const t = b * 2
  const c = CH[name]
  pad(t, 2, c.tones, 0.04, 1200, 2600)
  for (let k = 0; k < 16; k++) arpNote(t + k * 0.125, c.tones[PAT[k]] * 2, 0.3, 0.075, k % 2 ? 0.6 : -0.6)
  for (let k = 0; k < 4; k++) hat(t + k * 0.5 + 0.25, 0.09, 0.04, 0.2)
})
impact(18, 0.5)
riser(20.5, 1.5, 0.45)
;[21.5, 21.625, 21.75, 21.8125, 21.875, 21.9375].forEach((t, i) => clap(t, 0.16 + i * 0.045))

// Bloque de funciones (22–34 s): Imagen, Libres + consulta al lado, IA
impact(22, 0.8)
crash(22, 0.35)
;['Am', 'F', 'C', 'G'].forEach((name, i) => fullBar(11 + i, name))
fullBar(15, 'Am', { arpAmp: 0.15 })
fullBar(16, 'F', { arpAmp: 0.15 })
impact(26, 0.5)
crash(26, 0.22)
impact(30, 0.6)
crash(30, 0.25)
riser(32.5, 1.5, 0.42)
;[33.5, 33.625, 33.75, 33.8125, 33.875, 33.9375].forEach((t, i) => clap(t, 0.14 + i * 0.04))

// Breakdown adaptable (34–38 s): la ventana se achica y pasa a móvil
;[
  [17, 'C'],
  [18, 'G'],
].forEach(([b, name]) => {
  const t = b * 2
  const c = CH[name]
  pad(t, 2, c.tones, 0.04, 1000, 2400)
  for (let k = 0; k < 16; k++) arpNote(t + k * 0.125, c.tones[PAT[k]] * 2, 0.3, 0.075, k % 2 ? 0.6 : -0.6)
  for (let k = 0; k < 4; k++) {
    hat(t + k * 0.5 + 0.25, 0.09, 0.04, 0.2)
    kick(t + k * 0.5, 0.45, false)
  }
})
impact(34, 0.5)
riser(36.5, 1.5, 0.45)
;[37.5, 37.625, 37.75, 37.8125, 37.875, 37.9375].forEach((t, i) => clap(t, 0.16 + i * 0.045))

// Ráfaga de tarjetas (38–42 s) y final (42–46 s)
impact(38, 0.7)
fullBar(19, 'F', { crashes: true, arpAmp: 0.14 })
fullBar(20, 'G', { crashes: true, arpAmp: 0.14 })
for (const t of [39, 40, 41]) impact(t, 0.45)
riser(40.5, 1.5, 0.4)
impact(42, 1)
crash(42, 0.4)
fullBar(21, 'Am', { arpAmp: 0.15 })
impact(44, 0.85)
crash(44, 0.3)
kick(44, 1)
pad(44, 1.3, CH.Am.tones, 0.05, 2200, 500)
;[0, 0.25, 0.5, 1.0].forEach((o, i) => arpNote(44 + o, CH.Am.tones[i] * 2, 0.6, 0.12 - i * 0.02, i % 2 ? 0.5 : -0.5))

// ---------- Efectos sincronizados con la imagen ----------
typing(0.5, 18, 0.06, 0.2)
typing(2.0, 19, 0.06, 0.2)
whoosh(6.0, 0.6, 0.38)
typing(6.9, 57, 0.04, 0.13)
ding(9.5, 0.1, 1760)
whoosh(10.0, 0.6, 0.34)
pop(11.0, 0.5)
pop(11.2, 0.55)
typing(11.8, 41, 0.025, 0.07)
ding(13.0, 0.22)
whoosh(14.0, 0.6, 0.34)
typing(14.6, 4, 0.1, 0.16)
pop(15.2, 0.6)
typing(15.6, 17, 0.04, 0.13)
typing(16.6, 3, 0.1, 0.16)
pop(17.0, 0.6)
whoosh(18.0, 0.7, 0.4)
beep(18.3, 0.16)
ding(21.3, 0.2, 1568)
// Imagen
whoosh(22.0, 0.5, 0.34)
pop(22.6, 0.55)
pop(23.3, 0.5)
riser(23.35, 0.6, 0.18)
typing(24.0, 24, 0.03, 0.08)
pop(25.0, 0.5)
ding(25.1, 0.16, 1568)
// Libres y consulta al lado
whoosh(26.0, 0.5, 0.34)
typing(26.45, 16, 0.035, 0.12)
pop(27.0, 0.4)
pop(27.2, 0.4)
typing(27.45, 18, 0.025, 0.08)
pop(27.7, 0.5)
click(28.05, 0.45)
whoosh(28.45, 0.5, 0.3)
ding(28.75, 0.12, 1760)
// IA
whoosh(30.0, 0.5, 0.34)
click(30.55, 0.4)
pop(31.0, 0.55)
whoosh(31.35, 0.4, 0.28)
typing(31.45, 12, 0.03, 0.09)
pop(31.9, 0.55)
typing(32.2, 30, 0.028, 0.06)
pop(33.2, 0.5)
ding(33.3, 0.2, 1568)
// Adaptable
whoosh(34.0, 0.6, 0.36)
whoosh(35.4, 1.1, 0.24)
pop(35.6, 0.45)
whoosh(36.3, 0.6, 0.34)
ding(37.0, 0.14, 1760)
// Ráfaga y final
for (const t of [39, 40, 41]) whoosh(t, 0.35, 0.32)
whoosh(42.0, 0.5, 0.35)
ding(43.0, 0.14, 1760)

// ---------- Mezcla ----------
const pump = new Float32Array(N).fill(1)
for (const t0 of kickTimes) {
  const i0 = Math.round(t0 * sr)
  for (let i = 0; i < 0.45 * sr && i0 + i < N; i++) {
    const g = 1 - 0.68 * Math.exp((-i / sr) * 8)
    if (g < pump[i0 + i]) pump[i0 + i] = g
  }
}
const d = Math.round(0.375 * sr)
for (let i = d; i < N; i++) {
  arp[0][i] += 0.36 * arp[1][i - d]
  arp[1][i] += 0.36 * arp[0][i - d]
}
const out = mk()
let peak = 0
for (let ch = 0; ch < 2; ch++) {
  for (let i = 0; i < N; i++) {
    const t = i / sr
    let v = (music[ch][i] * 0.95 + arp[ch][i] * 0.85) * pump[i] + drums[ch][i] + fx[ch][i] * 0.95
    v = Math.tanh(v * 1.15)
    if (t > DUR - 0.9) v *= Math.max(0, (DUR - t) / 0.9)
    out[ch][i] = v
    peak = Math.max(peak, Math.abs(v))
  }
}
const gain = 0.92 / peak
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

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets')
fs.mkdirSync(dir, { recursive: true })
const file = path.join(dir, 'soundtrack.wav')
fs.writeFileSync(file, Buffer.concat([header, data]))
console.log(`ok ${file} peak=${peak.toFixed(3)} seconds=${DUR}`)
