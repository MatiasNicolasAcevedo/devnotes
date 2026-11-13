import { useQuery } from '@tanstack/react-query'
import { fetchReadiness, systemQueryKeys } from './api'

/** Revalidación de readiness con el documento visible (S-111): nunca en segundo plano ni cada 5 s. */
export const READINESS_INTERVAL_MS = 60_000

/**
 * Disponibilidad del servidor para el indicador de conexión: al montar, al recuperar el foco y cada 60 s solo mientras
 * el documento está visible. No es un keepalive: una pestaña oculta o una app suspendida no consulta.
 */
export function useReadiness() {
  return useQuery({
    queryKey: systemQueryKeys.readiness,
    queryFn: ({ signal }) => fetchReadiness(signal),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: READINESS_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })
}
