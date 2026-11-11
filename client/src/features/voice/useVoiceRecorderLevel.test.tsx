import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createFakeAudioContext,
  createFakeMediaRecorder,
  createFakeStream,
} from '../../test/fakeAudio'
import { AuthSessionContext, type AuthSession } from '../auth/sessionContext'
import { useVoiceRecorder } from './useVoiceRecorder'

const session: AuthSession = {
  status: 'authenticated',
  user: { id: 'test-user', email: 'test@example.com', displayName: null, emailVerified: true },
  sessionError: null,
  retrySession: vi.fn(),
  csrfReady: true,
  csrfError: null,
  retryCsrf: vi.fn(),
  sessionEnded: false,
  logout: vi.fn(),
  logoutPending: false,
  logoutError: null,
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthSessionContext value={session}>{children}</AuthSessionContext>
}

function renderRecorder(createAudioContext: (() => AudioContext) | null) {
  const { stream, track } = createFakeStream()
  const getUserMedia = vi.fn(() => Promise.resolve(stream))
  const options = {
    getUserMedia,
    MediaRecorder: createFakeMediaRecorder().MediaRecorder,
    isTypeSupported: () => true,
    createAudioContext,
  }
  const view = renderHook(() => useVoiceRecorder(options), { wrapper })
  return { ...view, getUserMedia, track }
}

/** Avanza el reloj simulado; los cuadros de animación del hook corren dentro de `act`. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useVoiceRecorder · nivel del micrófono (UI-08)', () => {
  it('fuera de una grabación no expone barras ni aviso', () => {
    const { result } = renderRecorder(createFakeAudioContext().factory)

    expect(result.current.levels).toBeNull()
    expect(result.current.silent).toBe(false)
  })

  it('al grabar expone cinco barras con el nivel real del micrófono', async () => {
    const audio = createFakeAudioContext()
    const { result, getUserMedia } = renderRecorder(audio.factory)
    await act(() => result.current.start())

    audio.setAmplitude(0)
    await advance(1000)
    expect(result.current.levels).toEqual([0, 0, 0, 0, 0])

    audio.setAmplitude(0.3)
    await advance(1000)
    const loud = result.current.levels
    expect(loud).toHaveLength(5)
    for (const level of loud ?? []) {
      expect(level).toBeGreaterThan(0.3)
      expect(level).toBeLessThanOrEqual(1)
    }

    audio.setAmplitude(0.02)
    await advance(1000)
    for (const [index, level] of (result.current.levels ?? []).entries()) {
      expect(level).toBeGreaterThan(0)
      expect(level).toBeLessThan((loud ?? [])[index])
    }
    expect(getUserMedia).toHaveBeenCalledOnce()
  })

  it('avisa tras 3 s seguidos de silencio y retira el aviso en cuanto vuelve el sonido', async () => {
    const audio = createFakeAudioContext()
    const { result } = renderRecorder(audio.factory)
    audio.setAmplitude(0.005)
    await act(() => result.current.start())

    await advance(2500)
    expect(result.current.silent).toBe(false)
    await advance(700)
    expect(result.current.silent).toBe(true)
    // El aviso no detiene ni altera la grabación.
    expect(result.current.state).toBe('recording')

    audio.setAmplitude(0.2)
    await advance(50)
    expect(result.current.silent).toBe(false)
    expect(result.current.state).toBe('recording')
  })

  it('un sonido intermedio reinicia la cuenta de silencio', async () => {
    const audio = createFakeAudioContext()
    const { result } = renderRecorder(audio.factory)
    audio.setAmplitude(0)
    await act(() => result.current.start())

    await advance(2000)
    audio.setAmplitude(0.2)
    await advance(100)
    audio.setAmplitude(0)
    await advance(2500)
    expect(result.current.silent).toBe(false)
    await advance(700)
    expect(result.current.silent).toBe(true)
  })

  it('sin AudioContext graba igual, sin barras ni aviso', async () => {
    const { result } = renderRecorder(null)
    await act(() => result.current.start())

    await advance(4000)

    expect(result.current.state).toBe('recording')
    expect(result.current.levels).toBeNull()
    expect(result.current.silent).toBe(false)
    let capture = null
    await act(async () => {
      capture = await result.current.stop()
    })
    expect(capture).not.toBeNull()
  })

  it.each(['detener', 'cancelar', 'desmontar'] as const)(
    'al %s cierra el AudioContext y las pistas, y retira barras y aviso',
    async (how) => {
      const audio = createFakeAudioContext()
      const { result, track, unmount } = renderRecorder(audio.factory)
      audio.setAmplitude(0)
      await act(() => result.current.start())
      await advance(3200)
      expect(result.current.silent).toBe(true)

      if (how === 'detener') {
        await act(async () => {
          await result.current.stop()
        })
      } else if (how === 'cancelar') act(() => result.current.cancel())
      else unmount()

      expect(audio.context.close).toHaveBeenCalledOnce()
      expect(track.stop).toHaveBeenCalled()
      if (how !== 'desmontar') {
        expect(result.current.levels).toBeNull()
        expect(result.current.silent).toBe(false)
      }
    },
  )
})
