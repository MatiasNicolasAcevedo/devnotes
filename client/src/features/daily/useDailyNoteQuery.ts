import { useQuery } from '@tanstack/react-query'
import { getDailyNote, dailyNoteKeys } from './api'

/**
 * Hook de lectura de nota diaria por identidad y fecha.
 *
 * - Solo de lectura: no programa guardado ni monta pantalla.
 * - Habilitado solo con sesión actual (evita lecturas con sesión expirada).
 * - Keys privadas por identidad+fecha: invalidación no escribe cache con respuestas de otra identidad.
 * - Cancela lectura previa al cambiar fecha o identidad.
 * - 404 se distingue de error/403: lectura no genera PUT automático.
 *
 * Exporta invalidación de detalle/lista para T-016 sin setQueryData.
 */
export function useDailyNoteQuery(owner: string, date: string, sessionIsCurrent?: () => boolean) {
  const keys = dailyNoteKeys(owner)

  return useQuery({
    queryKey: keys.detail(date),
    queryFn: ({ signal }) => getDailyNote(date, signal, sessionIsCurrent),
    enabled: sessionIsCurrent === undefined || sessionIsCurrent(),
    retry: false,
    staleTime: 0,
  })
}

/**
 * Invalida las queries de detalle y lista para una identidad.
 * Se usa tras mutaciones (T-016) para refetch sin escribir la cache con setQueryData.
 */
export function invalidateDailyNote(
  queryClient: {
    invalidateQueries: (opts: { queryKey: readonly unknown[] }) => Promise<void>
  },
  owner: string,
  date?: string,
) {
  const keys = dailyNoteKeys(owner)
  if (date) {
    return queryClient.invalidateQueries({ queryKey: keys.detail(date) })
  }
  return queryClient.invalidateQueries({ queryKey: keys.list() })
}
