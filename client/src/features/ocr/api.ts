import { z } from 'zod'
import { ApiError, http, NetworkError } from '../../services/http'
import { spaceApiPath, type Space } from '../spaces/space'

const CAPABILITIES = '/api/v1/ocr/capabilities'
const EXTRACTIONS = '/api/v1/ocr/extractions'
const capabilitiesSchema = z.object({ available: z.boolean() })
const extractionSchema = z.object({ text: z.string().refine((text) => text.trim().length > 0) })

export const MAX_SCREENSHOT_BYTES = 1_000_000

export function getOcrCapabilities(space: Space, signal: AbortSignal) {
  return http.request(spaceApiPath(CAPABILITIES, space), capabilitiesSchema, {
    signal,
    sessionIsCurrent: () => !signal.aborted,
  })
}

export function extractScreenshot(space: Space, file: File, signal: AbortSignal) {
  const formData = new FormData()
  formData.set('file', file, file.type === 'image/png' ? 'captura.png' : 'captura.jpg')
  return http.request(spaceApiPath(EXTRACTIONS, space), extractionSchema, {
    method: 'POST',
    formData,
    signal,
    sessionIsCurrent: () => !signal.aborted,
  })
}

export function validateScreenshot(file: File): string | null {
  const validType =
    (file.type === 'image/png' && /\.png$/i.test(file.name)) ||
    (file.type === 'image/jpeg' && /\.jpe?g$/i.test(file.name))
  if (!validType) return 'Elegí una imagen PNG o JPG.'
  if (file.size === 0) return 'La imagen está vacía. Elegí otra.'
  if (file.size > MAX_SCREENSHOT_BYTES) return 'Elegí una imagen de hasta 1 MB.'
  return null
}

export function extractionErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) return 'No se pudo contactar al servidor. Probá de nuevo.'
  if (error instanceof ApiError) {
    switch (error.problem?.code) {
      case 'OCR_PARTIAL':
        return 'La extracción quedó incompleta.'
      case 'OCR_QUOTA_EXHAUSTED':
        return 'Se alcanzó el límite de OCR.space. Probá más tarde.'
      case 'OCR_BUSY':
        return 'Ya hay extracciones en curso. Probá más tarde.'
    }
    switch (error.status) {
      case 400:
        return 'No se pudo leer la imagen. Elegí otro archivo PNG o JPG.'
      case 401:
        return 'La sesión terminó. Volvé a iniciar sesión.'
      case 403:
        return 'No se pudo autorizar la extracción. Volvé a abrir Herramientas.'
      case 413:
        return 'La imagen supera los límites de tamaño o dimensiones. Elegí una captura más chica.'
      case 415:
        return 'El archivo no es una imagen PNG o JPG válida. Elegí otra.'
      case 422:
        return 'No se encontró texto en la captura.'
      case 503:
        return 'La extracción de texto no está disponible.'
      case 504:
        return 'Se agotó el tiempo de espera de la extracción. Probá de nuevo.'
    }
  }
  return 'No se pudo extraer texto de la captura. Probá de nuevo.'
}
