import { useQueryClient, type Query } from '@tanstack/react-query'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../services/http'
import { sessionEvents } from '../../services/sessionEvents'
import { authQueryKeys, type AuthUser } from './api'
import { AuthSessionContext, type AuthSession } from './sessionContext'
import { useAuthSession, useCsrfToken, useLogout } from './useAuthSession'

const isAuthQuery = (query: Query) => query.queryKey[0] === authQueryKeys.all[0]
const isCsrfQuery = (query: Query) =>
  isAuthQuery(query) && query.queryKey[1] === authQueryKeys.csrf[1]
const notCsrfQuery = (query: Query) => !isCsrfQuery(query)

/**
 * Estado de sesión de la SPA (S-001 · Frontend). Consulta me, obtiene el CSRF antes de habilitar mutaciones y es el
 * único que interpreta el canal de 401: con un usuario autenticado significa que la sesión terminó. Al terminar o al
 * cambiar de identidad descarta la cache Query privada (todo lo que no es `auth`) y las mutaciones; el shell remonta
 * las rutas por identidad para que tampoco sobreviva estado local de componentes. Nunca reintenta un 401 ni redirige
 * solo: el usuario decide volver a ingresar.
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [sessionEnded, setSessionEnded] = useState(false)

  const discardPrivateData = useCallback(() => {
    queryClient.removeQueries({ predicate: (query) => !isAuthQuery(query) })
    queryClient.getMutationCache().clear()
  }, [queryClient])

  const session = useAuthSession((user) => {
    const previous = queryClient.getQueryData<AuthUser | null>(authQueryKeys.session)
    if (user === null || previous === undefined || previous?.id === user.id) return
    // Se autenticó otra identidad (p. ej. desde otra pestaña): nada de la anterior se muestra y el CSRF se renueva.
    discardPrivateData()
    setSessionEnded(false)
    void queryClient.resetQueries({ queryKey: authQueryKeys.csrf })
  })
  const csrf = useCsrfToken()
  const logoutMutation = useLogout()
  const { mutateAsync: postLogout, reset: resetLogout } = logoutMutation

  const endSession = useCallback(
    async (reason: 'expired' | 'logout', owner: string) => {
      const isCurrent = () =>
        queryClient.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner
      if (!isCurrent()) return false
      // Cancelar antes de limpiar: una respuesta en vuelo no puede volver a poblar la cache.
      await queryClient.cancelQueries({ predicate: notCsrfQuery })
      if (!isCurrent()) return false
      discardPrivateData()
      queryClient.setQueryData<AuthUser | null>(authQueryKeys.session, null)
      setSessionEnded(reason === 'expired')
      return true
    },
    [queryClient, discardPrivateData],
  )

  useEffect(
    () =>
      sessionEvents.onUnauthorized(() => {
        // Para un visitante el 401 es la respuesta esperada; solo con un usuario conocido la sesión terminó.
        const user = queryClient.getQueryData<AuthUser | null>(authQueryKeys.session)
        if (user) void endSession('expired', user.id)
      }),
    [queryClient, endSession],
  )

  const logout = useCallback(async () => {
    const user = queryClient.getQueryData<AuthUser | null>(authQueryKeys.session)
    if (!user) return
    sessionEvents.notifyLogoutStarted()
    void queryClient.cancelQueries({ predicate: notCsrfQuery })
    try {
      await postLogout(user.id)
    } catch {
      // El error queda en la mutación: sin 204 no se afirma el cierre. Un 401 ya lo trató el canal como expiración.
      return
    }
    if (!(await endSession('logout', user.id))) return
    resetLogout()
    // El server borró la cookie CSRF: se obtiene la anónima antes de permitir otra mutación.
    await queryClient.resetQueries({ queryKey: authQueryKeys.csrf })
    if (queryClient.getQueryData<AuthUser | null>(authQueryKeys.session) === null) {
      void navigate('/login', { replace: true })
    }
  }, [queryClient, postLogout, resetLogout, endSession, navigate])

  const user = session.data ?? null
  const logoutForCurrentUser = !!user && logoutMutation.variables === user.id
  const value: AuthSession = {
    status: user
      ? 'authenticated'
      : session.isPending
        ? 'loading'
        : session.data === null
          ? 'visitor'
          : 'error',
    user,
    sessionError: session.error,
    retrySession: () => void session.refetch(),
    csrfReady: csrf.isSuccess && !csrf.isFetching,
    csrfError: csrf.error,
    retryCsrf: () => void csrf.refetch(),
    sessionEnded,
    logout: () => void logout(),
    logoutPending: logoutForCurrentUser && logoutMutation.isPending,
    logoutError:
      logoutForCurrentUser && !isUnauthorized(logoutMutation.error) ? logoutMutation.error : null,
  }

  return <AuthSessionContext value={value}>{children}</AuthSessionContext>
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}
