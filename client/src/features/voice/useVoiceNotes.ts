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
  type VoiceScope,
  type VoiceSessionCheck,
  voiceQueryKeys,
} from './api'

/** Sin espacio confirmado no hay operación privada posible: nunca se elige uno por defecto. */
function requireScope(scope: VoiceScope | null): VoiceScope {
  if (!scope) throw new Error('Sin espacio activo')
  return scope
}

/** Consulta capacidades de voz. */
export function useVoiceCapabilities(enabled = true) {
  return useQuery({
    queryKey: voiceQueryKeys.capabilities,
    queryFn: ({ signal }) => fetchVoiceCapabilities(signal),
    enabled,
  })
}

/** Lista paginada de notas propias del espacio confirmado. */
export function useVoiceNotes(scope: VoiceScope, params?: VoiceListParams) {
  return useQuery({
    queryKey: voiceQueryKeys.list(scope, params),
    queryFn: ({ signal }) => fetchVoiceNotes(scope.space, params, signal),
  })
}

/** Detalle de una nota específica dentro del espacio confirmado. */
export function useVoiceNote(scope: VoiceScope, id: string, listedRevision?: number) {
  return useQuery({
    queryKey: voiceQueryKeys.detail(scope, id),
    queryFn: ({ signal }) => fetchVoiceNote(scope.space, id, signal),
    enabled: !!id,
    refetchOnMount: (query) =>
      listedRevision === undefined
        ? true
        : query.state.data?.revision !== listedRevision && 'always',
  })
}

/** Mutación: transcribir audio a texto. Sin retry automático. */
export function useTranscribeAudio(sessionIsCurrent?: VoiceSessionCheck) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Blob | { file: Blob; signal: AbortSignal }) =>
      input instanceof Blob
        ? transcribeAudio(input)
        : transcribeAudio(input.file, input.signal, sessionIsCurrent),
    gcTime: 0,
    retry: false,
    onSuccess: () => {
      if (sessionIsCurrent && !sessionIsCurrent()) return
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.all })
    },
  })
}

/**
 * La nota ya no existe en el servidor (404 en PUT/DELETE): se refresca la lista y se descarta su
 * detalle cacheado, para que no se vuelva a abrir como si existiera.
 */
function forgetMissingNote(
  queryClient: QueryClient,
  scope: VoiceScope,
  id: string,
  error: unknown,
) {
  if (!(error instanceof ApiError) || error.status !== 404) return
  queryClient.removeQueries({ queryKey: voiceQueryKeys.detail(scope, id), exact: true })
  queryClient.invalidateQueries({ queryKey: voiceQueryKeys.lists(scope) })
}

// Las mutaciones del CRUD usan el `scope` del workspace que las creó (se remonta por identidad+espacio): un guardado
// en vuelo termina en su espacio de origen y solo invalida sus keys.

/** Mutación: crear nota. Invalida todas las páginas de la lista tras éxito. */
export function useCreateVoiceNote(scope: VoiceScope | null, sessionIsCurrent?: VoiceSessionCheck) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      createVoiceNote(requireScope(scope).space, text, sessionIsCurrent),
    onSuccess: () => {
      if (!scope || (sessionIsCurrent && !sessionIsCurrent())) return
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.lists(scope) })
    },
  })
}

/** Mutación: actualizar nota con CAS. Invalida detalle y lista. */
export function useUpdateVoiceNote(scope: VoiceScope | null, sessionIsCurrent?: VoiceSessionCheck) {
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
    }) => updateVoiceNote(requireScope(scope).space, id, text, expectedRevision, sessionIsCurrent),
    onSuccess: (_data, variables) => {
      if (!scope || (sessionIsCurrent && !sessionIsCurrent())) return
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.detail(scope, variables.id) })
      queryClient.invalidateQueries({ queryKey: voiceQueryKeys.lists(scope) })
    },
    onError: (error, variables) => {
      if (!scope || (sessionIsCurrent && !sessionIsCurrent())) return
      forgetMissingNote(queryClient, scope, variables.id, error)
    },
  })
}

/** Mutación: eliminar nota con CAS. Invalida detalle y lista; retrocede página si se vacía. */
export function useDeleteVoiceNote(scope: VoiceScope | null, sessionIsCurrent?: VoiceSessionCheck) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, expectedRevision }: { id: string; expectedRevision: number }) =>
      deleteVoiceNote(requireScope(scope).space, id, expectedRevision, sessionIsCurrent),
    onSuccess: (_data, variables) => {
      if (!scope || (sessionIsCurrent && !sessionIsCurrent())) return
      // Todo lo de voz de este espacio salvo el detalle borrado, que daría 404 si se volviera a pedir.
      const deletedDetail = voiceQueryKeys.detail(scope, variables.id)
      queryClient.invalidateQueries({
        queryKey: voiceQueryKeys.scope(scope),
        predicate: (query) => !deletedDetail.every((part, index) => query.queryKey[index] === part),
      })
    },
    onError: (error, variables) => {
      if (!scope || (sessionIsCurrent && !sessionIsCurrent())) return
      forgetMissingNote(queryClient, scope, variables.id, error)
    },
  })
}
