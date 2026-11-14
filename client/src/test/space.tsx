import type { ReactNode } from 'react'
import type { Space } from '../features/spaces/space'
import { SpaceContext, type SpaceContextValue } from '../features/spaces/spaceContext'

/**
 * Espacio confirmado fijo para pruebas de componentes y hooks montados fuera del shell. Con `AppRoutes`, el
 * `SpaceProvider` real del shell lo reemplaza y aplica URL, preferencia y guardias.
 */
export function FixedSpace({
  space,
  owner = '',
  children,
}: {
  space: Space
  owner?: string
  children: ReactNode
}) {
  const value: SpaceContextValue = {
    owner,
    space,
    requested: null,
    commit: () => {},
    originHref: () => '/notes',
    lockReason: null,
    setLock: () => {},
  }
  return <SpaceContext value={value}>{children}</SpaceContext>
}
