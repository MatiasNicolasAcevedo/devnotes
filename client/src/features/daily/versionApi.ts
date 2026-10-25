import { z } from 'zod'
import { http } from '../../services/http'
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
 * Las keys incluyen la identidad (owner) para aislar datos entre cuentas.
 * Al cerrar sesión o cambiar identidad, solo se limpia el prefijo `['auth', …]`;
 * estas keys sobreviven, por lo que la identidad en la key evita mezclar datos.
 */
export function dailyVersionKeys(owner: string) {
  return {
    all: ['daily', owner, 'versions'] as const,
    list: (page?: number) =>
      ['daily', owner, 'versions', 'list', ...(page !== undefined ? [page] : [])] as const,
    detail: (date: string) => ['daily', owner, 'versions', 'detail', date] as const,
  }
}

// ——— Transporte ———

const BASE = '/api/v1/daily-versions'

/**
 * Lista las versiones propias paginadas. `page` debe ser >= 0; size es fijo 20.
 */
export async function listDailyVersions(
  page?: number,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
): Promise<DailyVersionPage> {
  const params = page !== undefined ? `?page=${page}` : ''
  return http.request(`${BASE}${params}`, dailyVersionPageSchema, { signal, sessionIsCurrent })
}

/**
 * Obtiene el detalle de una versión por fecha. 404 se distingue de otros errores:
 * representa ausencia explícita (no hay versión guardada para esa fecha).
 */
export async function getDailyVersion(
  date: string,
  signal?: AbortSignal,
  sessionIsCurrent?: () => boolean,
): Promise<DailyVersionDetail> {
  return http.request(`${BASE}/${date}`, dailyVersionDetailSchema, { signal, sessionIsCurrent })
}
