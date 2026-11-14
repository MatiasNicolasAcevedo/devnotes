import { z } from 'zod'
import { ApiError, http, UnexpectedResponseError } from '../../services/http'
import { isValidIsoDate } from './dateUtils'
import { spaceApiPath, type Space } from '../spaces/space'
import { DailyContentSchema } from './editor/dailyDocument'

// ——— Límites de revisión y paginación (S-101 v2) ———

/** Revisión segura: entero entre 0 y MAX_SAFE_INTEGER, sin fracciones ni strings. */
const SafeRevision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)

/** Fecha ISO estricta (YYYY-MM-DD) sin timezone. */
const IsoDate = z.string().refine(isValidIsoDate, 'Fecha inválida (usar YYYY-MM-DD)')

const previousDailyNoteSchema = z.strictObject({
  sourceDate: IsoDate,
  sourceRevision: SafeRevision.min(1),
  sourceUpdatedAt: z.iso.datetime(),
})

export type PreviousDailyNote = z.infer<typeof previousDailyNoteSchema>

const copyPreviousRequestSchema = z.strictObject({
  sourceDate: IsoDate,
  sourceRevision: SafeRevision.min(1),
  expectedRevision: SafeRevision,
})

// ——— Schemas de respuesta ———

/** DTO de `GET /api/v1/daily-notes/{date}` (server: DailyNoteDetailResponse). */
export const dailyNoteDetailSchema = z.strictObject({
  id: z.uuid(),
  date: IsoDate,
  content: DailyContentSchema,
  revision: SafeRevision,
  updatedAt: z.string(),
})

export type DailyNoteDetail = z.infer<typeof dailyNoteDetailSchema>

/** Elemento de la colección paginada (sin content completo). */
const dailyNoteListItemSchema = z.strictObject({
  date: IsoDate,
  updatedAt: z.string(),
  revision: SafeRevision,
})

/** Respuesta paginada de `GET /api/v1/daily-notes`. */
export const dailyNotePageSchema = z.strictObject({
  content: z.array(dailyNoteListItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export type DailyNotePage = z.infer<typeof dailyNotePageSchema>
export type DailyNoteListItem = z.infer<typeof dailyNoteListItemSchema>

// ——— Schema de solicitud PUT ———

/** Body de `PUT /api/v1/daily-notes/{date}`. Solo content y expectedRevision; campos extra rechazados. */
export const saveDailyNoteRequestSchema = z.strictObject({
  content: DailyContentSchema,
  expectedRevision: SafeRevision,
})

export type SaveDailyNoteRequest = z.infer<typeof saveDailyNoteRequestSchema>

// ——— Query keys privadas ———

/**
 * Las keys incluyen identidad (owner) y espacio para aislar datos entre cuentas y entre Trabajo/Personal:
 * la misma fecha en dos espacios son documentos distintos (S-109). El logout conserva solo `['auth', …]`.
 */
export function dailyNoteKeys(owner: string, space: Space) {
  return {
    all: ['daily', owner, space] as const,
    list: (page?: number) =>
      ['daily', owner, space, 'list', ...(page !== undefined ? [page] : [])] as const,
    detail: (date: string) => ['daily', owner, space, 'detail', date] as const,
    previous: (date: string) => ['daily', owner, space, 'previous', date] as const,
  }
}

// ——— Transporte ———

const BASE = '/api/v1/daily-notes'

export async function getPreviousDailyNote(
  space: Space,
  date: string,
  signal: AbortSignal,
  sessionIsCurrent: () => boolean,
): Promise<PreviousDailyNote | null> {
  const result = await http.requestOptional(
    spaceApiPath(`${BASE}/${date}/previous`, space),
    previousDailyNoteSchema,
    { signal, sessionIsCurrent },
  )
  if (result && result.sourceDate >= date) {
    throw new UnexpectedResponseError('La sugerencia debe tener una fecha anterior a la nota')
  }
  return result
}

export async function copyPreviousDailyNote(
  space: Space,
  date: string,
  source: PreviousDailyNote,
  expectedRevision: number,
  sessionIsCurrent: () => boolean,
): Promise<DailyNoteDetail> {
  const body = copyPreviousRequestSchema.parse({
    sourceDate: source.sourceDate,
    sourceRevision: source.sourceRevision,
    expectedRevision,
  })
  const result = await http.request(
    spaceApiPath(`${BASE}/${date}/copy-previous`, space),
    dailyNoteDetailSchema,
    { method: 'POST', body, sessionIsCurrent },
  )
  if (result.date !== date || result.revision <= expectedRevision) {
    throw new UnexpectedResponseError(
      'El servidor devolvió una copia fuera de la revisión esperada',
    )
  }
  return result
}

export function isCopySourceConflict(error: unknown): boolean {
  const code = error instanceof ApiError ? error.problem?.code : undefined
  return code === 'COPY_SOURCE_NOT_AVAILABLE' || code === 'COPY_SOURCE_CHANGED'
}

/**
 * Obtiene el detalle de una nota por fecha. 404 se distingue de otros errores:
 * representa ausencia explícita (la fecha no tiene nota aún).
 */
export async function getDailyNote(
  space: Space,
  date: string,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
): Promise<DailyNoteDetail> {
  return http.request(spaceApiPath(`${BASE}/${date}`, space), dailyNoteDetailSchema, {
    signal,
    sessionIsCurrent,
  })
}

/**
 * Lista las notas propias paginadas. `page` debe ser >= 0; size es fijo 20.
 */
export async function listDailyNotes(
  space: Space,
  page?: number,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
): Promise<DailyNotePage> {
  const params = page !== undefined ? `?page=${page}` : ''
  return http.request(spaceApiPath(`${BASE}${params}`, space), dailyNotePageSchema, {
    signal,
    sessionIsCurrent,
  })
}

/**
 * Guarda o crea una nota con revisión esperada. PUT con CSRF y revisión exacta.
 * 400/401/403/409 se propagan sin éxito ni reenvío automático.
 * `space` es el capturado al iniciar la escritura; el propietario sale de la sesión del servidor.
 */
export async function saveDailyNote(
  space: Space,
  date: string,
  content: unknown,
  expectedRevision: number,
  signal?: AbortSignal,
): Promise<DailyNoteDetail> {
  const body = { content, expectedRevision }
  // Validar antes de enviar: campos extra o revisión no segura se rechazan.
  const parsed = saveDailyNoteRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('Solicitud inválida: ' + parsed.error.issues.map((i) => i.message).join('; '))
  }
  return http.request(spaceApiPath(`${BASE}/${date}`, space), dailyNoteDetailSchema, {
    method: 'PUT',
    body: parsed.data,
    signal,
  })
}
