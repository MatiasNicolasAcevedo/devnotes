import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSession } from '../auth/sessionContext'
import {
  CaptureController,
  type CaptureControllerOptions,
  type CaptureResult,
  type CaptureState,
} from './recorder'

/**
 * Hook que expone el ciclo de vida del micrófono.
 *
 * Máquina de estados: idle → requesting → recording → stopping → idle/error.
 * No transcribe automáticamente: el consumidor decide cuándo enviar el blob.
 * Limpia tracks, timers y listeners al desmontar, en error, logout y pagehide.
 * React StrictMode (doble mount/unmount) no duplica captura ni recursos.
 */

export interface UseVoiceRecorderOptions extends Omit<CaptureControllerOptions, 'now'> {
  /** Callback opcional cuando se obtiene un resultado (stop exitoso). */
  onResult?: (result: CaptureResult) => void
  /** Callback opcional cuando ocurre un error de captura. */
  onError?: (error: Error) => void
}

export interface VoiceRecorderState {
  state: CaptureState
  /** Resultado disponible tras stop exitoso. */
  result: CaptureResult | null
  /** Error activo (no nulo solo en estado 'error'). */
  error: Error | null
  /** Duración actual en segundos mientras graba. */
  elapsedSeconds: number
  /** Formateada mm:ss para mostrar. */
  elapsedFormatted: string
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const { onResult, onError, ...controllerOptions } = options
  const session = useSession()

  const controllerRef = useRef<CaptureController | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const elapsedRef = useRef<number>(0)
  const rafIdRef = useRef<number>(0)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)

  const [state, setState] = useState<VoiceRecorderState>({
    state: 'idle',
    result: null,
    error: null,
    elapsedSeconds: 0,
    elapsedFormatted: '00:00',
  })

  // Mantener referencias actualizadas sin re-crear el controller.
  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  const formatElapsed = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [])

  const ensureController = useCallback((): CaptureController => {
    if (!controllerRef.current) {
      controllerRef.current = new CaptureController(controllerOptions)
      const ctrl = controllerRef.current

      unsubscribeRef.current = ctrl.subscribe((nextState, result, error) => {
        if (result) onResultRef.current?.(result)
        if (nextState === 'error') onErrorRef.current?.(error ?? new Error('Error desconocido.'))
        if (nextState === 'requesting') elapsedRef.current = 0
        setState((prev) => {
          if (nextState === 'error') {
            return {
              state: 'error',
              result: null,
              error: error ?? new Error('Error desconocido.'),
              elapsedSeconds: prev.elapsedSeconds,
              elapsedFormatted: prev.elapsedFormatted,
            }
          }
          if (nextState === 'idle' && result) {
            return {
              state: 'idle',
              result,
              error: null,
              elapsedSeconds: 0,
              elapsedFormatted: '00:00',
            }
          }
          if (nextState === 'recording') {
            // Iniciar reloj de elapsed.
            return {
              ...prev,
              state: 'recording',
              result: null,
              error: null,
            }
          }
          return {
            ...prev,
            state: nextState,
            ...(nextState === 'idle' ? { result: null, error: null } : {}),
          }
        })
      })
    }
    return controllerRef.current
  }, [controllerOptions])

  // Reloj de elapsed durante grabación.
  useEffect(() => {
    if (state.state !== 'recording') {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
      return
    }

    const ctrl = controllerRef.current
    if (!ctrl) return

    const startTime = Date.now() - elapsedRef.current * 1000

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      elapsedRef.current = elapsed
      setState((prev) =>
        prev.state === 'recording'
          ? {
              ...prev,
              elapsedSeconds: elapsed,
              elapsedFormatted: formatElapsed(elapsed),
            }
          : prev,
      )
      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
    }
  }, [state.state, formatElapsed])

  // Cleanup al desmontar: detener captura y liberar recursos.
  useLayoutEffect(() => {
    return () => {
      unsubscribeRef.current?.()
      controllerRef.current?.dispose()
      controllerRef.current = null
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
    }
  }, [])

  const start = useCallback(async () => {
    const ctrl = ensureController()
    try {
      await ctrl.start()
    } catch {
      // El error ya fue notificado por el subscribe del controller.
    }
  }, [ensureController])

  const stop = useCallback(async (): Promise<CaptureResult | null> => {
    const ctrl = controllerRef.current
    if (!ctrl || ctrl.state !== 'recording') {
      return null
    }
    try {
      const result = await ctrl.stop()
      return result
    } catch {
      // El error ya fue notificado por el subscribe.
      return null
    }
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.dispose()
    setState({
      state: 'idle',
      result: null,
      error: null,
      elapsedSeconds: 0,
      elapsedFormatted: '00:00',
    })
  }, [])

  const consumeResult = useCallback(() => {
    setState((prev) => (prev.result ? { ...prev, result: null } : prev))
  }, [])

  useLayoutEffect(() => {
    if (session.logoutPending) controllerRef.current?.dispose()
  }, [session.logoutPending])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) return
      if (controllerRef.current?.state === 'requesting') cancel()
      else void stop()
    }
    window.addEventListener('pagehide', cancel)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', cancel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [cancel, stop])

  // Solo sale de 'error': no altera una captura en curso ni un resultado pendiente.
  const resetError = useCallback(() => {
    setState((prev) => (prev.state === 'error' ? { ...prev, state: 'idle', error: null } : prev))
  }, [])

  return {
    ...state,
    start,
    stop,
    cancel,
    consumeResult,
    resetError,
  }
}
