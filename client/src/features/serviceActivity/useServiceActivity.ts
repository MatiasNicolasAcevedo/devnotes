import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import { authQueryKeys, type AuthUser } from '../auth/api'
import {
  fetchCapabilities,
  fetchStatus,
  pauseWindow,
  serviceActivityQueryKeys,
  startWindow,
} from './api'

/** Margen para volver a preguntar la fecha de servicio al navegar o recuperar el foco. Nunca hay timer propio. */
const CAPABILITIES_STALE_MS = 60_000

/** La identidad `owner` sigue siendo la de la sesión vigente: guarda de callbacks tardíos. */
function useOwnerIsCurrent(owner: string) {
  const queryClient = useQueryClient()
  return useCallback(
    () => queryClient.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner,
    [queryClient, owner],
  )
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

/** Documento visible para el usuario: una pestaña en segundo plano o una app suspendida no activa la ventana. */
export function useDocumentVisible() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === 'visible',
    () => false,
  )
}

/**
 * Disponibilidad de la ventana para la cuenta. Se revalida al recuperar el foco o al navegar si pasó un minuto, así un
 * día nuevo se detecta por una interacción real del dueño y no por un timer nocturno.
 */
export function useServiceActivityCapabilities(owner: string) {
  const isCurrent = useOwnerIsCurrent(owner)
  const queryClient = useQueryClient()
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const queryKey = serviceActivityQueryKeys.capabilities(owner)

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    void queryClient.refetchQueries({
      queryKey: serviceActivityQueryKeys.capabilities(owner),
      stale: true,
    })
  }, [pathname, owner, queryClient])

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchCapabilities({ signal, sessionIsCurrent: isCurrent }),
    staleTime: CAPABILITIES_STALE_MS,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

/**
 * Pide la ventana del día una sola vez por cuenta y fecha de servicio, con el documento visible y el CSRF listo. La
 * fecha es la del servidor. El intento se registra antes de enviar: un error no reintenta, no entra en bucle de renders
 * y no bloquea el editor. Una respuesta que llega con otra identidad (logout o cambio de cuenta) se ignora.
 */
export function useDailyVisit(owner: string, csrfReady: boolean, serviceDate: string | null) {
  const queryClient = useQueryClient()
  const isCurrent = useOwnerIsCurrent(owner)
  const visible = useDocumentVisible()
  const attempted = useRef(new Set<string>())

  useEffect(() => {
    if (!csrfReady || !visible || serviceDate === null || !isCurrent()) return
    const attempt = `${owner}|${serviceDate}`
    if (attempted.current.has(attempt)) return
    attempted.current.add(attempt)
    startWindow('visit', { sessionIsCurrent: isCurrent }).then(
      () => {
        if (isCurrent()) {
          void queryClient.invalidateQueries({ queryKey: serviceActivityQueryKeys.status(owner) })
        }
      },
      () => {
        // Sin reintento automático: el detalle muestra el estado real y ofrece la acción explícita.
      },
    )
  }, [owner, csrfReady, visible, serviceDate, isCurrent, queryClient])
}

/** Estado de la ventana: solo mientras el detalle está abierto, sin polling oculto ni revalidación por foco. */
export function useServiceActivityStatus(owner: string, open: boolean) {
  const isCurrent = useOwnerIsCurrent(owner)
  return useQuery({
    queryKey: serviceActivityQueryKeys.status(owner),
    queryFn: ({ signal }) => fetchStatus({ signal, sessionIsCurrent: isCurrent }),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export type WindowAction = 'pause' | 'resume'

/** Pausa o reanuda por acción explícita del dueño. Tras responder invalida el estado; nunca escribe la cache. */
export function useServiceActivityAction(owner: string) {
  const queryClient = useQueryClient()
  const isCurrent = useOwnerIsCurrent(owner)
  return useMutation({
    mutationFn: (action: WindowAction) =>
      action === 'pause'
        ? pauseWindow({ sessionIsCurrent: isCurrent })
        : startWindow('resume', { sessionIsCurrent: isCurrent }),
    retry: false,
    onSettled: () => {
      if (isCurrent()) {
        return queryClient.invalidateQueries({ queryKey: serviceActivityQueryKeys.status(owner) })
      }
    },
  })
}
