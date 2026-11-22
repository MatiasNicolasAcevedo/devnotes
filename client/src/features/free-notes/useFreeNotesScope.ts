import { useQueryClient } from '@tanstack/react-query'
import { useLayoutEffect, useRef } from 'react'
import type { RequestOptions } from '../../services/http'
import { authQueryKeys, renewCsrf, withCsrfRenewal, type AuthUser } from '../auth/api'
import { useSession } from '../auth/sessionContext'
import { useSpaceScope } from '../spaces/spaceContext'

export function useFreeNotesScope() {
  const { owner, space } = useSpaceScope()
  const { csrfReady, logoutPending } = useSession()
  const client = useQueryClient()
  const mounted = useRef(false)
  useLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const key = ['free-notes', owner, space] as const
  const sameAccount = () =>
    client.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner
  const isCurrent = () => mounted.current && sameAccount()
  const invalidate = (id: string, deleted = false) => {
    if (!sameAccount()) return
    void client.invalidateQueries({ queryKey: [...key, 'list'] })
    const detail = { queryKey: [...key, 'detail', id], exact: true }
    if (deleted) client.removeQueries(detail)
    else void client.invalidateQueries({ ...detail, refetchType: 'none' })
  }

  async function mutate<T>(
    operation: (options: Pick<RequestOptions, 'sessionIsCurrent'>) => Promise<T>,
  ) {
    return withCsrfRenewal(
      () => operation({ sessionIsCurrent: isCurrent }),
      () => (isCurrent() ? renewCsrf() : Promise.resolve()),
    )
  }

  return { space, key, isCurrent, invalidate, mutate, canWrite: csrfReady && !logoutPending }
}
