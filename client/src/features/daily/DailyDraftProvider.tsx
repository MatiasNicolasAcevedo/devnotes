import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useDailyNote, type UseDailyNoteReturn } from './useDailyNote'
import type { Space } from '../spaces/space'

// ——— Contexto ———

interface DailyDraftContextValue extends UseDailyNoteReturn {
  /** Cambia la fecha activa tras flush. */
  navigateToDate: (newDate: string) => Promise<void>
  /** Fecha actualmente activa en el provider. */
  activeDate: string
  /** Identidad y espacio fijos de este borrador: el provider se remonta si cambian. */
  owner: string
  space: Space
  navigationLocked: boolean
  setNavigationLocked: (locked: boolean) => void
}

const DailyDraftContext = createContext<DailyDraftContextValue | null>(null)

/**
 * Provider de borrador diario por identidad y espacio.
 *
 * Mantiene el borrador en memoria mientras el provider está montado.
 * Desmontar el provider (logout, cambio de identidad o de espacio confirmado) limpia todo.
 */
export function DailyDraftProvider({
  owner,
  space,
  children,
  initialDate,
  sessionIsCurrent,
}: {
  owner: string
  space: Space
  children: ReactNode
  initialDate: string
  sessionIsCurrent?: () => boolean
}) {
  const [activeDate, setActiveDate] = useState(initialDate)
  return (
    <DailyDraftDocument
      key={`${owner}/${space}/${activeDate}`}
      owner={owner}
      space={space}
      activeDate={activeDate}
      setActiveDate={setActiveDate}
      sessionIsCurrent={sessionIsCurrent}
    >
      {children}
    </DailyDraftDocument>
  )
}

function DailyDraftDocument({
  owner,
  space,
  activeDate,
  setActiveDate,
  sessionIsCurrent,
  children,
}: {
  owner: string
  space: Space
  activeDate: string
  setActiveDate: (date: string) => void
  sessionIsCurrent?: () => boolean
  children: ReactNode
}) {
  const [navigationLocked, setNavigationLocked] = useState(false)
  const note = useDailyNote(owner, space, activeDate, sessionIsCurrent)
  const locked = navigationLocked || note.isCopyingPrevious

  const navigateToDate = useCallback(
    async (newDate: string) => {
      if (newDate === activeDate) return
      // Flush antes de navegar.
      await note.flush()
      setActiveDate(newDate)
    },
    [activeDate, note, setActiveDate],
  )

  const value = useMemo<DailyDraftContextValue>(
    () => ({
      ...note,
      activeDate,
      owner,
      space,
      navigateToDate,
      navigationLocked: locked,
      setNavigationLocked,
    }),
    [note, activeDate, owner, space, navigateToDate, locked],
  )

  return <DailyDraftContext.Provider value={value}>{children}</DailyDraftContext.Provider>
}

// ——— Hook de consumo ———

/**
 * Consume el contexto del coordinador de borrador.
 * Debe usarse dentro de DailyDraftProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook necesario junto al provider
export function useDailyDraftContext(): DailyDraftContextValue {
  const ctx = useContext(DailyDraftContext)
  if (!ctx) {
    throw new Error('useDailyDraftContext debe usarse dentro de DailyDraftProvider')
  }
  return ctx
}

/** Borrador diario activo, o null si esta sesión todavía no abrió Notas en el espacio confirmado. */
// eslint-disable-next-line react-refresh/only-export-components -- hook necesario junto al provider
export function useOptionalDailyDraftContext(): DailyDraftContextValue | null {
  return useContext(DailyDraftContext)
}
