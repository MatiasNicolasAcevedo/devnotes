import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { ApiError } from '../../services/http'
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

/**
 * Conflicto de revisión pendiente (409 en PUT o DELETE). Es un hecho del documento, no la acción elegida:
 * mientras no sea null la UI muestra Copiar / Recargar con confirmación / Nueva nota. Sin reintento automático.
 */
export type VoiceConflict = 'update' | 'delete'

/**
 * Resultado de un guardado: solo 'saved' significa ACK aplicado al borrador vigente.
 * 'stale': la respuesta llegó cuando el borrador ya era otro documento y se ignoró.
 */
export type SaveOutcome = 'saved' | 'conflict' | 'gone' | 'error' | 'skipped' | 'stale'

/** Resultado de un borrado: solo 'deleted' significa 204 aplicado; 'stale' como en SaveOutcome. */
export type DeleteOutcome = 'deleted' | 'conflict' | 'gone' | 'error' | 'skipped' | 'stale'

function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

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
  /** Conflicto de revisión pendiente de resolver, o null. */
  conflict: VoiceConflict | null
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
    conflict: null,
  })

  // Generación del último render confirmado: las operaciones async la comparan al volver.
  const committedGeneration = useRef(state.generation)
  useLayoutEffect(() => {
    committedGeneration.current = state.generation
  }, [state.generation])

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
      conflict: null,
    }))
  }, [])

  /**
   * Carga una nota existente en el borrador. Sin `force` nunca pisa cambios sin guardar (la página
   * resuelve antes el diálogo de cambios); `force` solo tras confirmación explícita (Recargar en conflicto).
   */
  const loadNote = useCallback((detail: VoiceNoteDetail, options?: { force?: boolean }) => {
    setState((prev) => {
      if (prev.documentState === 'dirty' && !options?.force) {
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
        conflict: null,
      }
    })
  }, [])

  /** Aplica la respuesta de transcripción al borrador. Solo si coincide la generación. */
  const applyTranscription = useCallback((text: string, generation: number) => {
    setState((prev) => {
      if (prev.generation !== generation) return prev
      // S-105 §1: una nota guardada no se reemplaza grabando; el audio se descarta.
      if (prev.noteId != null) {
        return {
          ...prev,
          captureState: 'idle',
          captureResult: null,
          captureError: null,
          elapsedSeconds: 0,
          elapsedFormatted: '00:00',
        }
      }
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
   * Guarda el borrador y resuelve con el resultado, para que quien lo invoca (p. ej. «Guardar y
   * continuar» en VoicePage) solo continúe tras el ACK del servidor.
   * - Sin noteId: POST create.
   * - Con noteId + revision: PUT con CAS; 409 deja `conflict = 'update'` sin reintento;
   *   404 (borrada en otra sesión) desvincula el texto como borrador nuevo ('gone').
   * Si el texto cambió durante el guardado, el documento queda dirty frente al nuevo ACK.
   * La respuesta solo se aplica si la generación no cambió (reset/carga de otra nota en medio).
   */
  const save = useCallback(async (): Promise<SaveOutcome> => {
    if (isTextEmpty || createMutation.isPending || updateMutation.isPending) return 'skipped'

    const { noteId, revision, text, generation } = state
    setState((prev) => ({ ...prev, documentState: 'saving', conflict: null }))

    // Solo se aplica si el borrador sigue siendo el mismo documento que inició la operación.
    const isCurrent = () => committedGeneration.current === generation
    const applyIfCurrent = (next: (prev: VoiceDraftState) => VoiceDraftState) => {
      setState((prev) => (prev.generation === generation ? next(prev) : prev))
    }

    try {
      const response =
        !noteId || revision == null
          ? await createMutation.mutateAsync(text)
          : await updateMutation.mutateAsync({ id: noteId, text, expectedRevision: revision })
      if (!isCurrent()) return 'stale'
      applyIfCurrent((prev) => ({
        ...prev,
        noteId: response.id,
        revision: response.revision,
        documentState: prev.text === text ? 'clean' : 'dirty',
      }))
      return 'saved'
    } catch (error) {
      if (!isCurrent()) return 'stale'
      if (noteId != null && isNotFound(error)) {
        applyIfCurrent((prev) => ({
          ...prev,
          documentState: 'dirty',
          noteId: null,
          revision: null,
          generation: prev.generation + 1,
        }))
        return 'gone'
      }
      const conflict = noteId != null && isConflict(error)
      applyIfCurrent((prev) => ({
        ...prev,
        documentState: 'dirty',
        conflict: conflict ? 'update' : prev.conflict,
      }))
      return conflict ? 'conflict' : 'error'
    }
  }, [state, isTextEmpty, createMutation, updateMutation])

  /**
   * Elimina la nota actual con CAS (solo guardada y clean) y espera el 204.
   * 409 deja `conflict = 'delete'`; 404 conserva el texto como borrador nuevo sin guardar.
   */
  const deleteNote = useCallback(async (): Promise<DeleteOutcome> => {
    const { noteId, revision, documentState, generation } = state
    if (!noteId || revision == null || documentState !== 'clean' || deleteMutation.isPending) {
      return 'skipped'
    }

    setState((prev) => ({ ...prev, documentState: 'deleting', conflict: null }))

    // Solo se aplica si el borrador sigue siendo el mismo documento que inició la operación.
    const isCurrent = () => committedGeneration.current === generation
    const applyIfCurrent = (next: (prev: VoiceDraftState) => VoiceDraftState) => {
      setState((prev) => (prev.generation === generation ? next(prev) : prev))
    }

    try {
      await deleteMutation.mutateAsync({ id: noteId, expectedRevision: revision })
      if (!isCurrent()) return 'stale'
      applyIfCurrent((prev) => ({
        ...prev,
        text: '',
        documentState: 'new',
        captureState: 'idle',
        captureResult: null,
        captureError: null,
        elapsedFormatted: '00:00',
        elapsedSeconds: 0,
        noteId: null,
        revision: null,
        generation: prev.generation + 1,
        conflict: null,
      }))
      return 'deleted'
    } catch (error) {
      if (!isCurrent()) return 'stale'
      let outcome: DeleteOutcome
      if (isConflict(error)) {
        applyIfCurrent((prev) => ({ ...prev, documentState: 'clean', conflict: 'delete' }))
        outcome = 'conflict'
      } else if (isNotFound(error)) {
        applyIfCurrent((prev) => ({
          ...prev,
          documentState: 'dirty',
          noteId: null,
          revision: null,
          generation: prev.generation + 1,
        }))
        outcome = 'gone'
      } else {
        applyIfCurrent((prev) => ({ ...prev, documentState: 'clean' }))
        outcome = 'error'
      }
      return outcome
    }
  }, [state, deleteMutation])

  /** Cierra el conflicto sin cambiar el borrador (sigue dirty; un nuevo guardado vuelve a usar CAS). */
  const dismissConflict = useCallback(() => {
    setState((prev) => ({ ...prev, conflict: null }))
  }, [])

  /** «Nueva nota» desde un conflicto: conserva el texto y lo desvincula para guardarlo con POST. */
  const detachAsNewNote = useCallback(() => {
    setState((prev) => ({
      ...prev,
      documentState: prev.text.replace(/\s/g, '').length > 0 ? 'dirty' : 'new',
      noteId: null,
      revision: null,
      generation: prev.generation + 1,
      conflict: null,
    }))
  }, [])

  /** Copia el texto actual al portapapeles. */
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(state.text)
      return true
    } catch {
      return false
    }
  }, [state.text])

  /**
   * Reinicia el borrador a estado vacío. Incrementa la generación (no la vuelve a 0) para que
   * respuestas en vuelo del documento anterior se ignoren.
   */
  const reset = useCallback(() => {
    setState((prev) => ({
      text: '',
      documentState: 'new',
      captureState: 'idle',
      captureResult: null,
      captureError: null,
      elapsedFormatted: '00:00',
      elapsedSeconds: 0,
      noteId: null,
      revision: null,
      generation: prev.generation + 1,
      conflict: null,
    }))
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
    dismissConflict,
    detachAsNewNote,
    copyToClipboard,
    reset,
    setCaptureState,
    transcribeMutation,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
