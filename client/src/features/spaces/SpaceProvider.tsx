import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  FIRST_SPACE,
  isSpaceRoute,
  readSpaceParam,
  searchWithSpace,
  spaceHref,
  type Space,
} from './space'
import { SpaceContext, type SpaceContextValue } from './spaceContext'
import { readSpacePreference, writeSpacePreference } from './spacePreference'

/**
 * Espacio de una identidad (S-109 §2–5). Al cambiar la identidad el estado se reinicia en el mismo render, así que
 * nada pasa de una cuenta a otra (sin remontar la barra superior). Lee el espacio pedido por la URL, canonicaliza la URL sin espacio con la preferencia del
 * dispositivo (o Trabajo) y guarda esa preferencia solo cuando el cambio terminó. No escucha el evento `storage`:
 * otra pestaña nunca cambia esta. Las guardias de cada cambio viven en el coordinador (`SpaceNavigation`).
 */
export function SpaceProvider({ owner, children }: { owner: string; children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname, search } = location
  const requested = useMemo(
    () => (owner !== '' && isSpaceRoute(pathname) ? readSpaceParam(search) : null),
    [owner, pathname, search],
  )
  const [state, setState] = useState<{ owner: string; space: Space | null }>({
    owner,
    space: null,
  })
  if (state.owner !== owner) setState({ owner, space: null })
  const space = state.owner === owner ? state.space : null
  // Primera resolución: todavía no hay nada montado en ningún espacio que proteger.
  if (space === null && requested?.kind === 'valid') setState({ owner, space: requested.space })

  const missing = requested?.kind === 'missing'
  useLayoutEffect(() => {
    if (!missing) return
    // El espacio confirmado de esta pestaña es su memoria; si el almacenamiento falla, sigue funcionando sin él.
    const target = space ?? readSpacePreference(owner) ?? FIRST_SPACE
    void navigate(
      {
        pathname: location.pathname,
        search: searchWithSpace(location.search, target),
        hash: location.hash,
      },
      { replace: true, state: location.state },
    )
  }, [missing, space, owner, navigate, location])

  const settled = requested?.kind === 'valid' && requested.space === space
  const origin = useRef<{ owner: string; href: string } | null>(null)
  useEffect(() => {
    if (!settled || !space) return
    origin.current = { owner, href: location.pathname + location.search + location.hash }
    writeSpacePreference(owner, space)
  }, [settled, space, owner, location])

  const [locks, setLocks] = useState<Record<string, string>>({})
  const setLock = useCallback((id: string, reason: string | null) => {
    setLocks((current) => {
      if (reason === null) {
        if (!(id in current)) return current
        const next = { ...current }
        delete next[id]
        return next
      }
      return current[id] === reason ? current : { ...current, [id]: reason }
    })
  }, [])
  const lockReason = Object.values(locks)[0] ?? null

  const commit = useCallback((next: Space) => setState({ owner, space: next }), [owner])
  const originHref = useCallback(() => {
    if (origin.current?.owner === owner) return origin.current.href
    return space ? spaceHref('/notes', space) : '/notes'
  }, [owner, space])

  const value = useMemo<SpaceContextValue>(
    () => ({ owner, space, requested, commit, originHref, lockReason, setLock }),
    [owner, space, requested, commit, originHref, lockReason, setLock],
  )

  return <SpaceContext value={value}>{children}</SpaceContext>
}
