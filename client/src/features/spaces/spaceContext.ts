import { createContext, useCallback, useContext, useEffect, useId } from 'react'
import { AuthSessionContext } from '../auth/sessionContext'
import { spaceHref, type Space, type SpaceParam } from './space'

export interface SpaceContextValue {
  /** Identidad dueña de este contexto; vacía para visitantes. */
  owner: string
  /**
   * Espacio confirmado: el único que usan lecturas, guardados, borradores y keys privadas. Cambia solo cuando el
   * coordinador resolvió las guardias del origen. Null hasta resolverlo (o con una URL inválida sin origen previo).
   */
  space: Space | null
  /** Parámetro de la URL en una ruta de espacio; null fuera de ellas o sin sesión. */
  requested: SpaceParam | null
  /** Confirma el destino. Solo lo invoca el coordinador de transición. */
  commit: (space: Space) => void
  /** Última dirección vista en el espacio confirmado, para «Volver» y «Seguir aquí». */
  originHref: () => string
  /** Motivo por el que ahora no se puede completar un cambio de espacio (p. ej. importación en vuelo). */
  lockReason: string | null
  setLock: (id: string, reason: string | null) => void
}

export const SpaceContext = createContext<SpaceContextValue | null>(null)

export function useSpaceContext(): SpaceContextValue {
  const value = useContext(SpaceContext)
  if (!value) throw new Error('useSpaceContext requiere SpaceProvider')
  return value
}

/** Espacio confirmado o null (visitante, sin resolver o fuera del provider). */
export function useOptionalActiveSpace(): Space | null {
  return useContext(SpaceContext)?.space ?? null
}

/** Espacio confirmado; las pantallas privadas solo se montan cuando existe. */
export function useActiveSpace(): Space {
  const space = useOptionalActiveSpace()
  if (!space) throw new Error('useActiveSpace requiere un espacio confirmado')
  return space
}

export interface SpaceScope {
  owner: string
  space: Space
}

/** Contexto de una operación privada: identidad del espacio (o de la sesión) y espacio confirmado. */
export function useSpaceScope(): SpaceScope {
  const ownerOfSpace = useContext(SpaceContext)?.owner
  const sessionUser = useContext(AuthSessionContext)?.user
  const space = useActiveSpace()
  return { owner: ownerOfSpace || (sessionUser?.id ?? ''), space }
}

/** Construye enlaces internos dentro del espacio confirmado; sin espacio, deja que la ruta lo resuelva. */
export function useSpaceHref(): (path: string) => string {
  const space = useOptionalActiveSpace()
  return useCallback((path: string) => (space ? spaceHref(path, space) : path), [space])
}

/** Mientras `reason` no sea null, ningún cambio de espacio se completa y el coordinador explica el motivo. */
export function useSpaceTransitionLock(reason: string | null) {
  const setLock = useContext(SpaceContext)?.setLock
  const id = useId()
  useEffect(() => {
    if (!setLock) return
    setLock(id, reason)
    return () => setLock(id, null)
  }, [id, reason, setLock])
}
