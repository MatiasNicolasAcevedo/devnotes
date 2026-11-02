import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createVoiceNote,
  deleteVoiceNote,
  fetchVoiceCapabilities,
  fetchVoiceNote,
  fetchVoiceNotes,
  transcribeAudio,
  updateVoiceNote,
  type VoiceListParams,
  voiceQueryKeys,
} from './api'

/** Consulta capacidades de voz. */
export function useVoiceCapabilities() {
  return useQuery({
    queryKey: voiceQueryKeys.capabilities,
    queryFn: ({ signal }) => fetchVoiceCapabilities(signal),
  })
}

/** Lista paginada de notas propias. */
export function useVoiceNotes(params?: VoiceListParams) {
  return useQuery({
    queryKey: voiceQueryKeys.list(params),
    queryFn: ({ signal }) => fetchVoiceNotes(params, signal),
  })
}

/** Detalle de una nota específica. */
export function useVoiceNote(id: string) {
  return useQuery({
    queryKey: voiceQueryKeys.detail(id),
    queryFn: ({ signal }) => fetchVoiceNote(id, signal),
    enabled: !!id,
  })
}

/** Mutación: transcribir audio a texto. Sin retry automático. */
export function useTranscribeAudio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: Blob) => transcribeAudio(file),
    onSuccess: () => {
      // Invalidar lista para reflejar cambios posteriores
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.all })
    },
  })
}

/** Mutación: crear nota. Invalida lista tras éxito. */
export function useCreateVoiceNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createVoiceNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.list() })
    },
  })
}

/** Mutación: actualizar nota con CAS. Invalida detalle y lista. */
export function useUpdateVoiceNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      text,
      expectedRevision,
    }: {
      id: string
      text: string
      expectedRevision: number
    }) => updateVoiceNote(id, text, expectedRevision),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.list() })
    },
  })
}

/** Mutación: eliminar nota con CAS. Invalida detalle y lista; retrocede página si se vacía. */
export function useDeleteVoiceNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, expectedRevision }: { id: string; expectedRevision: number }) =>
      deleteVoiceNote(id, expectedRevision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.all })
    },
  })
}
