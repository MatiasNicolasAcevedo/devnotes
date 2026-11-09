import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { type CaptureResult, type CaptureState } from './recorder'
import { useCreateVoiceNote, useTranscribeAudio } from './useVoiceNotes'

/**
 * Validación de texto de nota de voz (S-105: 1…50000 UTF-16, al menos un carácter no White_Space,
 * sin U+0000 ni sustitutos aislados, CRLF/CR normalizados a LF).
 */
export const voiceNoteTextSchema = z
  .string()
  .refine((s) => {
    // Normalizar CRLF/CR a LF
    const normalized = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // Sin U+0000 ni sustitutos aislados
    if (/[\u0000]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<=[\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test(normalized)) {
      return false
    }
    // Al menos un carácter fuera de Unicode White_Space
    const trimmed = normalized.replace(/\s/g, '')
    return trimmed.length > 0
  }, 'El texto debe contener al menos un carácter válido.')
  .refine((s) => {
    const normalized = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    return normalized.length >= 1 && normalized.length <= 50000
  }, 'El texto debe tener entre 1 y 50 000 caracteres.')

/** Estado del documento: new/clean/dirty/saving/deleting/error. */
export type DocumentState = 'new' | 'clean' | 'dirty' | 'saving' | 'error'

/** Estado combinado del workspace de voz. */
export interface VoiceDraftState {
  /** Texto actual del borrador. */
  text: string
  /** Estado del documento. */
  documentState: DocumentState
  /** Estado de la captura. */
  captureState: CaptureState
  /** Resultado de captura pendiente de transcripción. */
  captureResult: CaptureResult | null
  /** Error de captura activo. */
  captureError: Error | null
  /** Duración formateada mientras graba. */
  elapsedFormatted: string
  /** Duración en segundos mientras graba. */
  elapsedSeconds: number
  /** ID de la nota guardada (solo tras guardar). */
  noteId: string | null
  /** Revisión actual de la nota guardada. */
  revision: number | null
  /** Generación actual para evitar respuestas tardías. */
  generation: number
}

/**
 * Workspace en memoria para el borrador de una nota de voz nueva.
 *
 * Sigue el precedente de DailyDraftWorkspace: estado local por propietario sobre el outlet,
 * sin persistencia en navegador. Maneja captura → transcripción → edición → guardado manual.
 * No guarda implícitamente: el usuario debe presionar Guardar explícitamente.
 */
export function useVoiceDraft() {
  const [state, setState] = useState<VoiceDraftState>({
    text: '',
    documentState: 'new',
    captureState: 'idle',
    captureResult: null,
    captureError: null,
    elapsedFormatted: '00:00',
    elapsedSeconds: 0,
    noteId: null,
    revision: null,
    generation: 0,
  })

  const transcribeMutation = useTranscribeAudio()
  const createMutation = useCreateVoiceNote()

  const isBusy = useMemo(() => {
    return (
      state.captureState === 'recording' ||
      state.captureState === 'stopping' ||
      state.captureState === 'requesting' ||
      transcribeMutation.isPending ||
      createMutation.isPending
    )
  }, [state.captureState, transcribeMutation.isPending, createMutation.isPending])

  const isTextEmpty = useMemo(() => {
    return state.text.replace(/\s/g, '').length === 0
  }, [state.text])

  /** Normaliza el texto (CRLF/CR → LF) y lo establece en el borrador. */
  const setText = useCallback((text: string) => {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    setState((prev) => ({
      ...prev,
      text: normalized,
      documentState: normalized.replace(/\s/g, '').length > 0 ? 'dirty' : prev.documentState === 'new' ? 'new' : 'dirty',
    }))
  }, [])

  /** Aplica la respuesta de transcripción al borrador. Solo si coincide la generación. */
  const applyTranscription = useCallback(
    (text: string, generation: number) => {
      setState((prev) => {
        if (prev.generation !== generation) return prev
        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        return {
          ...prev,
          text: normalized,
          documentState: 'dirty',
          captureState: 'idle',
          captureResult: null,
          captureError: null,
          elapsedSeconds: 0,
          elapsedFormatted: '00:00',
        }
      })
    },
    [],
  )

  /** Inicia la transcripción del blob capturado. */
  const transcribe = useCallback(() => {
    const { captureResult, generation } = state
    if (!captureResult || !captureResult.blob) return

    // Incrementar generación para rastrear esta operación
    const currentGen = generation + 1
    setState((prev) => ({
      ...prev,
      captureState: 'stopping',
      generation: currentGen,
    }))

    transcribeMutation.mutate(captureResult.blob, {
      onSuccess: (response) => {
        applyTranscription(response.text, currentGen)
      },
      onError: (error) => {
        setState((prev) => {
          if (prev.generation !== currentGen) return prev
          return {
            ...prev,
            captureState: 'error',
            captureError: error instanceof Error ? error : new Error('Error de transcripción.'),
          }
        })
      },
    })
  }, [state.captureResult, state.generation, applyTranscription, transcribeMutation])

  /** Guarda el borrador como nota nueva. */
  const save = useCallback(() => {
    if (isTextEmpty || createMutation.isPending) return

    setState((prev) => ({ ...prev, documentState: 'saving' }))
    createMutation.mutate(state.text, {
      onSuccess: (response) => {
        setState((prev) => ({
          ...prev,
          noteId: response.id,
          revision: response.revision,
          documentState: 'clean',
        }))
      },
      onError: () => {
        setState((prev) => ({
          ...prev,
          documentState: 'dirty', // Conservar borrador ante error
        }))
      },
    })
  }, [state.text, isTextEmpty, createMutation.isPending, createMutation])

  /** Copia el texto actual al portapapeles. */
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(state.text)
      return true
    } catch {
      return false
    }
  }, [state.text])

  /** Reinicia el borrador a estado vacío. */
  const reset = useCallback(() => {
    setState({
      text: '',
      documentState: 'new',
      captureState: 'idle',
      captureResult: null,
      captureError: null,
      elapsedFormatted: '00:00',
      elapsedSeconds: 0,
      noteId: null,
      revision: null,
      generation: 0,
    })
  }, [])

  /** Actualiza el estado de captura desde useVoiceRecorder. */
  const setCaptureState = useCallback(
    (
      captureState: CaptureState,
      captureResult?: CaptureResult | null,
      captureError?: Error | null,
      elapsedSeconds?: number,
      elapsedFormatted?: string,
    ) => {
      setState((prev) => ({
        ...prev,
        captureState,
        captureResult: captureResult ?? prev.captureResult,
        captureError: captureError ?? prev.captureError,
        elapsedSeconds: elapsedSeconds ?? prev.elapsedSeconds,
        elapsedFormatted: elapsedFormatted ?? prev.elapsedFormatted,
      }))
    },
    [],
  )

  return {
    state,
    isBusy,
    isTextEmpty,
    setText,
    transcribe,
    save,
    copyToClipboard,
    reset,
    setCaptureState,
    transcribeMutation,
    createMutation,
  }
}
