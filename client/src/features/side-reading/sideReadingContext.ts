import { createContext } from 'react'

export type ReadingSource =
  { kind: 'daily'; date: string } | { kind: 'free'; id: string; title: string }

export const SideReadingContext = createContext<{
  source: ReadingSource | null
  setSource: (source: ReadingSource | null) => void
} | null>(null)
