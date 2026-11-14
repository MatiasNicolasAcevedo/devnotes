import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useDailyNote, type CopyTargetRecovery, type UseDailyNoteReturn } from './useDailyNote'
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

type CopyRecoveries = ReadonlyMap<string, CopyTargetRecovery>
const DailyCopyRecoveryContext = createContext<
  [CopyRecoveries, Dispatch<SetStateAction<CopyRecoveries>>] | null
>(null)

/** Vive durante la sesión de la cuenta, por encima de los espacios. */
export function DailyCopyRecoveryProvider({ children }: { children: ReactNode }) {
  const recoveries = useState<CopyRecoveries>(() => new Map())
  return (
    <DailyCopyRecoveryContext.Provider value={recoveries}>
      {children}
    </DailyCopyRecoveryContext.Provider>
  )
}

function useCopyRecoveries() {
  const recoveries = useContext(DailyCopyRecoveryContext)
  if (!recoveries) throw new Error('Falta DailyCopyRecoveryProvider')
  return recoveries
}

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
  const recoveries = useContext(DailyCopyRecoveryContext)
  const document = (
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
  return recoveries ? (
    document
  ) : (
    <DailyCopyRecoveryProvider key={owner}>{document}</DailyCopyRecoveryProvider>
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
  const [byNote, setRecoveries] = useCopyRecoveries()
  const recoveryKey = `${space}/${activeDate}`
  const setRecovery = useCallback(
    (recovery: CopyTargetRecovery | undefined) => {
      setRecoveries((current) => {
        if (recovery === undefined && !current.has(recoveryKey)) return current
        const next = new Map(current)
        if (recovery) next.set(recoveryKey, recovery)
        else next.delete(recoveryKey)
        return next
      })
    },
    [recoveryKey, setRecoveries],
  )
  const note = useDailyNote(
    owner,
    space,
    activeDate,
    byNote.get(recoveryKey),
    setRecovery,
    sessionIsCurrent,
  )
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
