import { z } from 'zod'
import { http } from '../../services/http'

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

/** Query keys estables — fuera del prefijo ['auth', ...] para que el logout las elimine. */
export const voiceQueryKeys = {
  all: ['voice'] as const,
  capabilities: ['voice', 'capabilities'] as const,
  /** Prefijo de todas las páginas de la lista: es lo que invalidan las mutaciones. */
  lists: ['voice', 'list'] as const,
  list: (params?: VoiceListParams) => ['voice', 'list', params ?? null] as const,
  detail: (id: string) => ['voice', 'detail', id] as const,
}

export interface VoiceListParams {
  page?: number
  size?: number
}

/** GET /api/v1/voice/capabilities */
export function fetchVoiceCapabilities(signal?: AbortSignal) {
  return http.request('/api/v1/voice/capabilities', voiceCapabilitiesSchema, { signal })
}

/** POST /api/v1/voice/transcriptions — multipart con deadline 90 s combinado con señal del caller. */
export function transcribeAudio(file: Blob, signal?: AbortSignal) {
  const fd = new FormData()
  fd.append('file', file, 'recording.webm')
  const deadline = AbortSignal.timeout(90_000)
  return http.request('/api/v1/voice/transcriptions', transcriptionResponseSchema, {
    method: 'POST',
    formData: fd,
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  })
}

/** GET /api/v1/voice-notes?page=0&size=20 */
export function fetchVoiceNotes(params?: VoiceListParams, signal?: AbortSignal) {
  const search = new URLSearchParams()
  if (params?.page !== undefined) search.set('page', String(params.page))
  if (params?.size !== undefined) search.set('size', String(params.size))
  const path = search.toString() ? `/api/v1/voice-notes?${search}` : '/api/v1/voice-notes'
  return http.request(path, voiceNotePageSchema, { signal })
}

/** POST /api/v1/voice-notes {text} */
export function createVoiceNote(text: string) {
  return http.request('/api/v1/voice-notes', voiceNoteDetailSchema, {
    method: 'POST',
    body: { text },
  })
}

/** GET /api/v1/voice-notes/{id} */
export function fetchVoiceNote(id: string, signal?: AbortSignal) {
  return http.request(`/api/v1/voice-notes/${id}`, voiceNoteDetailSchema, { signal })
}

/** PUT /api/v1/voice-notes/{id} {text, expectedRevision} */
export function updateVoiceNote(id: string, text: string, expectedRevision: number) {
  return http.request(`/api/v1/voice-notes/${id}`, voiceNoteDetailSchema, {
    method: 'PUT',
    body: { text, expectedRevision },
  })
}

/** DELETE /api/v1/voice-notes/{id}?expectedRevision=N */
export function deleteVoiceNote(id: string, expectedRevision: number) {
  return http.requestVoid(`/api/v1/voice-notes/${id}?expectedRevision=${expectedRevision}`, {
    method: 'DELETE',
  })
}
