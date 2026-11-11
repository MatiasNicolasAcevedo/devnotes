import { vi } from 'vitest'

/**
 * Doble de `AudioContext` para el medidor de nivel: el analizador entrega una señal constante de la amplitud
 * indicada, así que su RMS es esa misma amplitud. No reproduce ni graba nada.
 */
export function createFakeAudioContext() {
  let amplitude = 0
  const analyser = {
    fftSize: 2048,
    getFloatTimeDomainData: vi.fn((buffer: Float32Array) => {
      buffer.fill(amplitude)
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  const source = { connect: vi.fn(), disconnect: vi.fn() }
  const context = {
    state: 'running',
    destination: {},
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
    close: vi.fn(() => Promise.resolve()),
  }
  const factory = vi.fn(() => context as unknown as AudioContext)
  return {
    factory,
    context,
    source,
    analyser,
    setAmplitude(value: number) {
      amplitude = value
    },
  }
}

/** Doble mínimo de `MediaStream` con una pista de audio. */
export function createFakeStream() {
  const track = Object.assign(new EventTarget(), { stop: vi.fn(), kind: 'audio' })
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  return { stream, track }
}

/** Constructor doble de `MediaRecorder`: al detener entrega un fragmento y dispara `onstop`. */
export function createFakeMediaRecorder() {
  const instances: { stream: MediaStream }[] = []
  class FakeMediaRecorder {
    state: 'inactive' | 'recording' = 'inactive'
    mimeType = 'audio/webm'
    ondataavailable: ((event: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    onerror: (() => void) | null = null
    stream: MediaStream
    constructor(stream: MediaStream) {
      this.stream = stream
      instances.push(this)
    }
    start() {
      this.state = 'recording'
    }
    stop() {
      this.state = 'inactive'
      this.ondataavailable?.({ data: new Blob(['audio ficticio'], { type: this.mimeType }) })
      this.onstop?.()
    }
  }
  return { MediaRecorder: FakeMediaRecorder as unknown as typeof MediaRecorder, instances }
}
