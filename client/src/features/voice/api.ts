import { z } from 'zod'
import { http } from '../../services/http'
import { spaceApiPath, type Space } from '../spaces/space'

/** Contrato de `GET /api/v1/voice/capabilities`. */
export const voiceCapabilitiesSchema = z.object({
  recordingEnabled: z.boolean(),
  reason: z.string().nullable(),
  maxDurationSeconds: z.number().int().positive(),
  maxAudioBytes: z.number().int().positive(),
  maxTextLength: z.number().int().positive(),
  mimeTypes: z.array(z.string()),
  language: z.string(),
})
export type VoiceCapabilities = z.infer<typeof voiceCapabilitiesSchema>

/** Contrato de `POST /api/v1/voice/transcriptions` response. */
export const transcriptionResponseSchema = z.object({
  text: z.string(),
  language: z.string(),
})
export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>

/** Item de la lista paginada: {id, excerpt, revision, createdAt, updatedAt}. */
const voiceNoteListItemSchema = z.object({
  id: z.string().uuid(),
  excerpt: z.string(),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

/** Detalle completo: {id, text, revision, createdAt, updatedAt}. */
export const voiceNoteDetailSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type VoiceNoteDetail = z.infer<typeof voiceNoteDetailSchema>

/** Respuesta paginada: {content, page, size, totalElements, totalPages}. */
export const voiceNotePageSchema = z.object({
  content: z.array(voiceNoteListItemSchema),
  page: z.number().int().min(0),
  size: z.number().int().min(1),
  totalElements: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})
export type VoiceNoteListItem = z.infer<typeof voiceNoteListItemSchema>
export type VoiceNotePage = z.infer<typeof voiceNotePageSchema>

/** Identidad y espacio de una operación de notas de voz, capturados al iniciarla. */
export interface VoiceScope {
  owner: string
  space: Space
}

/**
 * Query keys estables — fuera del prefijo ['auth', ...] para que el logout las elimine. El contenido lleva identidad y
 * espacio; la capacidad de voz es global de la cuenta y no se mezcla con contenido.
 */
export const voiceQueryKeys = {
  all: ['voice'] as const,
  capabilities: ['voice', 'capabilities'] as const,
  /** Todo el contenido de voz de una identidad en un espacio. */
  scope: ({ owner, space }: VoiceScope) => ['voice', owner, space] as const,
  /** Prefijo de todas las páginas de la lista: es lo que invalidan las mutaciones. */
  lists: ({ owner, space }: VoiceScope) => ['voice', owner, space, 'list'] as const,
  list: ({ owner, space }: VoiceScope, params?: VoiceListParams) =>
    ['voice', owner, space, 'list', params ?? null] as const,
  detail: ({ owner, space }: VoiceScope, id: string) =>
    ['voice', owner, space, 'detail', id] as const,
}

export type VoiceSessionCheck = () => boolean

export interface VoiceListParams {
  page?: number
  size?: number
}

/** GET /api/v1/voice/capabilities */
export function fetchVoiceCapabilities(signal?: AbortSignal) {
  return http.request('/api/v1/voice/capabilities', voiceCapabilitiesSchema, {
    signal,
    sessionIsCurrent: () => !signal?.aborted,
  })
}

/** POST /api/v1/voice/transcriptions — multipart con deadline 90 s combinado con señal del caller. */
export function transcribeAudio(
  file: Blob,
  signal?: AbortSignal,
  sessionIsCurrent?: VoiceSessionCheck,
) {
  const fd = new FormData()
  fd.append('file', file, 'recording.webm')
  const deadline = AbortSignal.timeout(90_000)
  return http.request('/api/v1/voice/transcriptions', transcriptionResponseSchema, {
    method: 'POST',
    formData: fd,
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
    sessionIsCurrent: () => !signal?.aborted && (sessionIsCurrent?.() ?? true),
  })
}

/** GET /api/v1/voice-notes?page=0&size=20&space=… */
export function fetchVoiceNotes(space: Space, params?: VoiceListParams, signal?: AbortSignal) {
  const search = new URLSearchParams()
  if (params?.page !== undefined) search.set('page', String(params.page))
  if (params?.size !== undefined) search.set('size', String(params.size))
  const path = search.toString() ? `/api/v1/voice-notes?${search}` : '/api/v1/voice-notes'
  return http.request(spaceApiPath(path, space), voiceNotePageSchema, {
    signal,
    sessionIsCurrent: () => !signal?.aborted,
  })
}

/** POST /api/v1/voice-notes?space=… {text} */
export function createVoiceNote(space: Space, text: string, sessionIsCurrent?: VoiceSessionCheck) {
  return http.request(spaceApiPath('/api/v1/voice-notes', space), voiceNoteDetailSchema, {
    method: 'POST',
    body: { text },
    sessionIsCurrent,
  })
}

/** GET /api/v1/voice-notes/{id}?space=… */
export function fetchVoiceNote(space: Space, id: string, signal?: AbortSignal) {
  return http.request(spaceApiPath(`/api/v1/voice-notes/${id}`, space), voiceNoteDetailSchema, {
    signal,
    sessionIsCurrent: () => !signal?.aborted,
  })
}

/** PUT /api/v1/voice-notes/{id}?space=… {text, expectedRevision} */
export function updateVoiceNote(
  space: Space,
  id: string,
  text: string,
  expectedRevision: number,
  sessionIsCurrent?: VoiceSessionCheck,
) {
  return http.request(spaceApiPath(`/api/v1/voice-notes/${id}`, space), voiceNoteDetailSchema, {
    method: 'PUT',
    body: { text, expectedRevision },
    sessionIsCurrent,
  })
}

/** DELETE /api/v1/voice-notes/{id}?expectedRevision=N&space=… */
export function deleteVoiceNote(
  space: Space,
  id: string,
  expectedRevision: number,
  sessionIsCurrent?: VoiceSessionCheck,
) {
  const path = `/api/v1/voice-notes/${id}?expectedRevision=${expectedRevision}`
  return http.requestVoid(spaceApiPath(path, space), {
    method: 'DELETE',
    sessionIsCurrent,
  })
}
