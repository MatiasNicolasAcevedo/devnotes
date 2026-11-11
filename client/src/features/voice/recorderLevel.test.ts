import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createFakeAudioContext,
  createFakeMediaRecorder,
  createFakeStream,
} from '../../test/fakeAudio'
import { CaptureController } from './recorder'

function build(createAudioContext?: (() => AudioContext) | null) {
  const { stream, track } = createFakeStream()
  const getUserMedia = vi.fn(() => Promise.resolve(stream))
  const recorder = createFakeMediaRecorder()
  const controller = new CaptureController({
    getUserMedia,
    MediaRecorder: recorder.MediaRecorder,
    isTypeSupported: () => true,
    now: () => 0,
    ...(createAudioContext === undefined ? {} : { createAudioContext }),
  })
  return { controller, stream, track, getUserMedia, recorder }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CaptureController · medidor de nivel (UI-08)', () => {
  it('conecta un analizador al mismo stream de la captura, sin otro getUserMedia ni salida de audio', async () => {
    const audio = createFakeAudioContext()
    const { controller, stream, getUserMedia, recorder } = build(audio.factory)

    await controller.start()

    expect(getUserMedia).toHaveBeenCalledOnce()
    expect(audio.factory).toHaveBeenCalledOnce()
    expect(audio.context.createMediaStreamSource).toHaveBeenCalledExactlyOnceWith(stream)
    expect(audio.source.connect).toHaveBeenCalledExactlyOnceWith(audio.analyser)
    // El analizador no se conecta a ningún destino: el micrófono no se reproduce.
    expect(audio.analyser.connect).not.toHaveBeenCalled()
    // Se graba el stream original, no uno derivado del AudioContext.
    expect(recorder.instances).toHaveLength(1)
    expect(recorder.instances[0].stream).toBe(stream)
  })

  it('getLevel devuelve el RMS real de la señal y null fuera de una grabación', async () => {
    const audio = createFakeAudioContext()
    const { controller } = build(audio.factory)
    expect(controller.getLevel()).toBeNull()

    await controller.start()
    audio.setAmplitude(0)
    expect(controller.getLevel()).toBe(0)
    audio.setAmplitude(0.5)
    expect(controller.getLevel()).toBeCloseTo(0.5, 5)

    await controller.stop()
    expect(controller.getLevel()).toBeNull()
  })

  it('el medidor no cambia lo que se graba ni lo que se entrega', async () => {
    const withMeter = build(createFakeAudioContext().factory)
    const withoutMeter = build(null)

    await withMeter.controller.start()
    await withoutMeter.controller.start()
    const a = await withMeter.controller.stop()
    const b = await withoutMeter.controller.stop()

    expect(a.sizeBytes).toBe(b.sizeBytes)
    expect(a.blob.type).toBe(b.blob.type)
    expect(await a.blob.text()).toBe(await b.blob.text())
  })

  it('cierra el AudioContext al detener', async () => {
    const audio = createFakeAudioContext()
    const { controller, track } = build(audio.factory)
    await controller.start()

    await controller.stop()

    expect(audio.source.disconnect).toHaveBeenCalled()
    expect(audio.context.close).toHaveBeenCalledOnce()
    expect(track.stop).toHaveBeenCalled()
  })

  it('cierra el AudioContext al cancelar o descartar la captura', async () => {
    const audio = createFakeAudioContext()
    const { controller, track } = build(audio.factory)
    await controller.start()

    controller.dispose()

    expect(controller.state).toBe('idle')
    expect(audio.context.close).toHaveBeenCalledOnce()
    expect(track.stop).toHaveBeenCalled()
    expect(controller.getLevel()).toBeNull()
  })

  it('cierra el AudioContext si la pista se corta sola', async () => {
    const audio = createFakeAudioContext()
    const { controller, track } = build(audio.factory)
    await controller.start()

    track.dispatchEvent(new Event('ended'))

    expect(controller.state).toBe('error')
    expect(audio.context.close).toHaveBeenCalledOnce()
  })

  it('no abre un AudioContext si el permiso se cancela antes de grabar', async () => {
    const audio = createFakeAudioContext()
    const { stream } = createFakeStream()
    let grant: (value: MediaStream) => void = () => {}
    const controller = new CaptureController({
      getUserMedia: () => new Promise<MediaStream>((resolve) => (grant = resolve)),
      MediaRecorder: createFakeMediaRecorder().MediaRecorder,
      isTypeSupported: () => true,
      createAudioContext: audio.factory,
    })
    const starting = controller.start()
    controller.dispose()
    grant(stream)
    await starting

    expect(audio.factory).not.toHaveBeenCalled()
  })

  it.each([
    ['el navegador no ofrece AudioContext', null],
    [
      'crear el AudioContext falla',
      () => {
        throw new Error('AudioContext no permitido')
      },
    ],
  ])('si %s, la grabación funciona sin medidor', async (_case, factory) => {
    const { controller } = build(factory)

    await controller.start()
    expect(controller.state).toBe('recording')
    expect(controller.getLevel()).toBeNull()
    const result = await controller.stop()

    expect(result.sizeBytes).toBeGreaterThan(0)
    expect(controller.state).toBe('idle')
  })

  it('por defecto usa el AudioContext del navegador y, si no existe, graba sin medidor', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const absent = build()
    await absent.controller.start()
    expect(absent.controller.getLevel()).toBeNull()
    await absent.controller.stop()

    const audio = createFakeAudioContext()
    vi.stubGlobal('AudioContext', function AudioContext() {
      return audio.factory()
    })
    const present = build()
    await present.controller.start()
    audio.setAmplitude(0.25)
    expect(present.controller.getLevel()).toBeCloseTo(0.25, 5)
    await present.controller.stop()
    expect(audio.context.close).toHaveBeenCalledOnce()
  })
})
