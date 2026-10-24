import { z } from 'zod'
import { http } from '../../services/http'
import { DailyContentSchema } from './editor/dailyDocument'

// ——— Límites de revisión y paginación (S-101 v2) ———

/** Revisión segura: entero entre 0 y MAX_SAFE_INTEGER, sin fracciones ni strings. */
const SafeRevision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)

/** Fecha ISO estricta (YYYY-MM-DD) sin timezone. */
const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (usar YYYY-MM-DD)')
  .refine((val) => {
    const parts = val.split('-')
    const year = Number(parts[0])
    const month = Number(parts[1])
    const day = Number(parts[2])
    if (month < 1 || month > 12) return false
    if (day < 1 || day > 31) return false
    // Validación básica: el Date constructor acepta la fecha
    const d = new Date(Date.UTC(year, month - 1, day))
    return (
      d.getUTCFullYear() === year &&
      d.getUTCMonth() === month - 1 &&
      d.getUTCDate() === day
    )
  }, 'Fecha inválida')

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
 * Las keys incluyen la identidad (owner) para aislar datos entre cuentas.
 * Al cerrar sesión o cambiar identidad, solo se limpia el prefijo `['auth', …]`;
 * estas keys sobreviven, por lo que la identidad en la key evita mezclar datos.
 */
export function dailyNoteKeys(owner: string) {
  return {
    all: ['daily', owner] as const,
    list: (page?: number) =>
      ['daily', owner, 'list', ...(page !== undefined ? [page] : [])] as const,
    detail: (date: string) => ['daily', owner, 'detail', date] as const,
  }
}

// ——— Transporte ———

const BASE = '/api/v1/daily-notes'

/**
 * Obtiene el detalle de una nota por fecha. 404 se distingue de otros errores:
 * representa ausencia explícita (la fecha no tiene nota aún).
 */
export async function getDailyNote(
  date: string,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
): Promise<DailyNoteDetail> {
  return http.request(`${BASE}/${date}`, dailyNoteDetailSchema, { signal, sessionIsCurrent })
}

/**
 * Lista las notas propias paginadas. `page` debe ser >= 0; size es fijo 20.
 */
export async function listDailyNotes(
  page?: number,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
): Promise<DailyNotePage> {
  const params = page !== undefined ? `?page=${page}` : ''
  return http.request(`${BASE}${params}`, dailyNotePageSchema, { signal, sessionIsCurrent })
}

/**
 * Guarda o crea una nota con revisión esperada. PUT con CSRF y revisión exacta.
 * 400/401/403/409 se propagan sin éxito ni reenvío automático.
 * `owner` solo identifica las query keys; nunca se envía al backend.
 */
export async function saveDailyNote(
  _owner: string,
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
  return http.request(`${BASE}/${date}`, dailyNoteDetailSchema, {
    method: 'PUT',
    body: parsed.data,
    signal,
  })
}
