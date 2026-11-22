import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchFreeNote, fetchFreeNotes } from './api'
import { useFreeNotesScope } from './useFreeNotesScope'

export function useFreeNoteList(
  scope: ReturnType<typeof useFreeNotesScope>,
  refreshOnMount = false,
) {
  return useInfiniteQuery({
    queryKey: [...scope.key, 'list'],
    queryFn: ({ pageParam, signal }) =>
      fetchFreeNotes(scope.space, pageParam, { signal, sessionIsCurrent: scope.isCurrent }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next ?? undefined,
    refetchOnMount: refreshOnMount ? 'always' : undefined,
  })
}

export function freeNoteDetailKey(key: ReturnType<typeof useFreeNotesScope>['key'], id: string) {
  return [...key, 'detail', id] as const
}

export function useFreeNoteDetail(
  scope: ReturnType<typeof useFreeNotesScope>,
  id: string,
  refreshOnMount = false,
) {
  return useQuery({
    queryKey: freeNoteDetailKey(scope.key, id),
    queryFn: ({ signal }) =>
      fetchFreeNote(scope.space, id, { signal, sessionIsCurrent: scope.isCurrent }),
    refetchOnMount: refreshOnMount ? 'always' : undefined,
  })
}
