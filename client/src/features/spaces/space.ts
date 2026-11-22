import { matchPath } from 'react-router'
import { z } from 'zod'

/**
 * Espacios privados de una cuenta (S-109). Son fijos: no se crean, renombran ni borran. El servidor aplica el mismo
 * enum; el cliente nunca envía otro valor ni deduce uno por defecto cuando la URL trae algo desconocido.
 */
export const SPACES = ['work', 'personal'] as const
export type Space = (typeof SPACES)[number]

export const spaceSchema = z.enum(SPACES)

/** Primera entrada de una cuenta sin preferencia: Trabajo. Nunca sustituye un valor inválido de la URL. */
export const FIRST_SPACE: Space = 'work'

export const SPACE_LABELS: Record<Space, string> = { work: 'Trabajo', personal: 'Personal' }
export const SPACE_SELECTOR_INTENT = 'space-selector'

export function isSpace(value: unknown): value is Space {
  return spaceSchema.safeParse(value).success
}

/** Lectura del parámetro `space` de una URL: ausente, válido o inválido (desconocido, vacío o repetido). */
export type SpaceParam = { kind: 'missing' } | { kind: 'valid'; space: Space } | { kind: 'invalid' }

export function readSpaceParam(search: string): SpaceParam {
  const values = new URLSearchParams(search).getAll('space')
  if (values.length === 0) return { kind: 'missing' }
  if (values.length === 1 && isSpace(values[0])) return { kind: 'valid', space: values[0] }
  return { kind: 'invalid' }
}

/** Devuelve `search` (con `?` o vacío) con un único `space=<space>`, conservando los demás parámetros. */
export function searchWithSpace(search: string, space: Space): string {
  const params = new URLSearchParams(search)
  params.delete('space')
  params.set('space', assertSpace(space))
  return `?${params.toString()}`
}

/** Enlace interno a `path` (puede traer consulta y fragmento) dentro de `space`. */
export function spaceHref(path: string, space: Space): string {
  const url = new URL(path, 'http://devnotes.invalid')
  return `${url.pathname}${searchWithSpace(url.search, space)}${url.hash}`
}

/**
 * Ruta de API con el espacio de la operación. Toda petición persistente de notas, versiones, referencias y voz pasa por
 * aquí; un valor fuera del enum se rechaza antes de llegar a la red.
 */
export function spaceApiPath(path: string, space: Space): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}space=${assertSpace(space)}`
}

function assertSpace(space: Space): Space {
  if (!isSpace(space)) throw new Error('Espacio no válido')
  return space
}

/** Rutas cuyo contenido pertenece a un espacio. Datos, ingreso y 404 son de toda la cuenta. */
const SPACE_ROUTES = [
  '/notes',
  '/notes/:date',
  '/free-notes',
  '/free-notes/:id',
  '/history',
  '/history/:date',
  '/reference',
  '/voice',
  '/image',
]

export function isSpaceRoute(pathname: string): boolean {
  return SPACE_ROUTES.some((pattern) => matchPath(pattern, pathname) != null)
}
