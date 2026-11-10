import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../services/http'
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

/**
 * La nota ya no existe en el servidor (404 en PUT/DELETE): se refresca la lista y se descarta su
 * detalle cacheado, para que no se vuelva a abrir como si existiera.
 */
function forgetMissingNote(queryClient: QueryClient, id: string, error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 404) return
  queryClient.removeQueries({ queryKey: voiceQueryKeys.detail(id), exact: true })
  queryClient.invalidateQueries({ queryKey: voiceQueryKeys.lists })
}

/** Mutación: crear nota. Invalida todas las páginas de la lista tras éxito. */
export function useCreateVoiceNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createVoiceNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.lists })
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
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.lists })
    },
    onError: (error, variables) => forgetMissingNote(queryClient, variables.id, error),
  })
}

/** Mutación: eliminar nota con CAS. Invalida detalle y lista; retrocede página si se vacía. */
export function useDeleteVoiceNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, expectedRevision }: { id: string; expectedRevision: number }) =>
      deleteVoiceNote(id, expectedRevision),
    onSuccess: (_data, variables) => {
      // Todo lo de voz salvo el detalle borrado, que daría 404 si se volviera a pedir.
      const deletedDetail = voiceQueryKeys.detail(variables.id)
      queryClient.invalidateQueries({
        queryKey: voiceQueryKeys.all,
        predicate: (query) => !deletedDetail.every((part, index) => query.queryKey[index] === part),
      })
    },
    onError: (error, variables) => forgetMissingNote(queryClient, variables.id, error),
  })
}
