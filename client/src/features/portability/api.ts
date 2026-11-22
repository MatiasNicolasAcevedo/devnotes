import { z } from 'zod'
import { http, UnexpectedResponseError, type RequestOptions } from '../../services/http'

export const EXPORT_PATH = '/api/v1/portability/export'
export const IMPORT_PREVIEW_PATH = '/api/v1/portability/import-preview'
export const IMPORTS_PATH = '/api/v1/portability/imports'

export const XLSX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
/** Nombre de respaldo cuando `Content-Disposition` falta o no trae un nombre seguro. */
export const FALLBACK_EXPORT_FILENAME = 'devnotes.xlsx'

const count = z.number().int().nonnegative()

export const importCountsSchema = z.object({
  references: count,
  dailyNotes: count,
  dailyVersions: count,
  voiceNotes: count,
  imageTexts: count,
})
export type ImportCounts = z.infer<typeof importCountsSchema>

const countsBySpaceSchema = z.object({ work: importCountsSchema, personal: importCountsSchema })
const accountCountsSchema = z.object({
  counts: importCountsSchema,
  countsBySpace: countsBySpaceSchema,
})
export type ImportResult = z.infer<typeof accountCountsSchema>

const countKeys = importCountsSchema.keyof().options

function countsMatch({ counts, countsBySpace: { work, personal } }: ImportResult): boolean {
  return countKeys.every((key) => work[key] + personal[key] === counts[key])
}

/** Contrato de `POST /api/v1/portability/import-preview` (S-109, S-112). */
export const importPreviewSchema = accountCountsSchema
  .extend({
    format: z.literal('devnotes-xlsx'),
    version: z.literal([1, 2, 3]),
    exportedAt: z.string().datetime(),
    accountEmpty: z.boolean(),
  })
  .refine(countsMatch, {
    path: ['countsBySpace'],
    message: 'Los conteos no coinciden con el total',
  })
  .refine(
    ({ version, countsBySpace }) =>
      version !== 1 || countKeys.every((key) => countsBySpace.personal[key] === 0),
    {
      path: ['countsBySpace', 'personal'],
      message: 'Un respaldo v1 solo contiene datos de Trabajo',
    },
  )
  .refine(({ version, counts }) => version === 3 || counts.imageTexts === 0, {
    path: ['counts', 'imageTexts'],
    message: 'Solo los respaldos v3 contienen textos de Imagen',
  })
export type ImportPreview = z.infer<typeof importPreviewSchema>

/** Contrato de `POST /api/v1/portability/imports` (201). */
export const importResultSchema = accountCountsSchema.refine(countsMatch, {
  path: ['countsBySpace'],
  message: 'Los conteos no coinciden con el total',
})

/** Señal y vigencia de la identidad que inició la petición. */
export type PortabilityScope = Pick<RequestOptions, 'signal' | 'sessionIsCurrent'>

export interface ExportDownload {
  blob: Blob
  filename: string
}

/**
 * Nombre del adjunto en `Content-Disposition`. Solo se acepta un nombre simple terminado en `.xlsx`: cualquier otra
 * forma (rutas, caracteres raros, cabecera ausente) cae en el nombre de respaldo.
 */
export function exportFilename(contentDisposition: string | null): string {
  const match = /filename="?([^";]+)"?/i.exec(contentDisposition ?? '')
  const name = match?.[1]?.trim() ?? ''
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.xlsx$/.test(name) ? name : FALLBACK_EXPORT_FILENAME
}

/** GET de la exportación. Solo se entrega un cuerpo completo con la longitud anunciada. */
export async function downloadExport(scope: PortabilityScope = {}): Promise<ExportDownload> {
  const { blob, headers } = await http.requestBlob(EXPORT_PATH, XLSX_MEDIA_TYPE, scope)
  const length = headers.get('Content-Length')
  if (length === null || !/^\d+$/.test(length) || blob.size === 0 || blob.size !== Number(length)) {
    throw new UnexpectedResponseError(`Longitud de respuesta inválida de ${EXPORT_PATH}`)
  }
  return { blob, filename: exportFilename(headers.get('Content-Disposition')) }
}

function filePart(file: File): FormData {
  const formData = new FormData()
  // Sin tercer argumento la parte es el mismo `File` elegido, con su nombre.
  formData.append('file', file)
  return formData
}

/** Valida y resume el archivo sin escribir nada. */
export function previewImport(file: File, scope: PortabilityScope = {}) {
  return http.request(IMPORT_PREVIEW_PATH, importPreviewSchema, {
    ...scope,
    method: 'POST',
    formData: filePart(file),
  })
}

/** Importa el archivo en la cuenta vacía de la sesión. No se reintenta. */
export function importFile(file: File, scope: PortabilityScope = {}) {
  return http.request(IMPORTS_PATH, importResultSchema, {
    ...scope,
    method: 'POST',
    formData: filePart(file),
  })
}

/** Entrega el blob al navegador con un `<a download>` temporal y libera la URL. */
export function saveBlob({ blob, filename }: ExportDownload): void {
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.hidden = true
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
