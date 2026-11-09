import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { type CaptureResult, type CaptureState } from './recorder'
import type { VoiceNoteDetail } from './api'
import {
  useCreateVoiceNote,
  useDeleteVoiceNote,
  useTranscribeAudio,
  useUpdateVoiceNote,
} from './useVoiceNotes'

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
    if (
      /\0|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<=[\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test(normalized)
    ) {
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
export type DocumentState = 'new' | 'clean' | 'dirty' | 'saving' | 'deleting' | 'error'

/** Resultado de un conflicto de revisión. */
export type ConflictResolution = 'none' | 'copy' | 'reload' | 'newNote'

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
  /** Si hay un conflicto de revisión pendiente de resolver. */
  conflictResolution: ConflictResolution
}

/**
 * Workspace en memoria para el borrador de una nota de voz.
 *
 * Sigue el precedente de DailyDraftWorkspace: estado local por propietario sobre el outlet,
 * sin persistencia en navegador. Soporta:
 * - Nueva nota: captura → transcripción → edición → guardado manual (POST).
 * - Nota existente: carga detalle → edición → guardado con CAS (PUT) → borrado con CAS (DELETE).
 * - Dirty check: si el texto difiere del ACK, pide resolver antes de cambiar de nota.
 * - Conflicto 409: conserva borrador, ofrece copiar/recargar/nueva nota.
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
    conflictResolution: 'none',
  })

  const transcribeMutation = useTranscribeAudio()
  const createMutation = useCreateVoiceNote()
  const updateMutation = useUpdateVoiceNote()
  const deleteMutation = useDeleteVoiceNote()

  const isBusy = useMemo(() => {
    return (
      state.captureState === 'recording' ||
      state.captureState === 'stopping' ||
      state.captureState === 'requesting' ||
      transcribeMutation.isPending ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending
    )
  }, [
    state.captureState,
    transcribeMutation.isPending,
    createMutation.isPending,
    updateMutation.isPending,
    deleteMutation.isPending,
  ])

  const isTextEmpty = useMemo(() => {
    return state.text.replace(/\s/g, '').length === 0
  }, [state.text])

  /**
   * Indica si el borrador tiene cambios sin guardar comparados con el ACK del servidor.
   * new → no dirty (aún no hay ACK).
   * clean → no dirty.
   * dirty → sí.
   */
  const isDirty = useMemo(() => {
    return state.documentState === 'dirty'
  }, [state.documentState])

  /** Normaliza el texto (CRLF/CR → LF) y lo establece en el borrador. */
  const setText = useCallback((text: string) => {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    setState((prev) => ({
      ...prev,
      text: normalized,
      documentState:
        normalized.replace(/\s/g, '').length > 0
          ? 'dirty'
          : prev.documentState === 'new'
            ? 'new'
            : 'dirty',
      conflictResolution: 'none',
    }))
  }, [])

  /**
   * Carga una nota existente en el borrador.
   * Devuelve true si se cargó, false si se rechazó por dirty.
   */
  const loadNote = useCallback((detail: VoiceNoteDetail): boolean => {
    let rejected = false
    setState((prev) => {
      // Si hay cambios sin guardar, no sobrescribir
      if (prev.documentState === 'dirty') {
        rejected = true
        return prev
      }
      const normalized = detail.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      return {
        ...prev,
        text: normalized,
        documentState: 'clean',
        noteId: detail.id,
        revision: detail.revision,
        captureState: 'idle',
        captureResult: null,
        captureError: null,
        elapsedSeconds: 0,
        elapsedFormatted: '00:00',
        generation: prev.generation + 1,
        conflictResolution: 'none',
      }
    })
    return !rejected
  }, [])

  /** Aplica la respuesta de transcripción al borrador. Solo si coincide la generación. */
  const applyTranscription = useCallback((text: string, generation: number) => {
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
  }, [])

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
  }, [state, applyTranscription, transcribeMutation])

  /**
   * Guarda el borrador.
   * - Si es nueva (sin noteId): POST create.
   * - Si es existente (con noteId + revision): PUT update con CAS.
   */
  const save = useCallback(() => {
    if (isTextEmpty || createMutation.isPending || updateMutation.isPending) return

    const { noteId, revision, text } = state

    if (!noteId || revision == null) {
      // Nueva nota: POST
      setState((prev) => ({ ...prev, documentState: 'saving' }))
      createMutation.mutate(text, {
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
            documentState: 'dirty',
          }))
        },
      })
    } else {
      // Nota existente: PUT con CAS
      setState((prev) => ({ ...prev, documentState: 'saving' }))
      updateMutation.mutate(
        { id: noteId, text, expectedRevision: revision },
        {
          onSuccess: (response) => {
            setState((prev) => ({
              ...prev,
              revision: response.revision,
              documentState: 'clean',
            }))
          },
          onError: (error) => {
            setState((prev) => {
              // Si es 409, marcar conflicto
              if (
                error &&
                typeof error === 'object' &&
                'status' in error &&
                (error as { status: number }).status === 409
              ) {
                return {
                  ...prev,
                  documentState: 'dirty',
                  conflictResolution: 'none',
                }
              }
              return {
                ...prev,
                documentState: 'dirty',
              }
            })
          },
        },
      )
    }
  }, [state, isTextEmpty, createMutation, updateMutation])

  /**
   * Elimina la nota actual con CAS.
   * Solo si la nota está guardada y clean.
   */
  const deleteNote = useCallback(() => {
    const { noteId, revision, documentState } = state
    if (!noteId || revision == null || documentState !== 'clean' || deleteMutation.isPending) return

    setState((prev) => ({ ...prev, documentState: 'deleting' }))
    deleteMutation.mutate(
      { id: noteId, expectedRevision: revision },
      {
        onSuccess: () => {
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
            conflictResolution: 'none',
          })
        },
        onError: (error) => {
          setState((prev) => {
            if (error && typeof error === 'object' && 'status' in error) {
              const status = (error as { status: number }).status
              if (status === 409) {
                return {
                  ...prev,
                  documentState: 'dirty',
                  conflictResolution: 'none',
                }
              }
              if (status === 404) {
                // Nota ya eliminada, limpiar borrador
                return {
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
                  conflictResolution: 'none',
                }
              }
            }
            return {
              ...prev,
              documentState: 'clean',
            }
          })
        },
      },
    )
  }, [state, deleteMutation])

  /**
   * Maneja el conflicto de revisión (409).
   * - 'copy': copiar texto al portapapeles.
   * - 'reload': recargar la nota desde el servidor (el caller debe invocar loadNote con el detalle actualizado).
   * - 'newNote': reiniciar con el texto actual como nueva nota.
   */
  const resolveConflict = useCallback(
    async (resolution: 'copy' | 'reload' | 'newNote') => {
      setState((prev) => ({ ...prev, conflictResolution: resolution }))

      if (resolution === 'copy') {
        try {
          await navigator.clipboard.writeText(state.text)
        } catch {
          // Silenciar — el texto sigue en el borrador
        }
      } else if (resolution === 'newNote') {
        setState((prev) => ({
          ...prev,
          text: prev.text,
          documentState: prev.text.replace(/\s/g, '').length > 0 ? 'dirty' : 'new',
          noteId: null,
          revision: null,
          generation: prev.generation + 1,
        }))
      }
      // 'reload': el caller debe cargar el detalle actualizado
    },
    [state.text],
  )

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
      conflictResolution: 'none',
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
    isDirty,
    setText,
    loadNote,
    transcribe,
    save,
    deleteNote,
    resolveConflict,
    copyToClipboard,
    reset,
    setCaptureState,
    transcribeMutation,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
