import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authQueryKeys, renewCsrf, withCsrfRenewal, type AuthUser } from '../auth/api'
import { useSession } from '../auth/sessionContext'
import {
  deleteReferenceItem,
  fetchReferenceItem,
  fetchReferenceItems,
  saveReferenceItem,
  type ReferenceInput,
} from './api'
import type { Space } from '../spaces/space'

/** Keys privadas por identidad y espacio: un ID de otro espacio nunca se resuelve desde esta cache. */
export const referenceKeys = {
  owner: (owner: string, space: Space) => ['reference', owner, space] as const,
  list: (owner: string, space: Space, page: number) =>
    ['reference', owner, space, 'list', page, 20] as const,
  item: (owner: string, space: Space, id: string) =>
    ['reference', owner, space, 'item', id] as const,
}

export function useReferenceItems(owner: string, space: Space, page: number) {
  const { status, user } = useSession()
  const client = useQueryClient()
  return useQuery({
    queryKey: referenceKeys.list(owner, space, page),
    queryFn: ({ signal }) =>
      fetchReferenceItems(space, page, 20, {
        signal,
        sessionIsCurrent: () =>
          client.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner,
      }),
    enabled: status === 'authenticated' && user?.id === owner,
    retry: false,
  })
}

export function useReferenceItem(owner: string, space: Space, id: string) {
  const { status, user } = useSession()
  const client = useQueryClient()
  return useQuery({
    queryKey: referenceKeys.item(owner, space, id),
    queryFn: ({ signal }) =>
      fetchReferenceItem(space, id, {
        signal,
        sessionIsCurrent: () =>
          client.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner,
      }),
    enabled: status === 'authenticated' && user?.id === owner,
    retry: false,
    staleTime: 0,
  })
}

/**
 * Completion is scoped to the initiating identity and space. Clearing MutationCache does not cancel this request.
 */
export function useReferenceMutations(owner: string, space: Space) {
  const client = useQueryClient()
  const isCurrent = () => client.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner
  const renewIfCurrent = () => (isCurrent() ? renewCsrf() : Promise.resolve())
  const invalidate = () => {
    if (isCurrent())
      return client.invalidateQueries({ queryKey: referenceKeys.owner(owner, space) })
  }
  const save = useMutation({
    mutationFn: ({ input, id }: { input: ReferenceInput; id?: string }) =>
      withCsrfRenewal(
        () => saveReferenceItem(space, input, id, { sessionIsCurrent: isCurrent }),
        renewIfCurrent,
      ),
    onSuccess: invalidate,
    retry: false,
  })
  const remove = useMutation({
    mutationFn: (id: string) =>
      withCsrfRenewal(
        () => deleteReferenceItem(space, id, { sessionIsCurrent: isCurrent }),
        renewIfCurrent,
      ),
    onSuccess: invalidate,
    retry: false,
  })
  return { save, remove, isCurrent }
}
