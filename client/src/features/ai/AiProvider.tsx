import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSession } from '../auth/sessionContext'
import { useOptionalActiveSpace } from '../spaces/spaceContext'
import { AiContext, destinationKey, firstModel, type ModelIssue } from './aiContext'
import { getAiOptions, type Destination, type Excerpt } from './api'
import { AiDestinationDialog } from './AiDestinationDialog'

export function AiProvider({ children }: { children: ReactNode }) {
  const { user, status } = useSession()
  const space = useOptionalActiveSpace()
  const scope = `${user?.id ?? ''}/${space ?? ''}`
  const [savedScope, setSavedScope] = useState(scope)
  const [choice, setChoice] = useState<Destination | null>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [pending, setPending] = useState<{ key: string; excerpt: Excerpt } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const [issues, setIssues] = useState<Record<string, ModelIssue>>({})
  const refreshingRef = useRef<string | null>(null)
  const queryClient = useQueryClient()
  const key = useMemo(() => ['ai', user?.id, space, 'options'] as const, [user?.id, space])
  const owner = user?.id
  const current = useRef<string | null>(null)
  useLayoutEffect(() => {
    current.current = scope
    return () => {
      current.current = null
      refreshingRef.current = null
    }
  }, [scope])

  if (savedScope !== scope) {
    setSavedScope(scope)
    setChoice(null)
    setAnchor(null)
    setPending(null)
    setRefreshing(false)
    setRefreshError(false)
    setIssues({})
  }
  useEffect(() => {
    let timer: number
    function schedule() {
      const now = Date.now()
      const waits = Object.entries(issues).flatMap(([key, issue]) =>
        issue.kind === 'quota' && issue.retryAt !== null ? [{ key, at: issue.retryAt }] : [],
      )
      const expired = waits.filter(({ at }) => at <= now)
      if (expired.length) {
        setIssues((previous) => {
          const next = { ...previous }
          for (const { key } of expired) {
            if (next[key] === issues[key]) delete next[key]
          }
          return next
        })
      } else if (waits.length) {
        const wait = Math.min(...waits.map(({ at }) => at)) - now
        timer = window.setTimeout(schedule, Math.min(wait, 2_147_483_647))
      }
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [issues])
  const query = useQuery({
    enabled: Boolean(owner && space && status === 'authenticated'),
    queryKey: key,
    queryFn: ({ signal }) => getAiOptions(false, signal, () => current.current === scope),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const options = query.data
  const preferred = options?.find((provider) => provider.available)
  const defaultModel = firstModel(preferred)
  const defaultChoice =
    preferred && defaultModel ? { provider: preferred.id, model: defaultModel } : null
  // Capture the first destination so catalog changes never reroute a draft.
  if (savedScope === scope && choice === null && defaultChoice) setChoice(defaultChoice)

  async function refresh() {
    if (refreshingRef.current === scope) return
    refreshingRef.current = scope
    setRefreshing(true)
    setRefreshError(false)
    try {
      await queryClient.fetchQuery({
        queryKey: key,
        queryFn: ({ signal }) => getAiOptions(true, signal, () => current.current === scope),
        retry: false,
        staleTime: 0,
      })
      if (current.current === scope) {
        setIssues((previous) =>
          Object.fromEntries(
            Object.entries(previous).filter(([, issue]) => issue.kind !== 'unavailable'),
          ),
        )
      }
    } catch {
      if (current.current === scope) setRefreshError(true)
    } finally {
      if (current.current === scope) {
        setRefreshing(false)
        refreshingRef.current = null
      }
    }
  }

  const value = {
    options,
    failed: query.isError || refreshError,
    refreshing,
    refresh,
    destination: choice ?? defaultChoice,
    apply: setChoice,
    issues,
    setIssue: (destination: Destination, issue: ModelIssue | null) => {
      const key = destinationKey(destination)
      setIssues((previous) => {
        const next = { ...previous }
        if (issue) next[key] = issue
        else delete next[key]
        return next
      })
    },
    anchor,
    open: (element: HTMLElement) => {
      element.focus({ preventScroll: true })
      setAnchor(element)
    },
    close: () => setAnchor(null),
    pending,
    stageExcerpt: (excerpt: Excerpt) => {
      const key = crypto.randomUUID()
      setPending({ key, excerpt })
      return key
    },
    clearExcerpt: (key: string) =>
      setPending((previous) => (previous?.key === key ? null : previous)),
  }
  return (
    <AiContext.Provider value={value}>
      {children}
      {anchor && <AiDestinationDialog anchor={anchor} />}
    </AiContext.Provider>
  )
}
