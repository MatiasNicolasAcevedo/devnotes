import { createContext, useContext } from 'react'
import type { AiProviderOption, Destination, Excerpt } from './api'

export const AI_ACCENT = '#ceb3ff'
export const AI_INK = '#21182f'

export interface AiContextValue {
  options: AiProviderOption[] | undefined
  failed: boolean
  refreshing: boolean
  refresh: () => Promise<void>
  destination: Destination | null
  apply: (destination: Destination) => void
  anchor: HTMLElement | null
  open: (anchor: HTMLElement) => void
  close: () => void
  pending: { key: string; excerpt: Excerpt } | null
  stageExcerpt: (excerpt: Excerpt) => string
  clearExcerpt: (key: string) => void
}

export const AiContext = createContext<AiContextValue | null>(null)

export function useAi() {
  return useContext(AiContext)
}

export function firstModel(provider?: AiProviderOption) {
  return provider?.models.find((model) => model.available)?.id ?? ''
}
