import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  useDailyNote,
  type UseDailyNoteReturn,
} from './useDailyNote'

// ——— Contexto ———

interface DailyDraftContextValue extends UseDailyNoteReturn {
  /** Cambia la fecha activa tras flush. */
  navigateToDate: (newDate: string) => Promise<void>
  /** Fecha actualmente activa en el provider. */
  activeDate: string
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

  const note = useDailyNote(owner, activeDate, sessionIsCurrent)

  const navigateToDate = useCallback(
    async (newDate: string) => {
      if (newDate === activeDate) return
      // Flush antes de navegar.
      await note.flush()
      setActiveDate(newDate)
    },
    [activeDate, note],
  )

  const value = useMemo<DailyDraftContextValue>(
    () => ({
      ...note,
      activeDate,
      navigateToDate,
    }),
    [note, activeDate, navigateToDate],
  )

  return (
    <DailyDraftContext.Provider value={value}>{children}</DailyDraftContext.Provider>
  )
}

// ——— Hook de consumo ———

/**
 * Consume el contexto del coordinador de borrador.
 * Debe usarse dentro de DailyDraftProvider.
 */
export function useDailyDraftContext(): DailyDraftContextValue {
  const ctx = useContext(DailyDraftContext)
  if (!ctx) {
    throw new Error('useDailyDraftContext debe usarse dentro de DailyDraftProvider')
  }
  return ctx
}
