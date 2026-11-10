import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useVoiceRecorder } from './useVoiceRecorder'
import { AuthSessionContext, type AuthSession } from '../auth/sessionContext'

/**
 * Doble mínimo de AuthSession para pruebas del hook.
 */
const defaultSession: AuthSession = {
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

function SessionWrapper({
  children,
  session = defaultSession,
}: {
  children: import('react').ReactNode
  session?: AuthSession
}) {
  return <AuthSessionContext value={session}>{children}</AuthSessionContext>
}

/**
 * Doble de MediaStream para pruebas.
 */
function createMockStream(): MediaStream {
  const track = {
    stop: vi.fn(),
    getSettings: vi.fn().mockReturnValue({}),
    getConstraints: vi.fn().mockReturnValue({}),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn(),
    enabled: true,
    id: 'mock-track',
    label: 'mock',
    readyState: 'live',
    kind: 'audio',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaStreamTrack

  return {
    getTracks: vi.fn().mockReturnValue([track]),
    getAudioTracks: vi.fn().mockReturnValue([track]),
    getVideoTracks: vi.fn().mockReturnValue([]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(),
    active: true,
    id: 'mock-stream',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onaddtrack: null,
    onend: null,
    onremovetrack: null,
  } as unknown as MediaStream
}

/**
 * Doble de MediaRecorder que simula dataavailable + onstop síncronos.
 */
function createMockMediaRecorder(stream: MediaStream) {
  let state: 'inactive' | 'recording' | 'paused' = 'inactive'
  let handlerDataAvailable: ((e: BlobEvent) => void) | null = null
  let handlerStop: (() => void) | null = null
  let handlerError: ((e: Event) => void) | null = null

  const recorder = {
    get state() {
      return state
    },
    mimeType: 'audio/webm',
    stream,
    start: vi.fn(() => {
      state = 'recording'
    }),
    stop: vi.fn(() => {
      state = 'inactive'
      // Simular último fragmento
      const blob = new Blob(['chunk'], { type: 'audio/webm' })
      if (handlerDataAvailable) {
        handlerDataAvailable(Object.assign(new Event('dataavailable'), { data: blob, timecode: 0 }))
      }
      if (handlerStop) {
        handlerStop()
      }
    }),
    pause: vi.fn(),
    resume: vi.fn(),
    requestData: vi.fn(),
    get ondataavailable() {
      return handlerDataAvailable
    },
    set ondataavailable(v) {
      handlerDataAvailable = v
    },
    get onstop() {
      return handlerStop
    },
    set onstop(v) {
      handlerStop = v
    },
    get onerror() {
      return handlerError
    },
    set onerror(v) {
      handlerError = v
    },
    _fireError() {
      if (handlerError) {
        handlerError(new Event('error'))
      }
    },
  } as unknown as MediaRecorder & { _fireError: () => void }

  return recorder
}

describe('useVoiceRecorder', () => {
  let mockStream: MediaStream
  let mockRecorder: ReturnType<typeof createMockMediaRecorder>
  let getUserMediaMock: () => Promise<MediaStream>

  function buildControllerOptions() {
    const MockRecorder = Object.assign(function () {
      return mockRecorder
    }, {})
    return {
      getUserMedia: getUserMediaMock as () => Promise<MediaStream>,
      MediaRecorder: MockRecorder as unknown as typeof MediaRecorder,
      isTypeSupported: () => true,
      now: () => 0,
    }
  }

  beforeEach(() => {
    mockStream = createMockStream()
    mockRecorder = createMockMediaRecorder(mockStream)
    getUserMediaMock = () => Promise.resolve(mockStream)
  })

  it('empieza en idle sin solicitar micrófono', () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.elapsedSeconds).toBe(0)
    expect(result.current.elapsedFormatted).toBe('00:00')
  })

  it('transiciona a recording tras start', async () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')
  })

  it('devuelve resultado tras stop', async () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')

    await act(async () => {
      await result.current.stop()
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.result).not.toBeNull()
    expect(result.current.result?.blob.size).toBeGreaterThan(0)
  })

  it('cancel en requesting vuelve a idle', async () => {
    // getUserMedia pendiente
    let resolveStreamFn: () => void
    const streamPromise = new Promise<MediaStream>((resolve) => {
      resolveStreamFn = () => resolve(mockStream)
    })
    getUserMediaMock = () => streamPromise

    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      result.current.start() // No esperar — queda en requesting
    })

    expect(result.current.state).toBe('requesting')

    act(() => {
      result.current.cancel()
    })

    expect(result.current.state).toBe('idle')

    // Resolver después de cancelar
    act(() => {
      resolveStreamFn?.()
    })
  })

  it('cancel en recording detiene captura', async () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')

    act(() => {
      result.current.cancel()
    })

    expect(result.current.state).toBe('idle')
  })

  it('resetError vuelve a idle', async () => {
    const notAllowed = new DOMException('Denied', 'NotAllowedError')
    getUserMediaMock = () => Promise.reject(notAllowed)

    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('error')

    act(() => {
      result.current.resetError()
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('resetError no altera una captura en curso', async () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      await result.current.start()
    })
    act(() => {
      result.current.resetError()
    })

    expect(result.current.state).toBe('recording')
  })

  it('stop tras start cambia estado a idle', async () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')

    await act(async () => {
      await result.current.stop()
    })

    expect(result.current.state).toBe('idle')
  })

  it('onError se invoca al denegar permiso', async () => {
    const onErrorMock = vi.fn()
    const notAllowed = new DOMException('Denied', 'NotAllowedError')
    getUserMediaMock = () => Promise.reject(notAllowed)

    const { result } = renderHook(
      () =>
        useVoiceRecorder({
          ...buildControllerOptions(),
          onError: onErrorMock,
        }),
      { wrapper: SessionWrapper },
    )

    await act(async () => {
      await result.current.start()
    })

    expect(onErrorMock).toHaveBeenCalledTimes(1)
    expect(result.current.state).toBe('error')
  })

  it('cleanup al desmontar libera controller', async () => {
    const trackStop = vi.fn()
    const customStream = createMockStream()
    ;(customStream.getTracks as ReturnType<typeof vi.fn>).mockReturnValue([
      Object.assign(new EventTarget(), { stop: trackStop }),
    ])
    getUserMediaMock = () => Promise.resolve(customStream)

    const { result, unmount } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')

    unmount()

    // Tras desmontar, los tracks deben haberse detenido
    expect(trackStop).toHaveBeenCalled()
  })

  it('logoutPending detiene captura', async () => {
    const sessionWithLogout: AuthSession = {
      ...defaultSession,
      logoutPending: false,
    }

    const { result, rerender } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: ({ children }) => (
        <SessionWrapper session={sessionWithLogout}>{children}</SessionWrapper>
      ),
    })

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')

    // Simular logoutPending
    sessionWithLogout.logoutPending = true
    rerender()

    expect(result.current.state).toBe('idle')
  })

  it('elapsedFormatted muestra mm:ss correcto', async () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    expect(result.current.elapsedFormatted).toBe('00:00')
  })

  it('double start no duplica captura', async () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')

    // Segundo start — no-op
    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')
  })

  it('stop sin recording devuelve null', async () => {
    const { result } = renderHook(() => useVoiceRecorder(buildControllerOptions()), {
      wrapper: SessionWrapper,
    })

    const r = await result.current.stop()
    expect(r).toBeNull()
  })
})
