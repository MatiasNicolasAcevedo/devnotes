import { z } from 'zod'
import { http } from '../../services/http'
import type { Space } from '../spaces/space'

const modelSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum(['light', 'alternative', 'other']),
  available: z.boolean(),
  reason: z.string().nullish(),
})
const providerSchema = z.object({
  id: z.string(),
  label: z.string(),
  available: z.boolean(),
  reason: z.string().nullish(),
  models: z.array(modelSchema),
})
const outputSchema = z.object({
  text: z.string(),
  provider: z.string(),
  requestedModel: z.string(),
  servedModel: z.string().nullish(),
  quota: z.record(z.string(), z.number()).nullish(),
})

export type AiProviderOption = z.infer<typeof providerSchema>
export type AiOutput = z.infer<typeof outputSchema>
export type Destination = { provider: string; model: string }
export type Excerpt = {
  source: 'daily' | 'free'
  id: string
  revision: number
  start: number
  text: string
}
export const MAX_POINTS = 4000
export const countPoints = (value: string) => Array.from(value).length

export function getAiOptions(
  refresh: boolean,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
) {
  return http.request(
    '/api/ai/options' + (refresh ? '?refresh=true' : ''),
    z.array(providerSchema),
    {
      signal,
      sessionIsCurrent,
    },
  )
}

export async function sendAiMessage(
  space: Space,
  destination: Destination,
  message: string,
  excerpt: Excerpt | null,
  signal: AbortSignal,
  sessionIsCurrent: () => boolean,
) {
  let attachment
  if (excerpt) {
    const { text, ...source } = excerpt
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    const digest = Array.from(new Uint8Array(bytes), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    attachment = { ...source, end: source.start + countPoints(text), digest }
  }
  signal.throwIfAborted()
  return http.request(`/api/spaces/${space}/ai/messages`, outputSchema, {
    method: 'POST',
    body: { ...destination, message, excerpt: attachment },
    signal,
    sessionIsCurrent,
  })
}
