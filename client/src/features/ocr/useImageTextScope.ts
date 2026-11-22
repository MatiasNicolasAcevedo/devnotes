import { useQueryClient } from '@tanstack/react-query'
import { useLayoutEffect, useRef } from 'react'
import type { RequestOptions } from '../../services/http'
import { authQueryKeys, renewCsrf, withCsrfRenewal, type AuthUser } from '../auth/api'
import type { SpaceScope } from '../spaces/spaceContext'

export type ImageTextScope = SpaceScope & { csrfReady: boolean }

export function useImageTextScope({ owner, space }: ImageTextScope) {
  const client = useQueryClient()
  const mounted = useRef(false)
  useLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const key = ['image-texts', owner, space] as const
  const sameAccount = () =>
    client.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner
  const isCurrent = () => mounted.current && sameAccount()
  const invalidateList = () => {
    if (sameAccount()) return client.invalidateQueries({ queryKey: [...key, 'list'] })
  }

  async function mutate<T>(
    operation: (options: Pick<RequestOptions, 'sessionIsCurrent'>) => Promise<T>,
  ) {
    return withCsrfRenewal(
      () => operation({ sessionIsCurrent: isCurrent }),
      () => (isCurrent() ? renewCsrf() : Promise.resolve()),
    )
  }

  return { key, isCurrent, invalidateList, mutate, client }
}
