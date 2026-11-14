import { z } from 'zod'
import { http } from '../../services/http'
import { spaceApiPath, type Space } from '../spaces/space'
import { DailyContentSchema } from './editor/dailyDocument'

// ——— Schemas de respuesta ———

/** Elemento de la lista paginada de versiones (sin content completo). */
const dailyVersionListItemSchema = z.strictObject({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  savedAt: z.string(),
  sourceRevision: z.number().int().positive(),
})

/** Respuesta paginada de `GET /api/v1/daily-versions`. */
export const dailyVersionPageSchema = z.strictObject({
  content: z.array(dailyVersionListItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export type DailyVersionPage = z.infer<typeof dailyVersionPageSchema>
export type DailyVersionListItem = z.infer<typeof dailyVersionListItemSchema>

/** Respuesta de `GET /api/v1/daily-versions/{date}` (detalle con content completo). */
export const dailyVersionDetailSchema = z.strictObject({
  id: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: DailyContentSchema,
  sourceRevision: z.number().int().positive(),
  savedAt: z.string(),
})

export type DailyVersionDetail = z.infer<typeof dailyVersionDetailSchema>

// ——— Query keys privadas ———

/**
 * Las keys incluyen identidad y espacio: la versión de un espacio nunca se lee ni reemplaza desde el otro (SP-04).
 * El logout conserva solo `['auth', …]`.
 */
export function dailyVersionKeys(owner: string, space: Space) {
  return {
    all: ['daily', owner, space, 'versions'] as const,
    list: (page?: number) =>
      ['daily', owner, space, 'versions', 'list', ...(page !== undefined ? [page] : [])] as const,
    detail: (date: string) => ['daily', owner, space, 'versions', 'detail', date] as const,
  }
}

// ——— Transporte ———

const BASE = '/api/v1/daily-versions'

/**
 * Lista las versiones propias paginadas. `page` debe ser >= 0; size es fijo 20.
 */
export async function listDailyVersions(
  space: Space,
  page?: number,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
): Promise<DailyVersionPage> {
  const params = page !== undefined ? `?page=${page}` : ''
  return http.request(spaceApiPath(`${BASE}${params}`, space), dailyVersionPageSchema, {
    signal,
    sessionIsCurrent,
  })
}

/**
 * Obtiene el detalle de una versión por fecha. 404 se distingue de otros errores:
 * representa ausencia explícita (no hay versión guardada para esa fecha).
 */
export async function getDailyVersion(
  space: Space,
  date: string,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
): Promise<DailyVersionDetail> {
  return http.request(spaceApiPath(`${BASE}/${date}`, space), dailyVersionDetailSchema, {
    signal,
    sessionIsCurrent,
  })
}

// ——— Schema de solicitud POST ———

/** Body de `POST /api/v1/daily-notes/{date}/version`. Solo expectedRevision; campos extra rechazados. */
export const saveDailyVersionRequestSchema = z.strictObject({
  expectedRevision: z.number().int().min(0),
})

export type SaveDailyVersionRequest = z.infer<typeof saveDailyVersionRequestSchema>

/**
 * Crea o reemplaza la versión manual de una fecha.
 * POST con CSRF y revisión exacta del trabajo confirmado.
 * 400/401/403/409 se propagan sin éxito ni reenvío automático.
 * `space` es el de la nota que inició el guardado; el propietario sale de la sesión del servidor.
 */
export async function saveDailyVersion(
  space: Space,
  date: string,
  expectedRevision: number,
  signal?: AbortSignal,
): Promise<DailyVersionDetail> {
  const body = { expectedRevision }
  const parsed = saveDailyVersionRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('Solicitud inválida: ' + parsed.error.issues.map((i) => i.message).join('; '))
  }
  return http.request(
    spaceApiPath(`/api/v1/daily-notes/${date}/version`, space),
    dailyVersionDetailSchema,
    { method: 'POST', body: parsed.data, signal },
  )
}
