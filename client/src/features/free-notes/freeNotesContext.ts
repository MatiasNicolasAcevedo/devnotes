import { createContext, useCallback, useContext } from 'react'
import { useSearchParams } from 'react-router'
import { isValidIsoDate } from '../daily/dateUtils'
import { useSpaceHref } from '../spaces/spaceContext'
import type { Space } from '../spaces/space'

export const FREE_NOTE_CREATED_INTENT = 'free-note-created'

export type FreeNoteDraft = {
  save: () => Promise<boolean>
  busy: boolean
}

export const FreeNotesContext = createContext<{
  draft: FreeNoteDraft | null
  setDraft: (value: FreeNoteDraft | null) => void
  diaryDates: Partial<Record<Space, string>>
  rememberDate: (space: Space, date: string) => void
} | null>(null)

export function useFreeNotesContext() {
  return useContext(FreeNotesContext)
}

export function useFreeNotesLinks() {
  const [search] = useSearchParams()
  const href = useSpaceHref()
  const fromDate = search.get('from')
  const date = fromDate && isValidIsoDate(fromDate) ? fromDate : null
  const noteHref = useCallback(
    (path: string) => href(date ? `${path}?from=${date}` : path),
    [date, href],
  )
  return { fromDate: date, noteHref, href }
}
