import { http as mock, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../../services/csrf'
import { ApiError, UnexpectedResponseError } from '../../services/http'
import { problemResponse } from '../../test/factories'
import { server } from '../../test/msw/server'
import {
  EXPORT_PATH,
  FALLBACK_EXPORT_FILENAME,
  IMPORT_PREVIEW_PATH,
  IMPORTS_PATH,
  XLSX_MEDIA_TYPE,
  downloadExport,
  exportFilename,
  importFile,
  importPreviewSchema,
  importResultSchema,
  previewImport,
  saveBlob,
} from './api'
import { portabilityErrorMessage } from './messages'

const counts = { references: 2, dailyNotes: 3, dailyVersions: 1, voiceNotes: 4 }
const emptyCounts = { references: 0, dailyNotes: 0, dailyVersions: 0, voiceNotes: 0 }
const legacyCounts = { work: counts, personal: emptyCounts }
const preview = {
  format: 'devnotes-xlsx',
  version: 1,
  exportedAt: '2026-11-10T12:00:00.123456Z',
  counts,
  countsBySpace: legacyCounts,
  accountEmpty: true,
}

function xlsxFile(name = 'devnotes-2026-11-10.xlsx') {
  return new File(['PK ficticio'], name, { type: XLSX_MEDIA_TYPE })
}

function xlsxResponse(headers: Record<string, string> = {}, body = 'PK libro ficticio') {
  return new HttpResponse(body, {
    headers: {
      'Content-Type': XLSX_MEDIA_TYPE,
      'Cache-Control': 'no-store',
      'Content-Length': String(new TextEncoder().encode(body).length),
      ...headers,
    },
  })
}

describe('exportFilename', () => {
  it('toma el nombre del Content-Disposition del servidor', () => {
    expect(exportFilename('attachment; filename="devnotes-2026-11-10.xlsx"')).toBe(
      'devnotes-2026-11-10.xlsx',
    )
    expect(exportFilename('attachment; filename=devnotes-2026-11-10.xlsx')).toBe(
      'devnotes-2026-11-10.xlsx',
    )
  })

  it.each([
    null,
    '',
    'attachment',
    'attachment; filename="../../etc/passwd.xlsx"',
    'attachment; filename="C:\\datos\\libro.xlsx"',
    'attachment; filename="libro.xlsm"',
    'attachment; filename="libro.xlsx.exe"',
    'attachment; filename=".xlsx"',
  ])('usa el nombre de respaldo ante %j', (header) => {
    expect(exportFilename(header)).toBe(FALLBACK_EXPORT_FILENAME)
  })
})

describe('downloadExport', () => {
  it('pide el libro con credenciales del mismo origen y devuelve blob y nombre', async () => {
    let seen: Request | undefined
    server.use(
      mock.get(EXPORT_PATH, ({ request }) => {
        seen = request
        return xlsxResponse({
          'Content-Disposition': 'attachment; filename="devnotes-2026-11-10.xlsx"',
        })
      }),
    )

    const result = await downloadExport()

    expect(result.filename).toBe('devnotes-2026-11-10.xlsx')
    expect(await result.blob.text()).toBe('PK libro ficticio')
    expect(seen?.headers.get('Accept')).toBe(`${XLSX_MEDIA_TYPE}, application/problem+json`)
    expect(seen?.credentials).toBe('same-origin')
    expect(seen?.headers.has(CSRF_HEADER_NAME)).toBe(false)
  })

  it('sin Content-Disposition usa devnotes.xlsx', async () => {
    server.use(mock.get(EXPORT_PATH, () => xlsxResponse()))
    expect((await downloadExport()).filename).toBe('devnotes.xlsx')
  })

  it('un cuerpo vacío no es una descarga', async () => {
    server.use(mock.get(EXPORT_PATH, () => xlsxResponse({}, '')))
    await expect(downloadExport()).rejects.toBeInstanceOf(UnexpectedResponseError)
  })

  it.each(['99', '1', 'incorrecto', '2, 2', null])(
    'rechaza un blob que no coincide con Content-Length %s',
    async (length) => {
      const headers = new Headers({ 'Content-Type': XLSX_MEDIA_TYPE })
      if (length !== null) headers.set('Content-Length', length)
      // Entrega el cuerpo ya recibido. El transporte HTTP de Node puede cortarlo o rechazarlo antes.
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('PK', { headers }))
      await expect(downloadExport()).rejects.toBeInstanceOf(UnexpectedResponseError)
    },
  )

  it.each([401, 403, 500])('un %i llega como ApiError', async (status) => {
    server.use(mock.get(EXPORT_PATH, () => problemResponse(status)))
    await expect(downloadExport()).rejects.toMatchObject({ name: 'ApiError', status })
  })

  it('propaga el aborto de la identidad', async () => {
    server.use(mock.get(EXPORT_PATH, () => xlsxResponse()))
    const controller = new AbortController()
    controller.abort()
    await expect(downloadExport({ signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})

describe.each([
  {
    name: 'previewImport',
    path: IMPORT_PREVIEW_PATH,
    call: previewImport,
    status: 200,
    body: preview,
  },
  {
    name: 'importFile',
    path: IMPORTS_PATH,
    call: importFile,
    status: 201,
    body: { counts, countsBySpace: legacyCounts },
  },
])('$name', ({ path, call, status, body }) => {
  afterEach(() => vi.restoreAllMocks())

  it('envía una sola parte «file» con el archivo elegido y el header CSRF', async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=csrf-ficticio; Path=/`
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    let seen: Request | undefined
    server.use(
      mock.post(path, ({ request }) => {
        seen = request
        return HttpResponse.json(body, { status })
      }),
    )
    const file = xlsxFile()

    await expect(call(file)).resolves.toEqual(body)

    expect(seen?.headers.get(CSRF_HEADER_NAME)).toBe('csrf-ficticio')
    expect(seen?.credentials).toBe('same-origin')
    const init = fetchSpy.mock.calls[0]?.[1]
    const sent = init?.body
    expect(sent).toBeInstanceOf(FormData)
    const parts = [...(sent as FormData).entries()]
    expect(parts).toHaveLength(1)
    expect(parts[0]?.[0]).toBe('file')
    expect(parts[0]?.[1]).toBe(file)
    // El boundary lo genera el navegador: no hay Content-Type manual.
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false)
  })

  it('rechaza una respuesta fuera de contrato', async () => {
    server.use(
      mock.post(path, () =>
        HttpResponse.json({ counts: { ...counts, voiceNotes: -1 } }, { status }),
      ),
    )
    await expect(call(xlsxFile())).rejects.toBeInstanceOf(UnexpectedResponseError)
  })

  it('un error conserva code, sheet y row del ProblemDetail', async () => {
    server.use(
      mock.post(path, () =>
        problemResponse(400, { code: 'IMPORT_INVALID_RECORD', sheet: 'diarias', row: 7 }),
      ),
    )
    const error: unknown = await call(xlsxFile()).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).problem).toMatchObject({
      code: 'IMPORT_INVALID_RECORD',
      sheet: 'diarias',
      row: 7,
    })
  })

  it('propaga el aborto en vuelo sin convertirlo en error de red', async () => {
    let entered!: () => void
    const inFlight = new Promise<void>((resolve) => {
      entered = resolve
    })
    server.use(
      mock.post(path, async ({ request }) => {
        entered()
        await new Promise((resolve) => request.signal.addEventListener('abort', resolve))
        return HttpResponse.json(body, { status })
      }),
    )
    // El File de jsdom no se serializa como multipart en el fetch de Node con una respuesta demorada: se
    // reemplaza solo el cuerpo y la señal llega intacta.
    const intercepted = globalThis.fetch
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
      intercepted(input, { ...init, body: 'multipart-ficticio' }),
    )
    const controller = new AbortController()
    const pending = call(xlsxFile(), { signal: controller.signal }).catch(
      (caught: unknown) => caught,
    )
    await inFlight
    controller.abort()

    expect(await pending).toMatchObject({ name: 'AbortError' })
  })
})

const countsBySpace = {
  work: { references: 2, dailyNotes: 1, dailyVersions: 0, voiceNotes: 3 },
  personal: { references: 0, dailyNotes: 2, dailyVersions: 1, voiceNotes: 1 },
}

describe('conteos por espacio', () => {
  it('acepta un respaldo v2 con datos en ambos espacios', () => {
    expect(importPreviewSchema.parse({ ...preview, version: 2, countsBySpace })).toMatchObject({
      version: 2,
      countsBySpace,
    })
    expect(importResultSchema.parse({ counts, countsBySpace })).toEqual({ counts, countsBySpace })
  })

  it('acepta un respaldo v1 del servidor con todos los datos en Trabajo', () => {
    const summary = { work: counts, personal: emptyCounts }
    expect(importPreviewSchema.parse({ ...preview, countsBySpace: summary })).toMatchObject({
      version: 1,
      countsBySpace: summary,
    })
  })

  it('rechaza una vista previa v1 que asigna registros a Personal', () => {
    expect(importPreviewSchema.safeParse({ ...preview, countsBySpace }).success).toBe(false)
  })

  it.each([
    { work: counts },
    { work: counts, personal: counts },
    { work: { ...counts, dailyNotes: -1 }, personal: emptyCounts },
  ])('rechaza conteos incompletos o incompatibles con el total', (breakdown) => {
    expect(
      importPreviewSchema.safeParse({ ...preview, version: 2, countsBySpace: breakdown }).success,
    ).toBe(false)
    expect(importResultSchema.safeParse({ counts, countsBySpace: breakdown }).success).toBe(false)
  })
})

describe('importPreviewSchema', () => {
  it('acepta una vista previa v1 según S-109', () => {
    expect(importPreviewSchema.safeParse(preview).success).toBe(true)
  })

  it.each([
    { ...preview, format: 'otro' },
    { ...preview, version: 2, countsBySpace: undefined },
    { ...preview, version: 3 },
    { ...preview, exportedAt: 'ayer' },
    { ...preview, accountEmpty: 'no' },
    { ...preview, counts: { references: 1 } },
  ])('rechaza %j', (body) => {
    expect(importPreviewSchema.safeParse(body).success).toBe(false)
  })
})

describe('saveBlob', () => {
  it('descarga con un <a download> temporal y revoca la URL', () => {
    const createObjectURL = vi.fn(() => 'blob:ficticio')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    let clicked: { href: string; download: string; connected: boolean } | undefined
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked = { href: this.href, download: this.download, connected: this.isConnected }
    })
    const blob = new Blob(['PK'])

    saveBlob({ blob, filename: 'devnotes-2026-11-10.xlsx' })

    expect(createObjectURL).toHaveBeenCalledExactlyOnceWith(blob)
    expect(clicked).toEqual({
      href: 'blob:ficticio',
      download: 'devnotes-2026-11-10.xlsx',
      connected: true,
    })
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:ficticio')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('revoca la URL aunque el clic falle', () => {
    const revokeObjectURL = vi.fn()
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:ficticio', revokeObjectURL }),
    )
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => saveBlob({ blob: new Blob(['PK']), filename: 'devnotes.xlsx' })).toThrow()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:ficticio')
  })
})

describe('portabilityErrorMessage', () => {
  const api = (status: number, problem: Record<string, unknown> | null) =>
    new ApiError(status, problem)

  it.each([
    [
      'EXPORT_LIMIT_EXCEEDED',
      409,
      'Tu cuenta supera los límites de cantidad o tamaño de un respaldo restaurable. No se generó ningún archivo.',
    ],
    ['IMPORT_INVALID_FILE', 400, 'El archivo no es un Excel exportado desde DevNotes.'],
    [
      'IMPORT_UNSUPPORTED_FORMAT',
      400,
      'El archivo no tiene el formato devnotes-xlsx versión 1 o 2.',
    ],
    ['IMPORT_INVALID_RECORD', 400, 'El archivo tiene datos inválidos y no se puede importar.'],
    ['IMPORT_TOO_LARGE', 413, 'El archivo supera el máximo de 10 MB.'],
    ['IMPORT_ACCOUNT_NOT_EMPTY', 409, 'Solo se puede importar en una cuenta sin datos.'],
  ])('%s tiene su mensaje y nunca usa detail', (code, status, message) => {
    expect(portabilityErrorMessage(api(status, { code, detail: 'contenido de la celda' }))).toBe(
      message,
    )
  })

  it('agrega hoja y fila cuando existen', () => {
    const code = 'IMPORT_INVALID_RECORD'
    const base = 'El archivo tiene datos inválidos y no se puede importar.'
    expect(portabilityErrorMessage(api(400, { code, sheet: 'diarias', row: 7 }))).toBe(
      `${base} Hoja «diarias», fila 7.`,
    )
    expect(portabilityErrorMessage(api(400, { code, sheet: 'voz' }))).toBe(`${base} Hoja «voz».`)
    expect(portabilityErrorMessage(api(400, { code, row: 2 }))).toBe(`${base} Fila 2.`)
  })

  it('no muestra una hoja desconocida ni una fila no entera', () => {
    const message = portabilityErrorMessage(
      api(400, { code: 'IMPORT_INVALID_RECORD', sheet: '=cmd|calc', row: '7; DROP' }),
    )
    expect(message).toBe('El archivo tiene datos inválidos y no se puede importar.')
  })

  it('cualquier 413 es archivo demasiado grande, aunque no traiga code (proxy o multipart)', () => {
    expect(portabilityErrorMessage(api(413, null))).toBe('El archivo supera el máximo de 10 MB.')
  })

  it('401, 403, 5xx y red usan el mensaje común; un 4xx sin code no muestra detail', () => {
    expect(portabilityErrorMessage(api(401, null))).toBe(
      'Tu sesión no está activa. Iniciá sesión para continuar.',
    )
    expect(portabilityErrorMessage(api(403, null))).toBe(
      'No tenés permiso para realizar esta acción.',
    )
    expect(portabilityErrorMessage(api(502, null))).toMatch(/servidor no está disponible/)
    expect(portabilityErrorMessage(api(400, { detail: 'eco del archivo' }))).toBe(
      'No se pudo procesar el archivo.',
    )
    expect(portabilityErrorMessage(new Error('x'))).toBe(
      'Ocurrió un error inesperado. Intentá de nuevo.',
    )
  })
})
