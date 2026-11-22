import { useState, type ReactNode } from 'react'
import { SideReadingContext, type ReadingSource } from './sideReadingContext'

export function SideReadingProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<ReadingSource | null>(null)
  return (
    <SideReadingContext.Provider value={{ source, setSource }}>
      {children}
    </SideReadingContext.Provider>
  )
}
