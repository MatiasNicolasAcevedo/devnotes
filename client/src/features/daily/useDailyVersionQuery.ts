import { useQuery } from '@tanstack/react-query'
import { getDailyVersion, listDailyVersions, dailyVersionKeys } from './versionApi'
import type { Space } from '../spaces/space'

/**
 * Hook de lectura del historial paginado de versiones por identidad.
 *
 * - Solo de lectura: no programa guardado ni monta pantalla.
 * - Habilitado solo con sesión actual (evita lecturas con sesión expirada).
 * - Keys privadas por identidad: invalidación no escribe cache con respuestas de otra identidad.
 * - Cancela lectura previa al cambiar página o identidad.
 * - 404 se distingue de error/403: lectura no genera mutación automática.
 */
export function useDailyVersionListQuery(
  owner: string,
  space: Space,
  page?: number,
  sessionIsCurrent?: () => boolean,
) {
  const keys = dailyVersionKeys(owner, space)

  return useQuery({
    queryKey: keys.list(page),
    queryFn: ({ signal }) => listDailyVersions(space, page, signal, sessionIsCurrent),
    enabled: sessionIsCurrent === undefined || sessionIsCurrent(),
    retry: false,
    staleTime: 0,
  })
}

/**
 * Hook de lectura del detalle de una versión por identidad y fecha.
 *
 * - Solo de lectura: no programa guardado ni monta pantalla.
 * - Habilitado solo con sesión actual (evita lecturas con sesión expirada).
 * - Keys privadas por identidad+fecha: invalidación no escribe cache con respuestas de otra identidad.
 * - Cancela lectura previa al cambiar fecha o identidad.
 * - 404 se distingue de error/403: lectura no genera mutación automática.
 */
export function useDailyVersionDetailQuery(
  owner: string,
  space: Space,
  date: string,
  sessionIsCurrent?: () => boolean,
) {
  const keys = dailyVersionKeys(owner, space)

  return useQuery({
    queryKey: keys.detail(date),
    queryFn: ({ signal }) => getDailyVersion(space, date, signal, sessionIsCurrent),
    enabled: sessionIsCurrent === undefined || sessionIsCurrent(),
    retry: false,
    staleTime: 0,
  })
}

/**
 * Invalida las queries de detalle y lista de versiones para una identidad.
 * Se usa tras mutaciones (T-013) para refetch sin escribir la cache con setQueryData.
 */
export function invalidateDailyVersion(
  queryClient: {
    invalidateQueries: (opts: { queryKey: readonly unknown[] }) => Promise<void>
  },
  owner: string,
  space: Space,
  date?: string,
) {
  const keys = dailyVersionKeys(owner, space)
  if (date) {
    return queryClient.invalidateQueries({ queryKey: keys.detail(date) })
  }
  return queryClient.invalidateQueries({ queryKey: keys.list() })
}
