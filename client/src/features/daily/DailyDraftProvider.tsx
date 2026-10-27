import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useDailyNote, type UseDailyNoteReturn } from './useDailyNote'

// ——— Contexto ———

interface DailyDraftContextValue extends UseDailyNoteReturn {
  /** Cambia la fecha activa tras flush. */
  navigateToDate: (newDate: string) => Promise<void>
  /** Fecha actualmente activa en el provider. */
  activeDate: string
  navigationLocked: boolean
  setNavigationLocked: (locked: boolean) => void
}

const DailyDraftContext = createContext<DailyDraftContextValue | null>(null)

/**
 * Provider de borrador diario por identidad.
 *
 * Mantiene el borrador en memoria mientras el provider está montado.
 * Desmontar el provider (logout/cambio de identidad) limpia todo.
 *
 * Se monta sobre Outlet en T-007; esta tarea solo crea el provider y lo prueba.
 */
export function DailyDraftProvider({
  owner,
  children,
  initialDate,
  sessionIsCurrent,
}: {
  owner: string
  children: ReactNode
  initialDate: string
  sessionIsCurrent?: () => boolean
}) {
  const [activeDate, setActiveDate] = useState(initialDate)
  return (
    <DailyDraftDocument
      key={`${owner}/${activeDate}`}
      owner={owner}
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
  activeDate,
  setActiveDate,
  sessionIsCurrent,
  children,
}: {
  owner: string
  activeDate: string
  setActiveDate: (date: string) => void
  sessionIsCurrent?: () => boolean
  children: ReactNode
}) {
  const [navigationLocked, setNavigationLocked] = useState(false)
  const note = useDailyNote(owner, activeDate, sessionIsCurrent)

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
      navigateToDate,
      navigationLocked,
      setNavigationLocked,
    }),
    [note, activeDate, navigateToDate, navigationLocked],
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
