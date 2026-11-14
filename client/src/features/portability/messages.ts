import { ApiError } from '../../services/http'
import { errorMessage } from '../../shared/ui/errorMessage'

/** Textos de la pantalla «Datos» (S-107). */
export const texts = {
  title: 'Datos de la cuenta',
  intro:
    'Descargá un respaldo de tu cuenta en Excel o recuperalo en una cuenta sin datos. Incluye Trabajo y Personal.',
  exportTitle: 'Exportar',
  exportHelp:
    'El archivo incluye tus notas diarias, la versión guardada de cada una, tus notas de voz y tus referencias. Es un respaldo: no está pensado para editarse en Excel.',
  exportButton: 'Descargar Excel',
  exporting: 'Descargando…',
  exportError: 'No se pudo descargar el Excel',
  importTitle: 'Importar',
  importHelp:
    'Elegí un archivo .xlsx exportado desde DevNotes. Solo se puede importar en una cuenta sin datos, y se importa todo o nada.',
  fileLabel: 'Archivo de respaldo (.xlsx)',
  previewing: 'Revisando el archivo…',
  previewTitle: 'Contenido del archivo',
  legacyHelp: 'Los respaldos de versión 1 se importan en Trabajo.',
  total: 'Total de la cuenta',
  notEmpty: 'Solo se puede importar en una cuenta sin datos.',
  importButton: 'Importar',
  importing: 'Importando…',
  confirmTitle: '¿Importar este archivo?',
  confirmHelp: 'Se van a crear en tu cuenta:',
  confirmButton: 'Confirmar importación',
  cancel: 'Cancelar',
  importError: 'No se pudo importar el archivo',
  previewError: 'No se pudo leer el archivo',
  successTitle: 'Importación completa',
  csrfPending: 'Preparando la sesión para importar…',
} as const

const CODE_MESSAGES: Record<string, string> = {
  EXPORT_LIMIT_EXCEEDED:
    'Tu cuenta supera los límites de cantidad o tamaño de un respaldo restaurable. No se generó ningún archivo.',
  IMPORT_INVALID_FILE: 'El archivo no es un Excel exportado desde DevNotes.',
  IMPORT_UNSUPPORTED_FORMAT: 'El archivo no tiene el formato devnotes-xlsx versión 1 o 2.',
  IMPORT_INVALID_RECORD: 'El archivo tiene datos inválidos y no se puede importar.',
  IMPORT_TOO_LARGE: 'El archivo supera el máximo de 10 MB.',
  IMPORT_ACCOUNT_NOT_EMPTY: texts.notEmpty,
}

/** Hojas del formato: solo estos nombres se muestran, nunca un texto arbitrario de la respuesta. */
const SHEETS: ReadonlySet<string> = new Set([
  'devnotes',
  'referencias',
  'diarias',
  'versiones',
  'voz',
])

/**
 * Mensaje por código de S-107, con hoja y fila si el servidor las informó. Nunca usa `detail` ni contenido del
 * archivo. Cualquier 413 es «archivo demasiado grande»: el proxy y el multipart lo responden sin `code`.
 * 401, 403, red y 5xx usan el mensaje común.
 */
export function portabilityErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return errorMessage(error)
  if (error.status === 413) return CODE_MESSAGES.IMPORT_TOO_LARGE
  const code: unknown = error.problem?.code
  const base = typeof code === 'string' ? CODE_MESSAGES[code] : undefined
  if (base === undefined) {
    if (error.status === 401 || error.status === 403 || error.status >= 500) {
      return errorMessage(error)
    }
    return 'No se pudo procesar el archivo.'
  }
  return `${base}${location(error.problem?.sheet, error.problem?.row)}`
}

function location(sheet: unknown, row: unknown): string {
  const sheetName = typeof sheet === 'string' && SHEETS.has(sheet) ? sheet : null
  const rowNumber = typeof row === 'number' && Number.isInteger(row) && row > 0 ? row : null
  if (sheetName !== null && rowNumber !== null) return ` Hoja «${sheetName}», fila ${rowNumber}.`
  if (sheetName !== null) return ` Hoja «${sheetName}».`
  if (rowNumber !== null) return ` Fila ${rowNumber}.`
  return ''
}

export const COUNT_LABELS = [
  { key: 'dailyNotes', label: 'Notas diarias', to: '/notes', link: 'Notas' },
  { key: 'dailyVersions', label: 'Versiones guardadas', to: '/history', link: 'Historial' },
  { key: 'voiceNotes', label: 'Notas de voz', to: '/voice', link: 'Voz' },
  { key: 'references', label: 'Referencias', to: '/reference', link: 'Referencias' },
] as const

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC',
})

/** Fecha de exportación en UTC, como el nombre del archivo. */
export function formatExportedAt(iso: string): string {
  return `${dateFormat.format(new Date(iso))} UTC`
}
