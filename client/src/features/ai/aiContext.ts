import { createContext, useContext } from 'react'
import type { AiProviderOption, Destination, Excerpt } from './api'

export const AI_ACCENT = '#ceb3ff'
export const AI_INK = '#21182f'

export type ModelIssue =
  | { kind: 'unavailable' | 'unresponsive'; reason: string }
  | {
      kind: 'limited'
      quotaExhausted: boolean
      reason: string
      retryAt: number | null
      // Zero wait: keep the notice but let a deliberate Enviar go through.
      ready?: boolean
    }

export type ModelStatus = {
  label: string
  reason?: string
  tone: 'success' | 'warning' | 'error' | 'info'
}

export function destinationKey({ provider, model }: Destination) {
  return JSON.stringify([provider, model])
}

export function modelStatus(
  options: AiProviderOption[] | undefined,
  failed: boolean,
  destination: Destination | null,
  issue?: ModelIssue,
): ModelStatus {
  if (failed)
    return { label: 'No disponible', reason: 'Actualizá el catálogo de IA.', tone: 'error' }
  if (!options) return { label: 'Comprobando disponibilidad', tone: 'info' }
  const provider = options.find((item) => item.id === destination?.provider)
  const model = provider?.models.find((item) => item.id === destination?.model)
  if (!provider?.available || !model?.available) {
    return {
      label: 'No disponible',
      reason: model?.reason ?? provider?.reason ?? 'Elegí un modelo disponible.',
      tone: 'error',
    }
  }
  if (issue) {
    if (issue.kind === 'limited') {
      return {
        label: issue.quotaExhausted ? 'Cuota agotada' : 'Límite temporal del proveedor',
        reason: issue.reason,
        tone: issue.ready ? 'warning' : 'error',
      }
    }
    const label = issue.kind === 'unresponsive' ? 'No responde' : 'No disponible'
    return { label, reason: issue.reason, tone: 'error' }
  }
  return { label: 'Disponible para intentar', tone: 'success' }
}

export interface AiContextValue {
  options: AiProviderOption[] | undefined
  failed: boolean
  refreshing: boolean
  refresh: () => Promise<void>
  destination: Destination | null
  apply: (destination: Destination) => void
  issues: Record<string, ModelIssue>
  setIssue: (destination: Destination, issue: ModelIssue | null) => void
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
