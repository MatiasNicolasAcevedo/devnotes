import { useCallback, useState, type ReactNode } from 'react'
import type { Space } from '../spaces/space'
import { FreeNotesContext, type FreeNoteDraft } from './freeNotesContext'

export function FreeNotesProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<FreeNoteDraft | null>(null)
  const [diaryDates, setDiaryDates] = useState<Partial<Record<Space, string>>>({})
  const rememberDate = useCallback((space: Space, date: string) => {
    setDiaryDates((dates) => (dates[space] === date ? dates : { ...dates, [space]: date }))
  }, [])
  return (
    <FreeNotesContext.Provider value={{ draft, setDraft, diaryDates, rememberDate }}>
      {children}
    </FreeNotesContext.Provider>
  )
}
