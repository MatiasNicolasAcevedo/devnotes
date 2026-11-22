import { act, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http as mock } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { CSRF_HEADER_NAME } from '../../services/csrf'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { authQueryKeys } from '../auth/api'
import * as api from './api'
import { EXPORT_PATH, IMPORT_PREVIEW_PATH, IMPORTS_PATH, XLSX_MEDIA_TYPE } from './api'

/*
 * Pantalla /data con sesión, router, Query y cliente HTTP reales; la API se simula con MSW en las rutas reales.
 * Solo se sustituye lo que jsdom no implementa: URL.createObjectURL/revokeObjectURL y el clic de descarga.
 */
const a = buildAuthUser({ id: '01900000-0000-7000-8000-00000000000a', displayName: 'Persona A' })
const b = buildAuthUser({ id: '01900000-0000-7000-8000-00000000000b', displayName: 'Persona B' })
const counts = { references: 2, dailyNotes: 3, dailyVersions: 1, voiceNotes: 4, imageTexts: 0 }
const countsBySpace = {
  work: counts,
  personal: { references: 0, dailyNotes: 0, dailyVersions: 0, voiceNotes: 0, imageTexts: 0 },
}
const FILE_LABEL = 'Archivo de respaldo (.xlsx)'

function xlsxFile(name = 'devnotes-2026-11-10.xlsx') {
  return new File(['PK ficticio'], name, { type: XLSX_MEDIA_TYPE })
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

interface Backend {
  accountEmpty: boolean
  previews: number
  imports: number
  exports: number
  csrfHeaders: (string | null)[]
  previewResponse: (() => Response) | null
  importResponse: (() => Response) | null
  exportResponse: (() => Response) | null
  holdPreview: Promise<void> | null
  holdImport: Promise<void> | null
  holdExport: Promise<void> | null
}

function installBackend(overrides: Partial<Backend> = {}): Backend {
  const backend: Backend = {
    accountEmpty: true,
    previews: 0,
    imports: 0,
    exports: 0,
    csrfHeaders: [],
    previewResponse: null,
    importResponse: null,
    exportResponse: null,
    holdPreview: null,
    holdImport: null,
    holdExport: null,
    ...overrides,
  }
  server.use(
    mock.get(EXPORT_PATH, async () => {
      backend.exports += 1
      if (backend.holdExport) await backend.holdExport
      return (
        backend.exportResponse?.() ??
        new HttpResponse('PK libro ficticio', {
          headers: {
            'Content-Type': XLSX_MEDIA_TYPE,
            'Content-Length': '17',
            'Content-Disposition': 'attachment; filename="devnotes-2026-11-10.xlsx"',
          },
        })
      )
    }),
    mock.post(IMPORT_PREVIEW_PATH, async ({ request }) => {
      backend.previews += 1
      backend.csrfHeaders.push(request.headers.get(CSRF_HEADER_NAME))
      if (backend.holdPreview) await backend.holdPreview
      return (
        backend.previewResponse?.() ??
        HttpResponse.json({
          format: 'devnotes-xlsx',
          version: 1,
          exportedAt: '2026-11-10T12:30:00.123456Z',
          counts,
          countsBySpace,
          accountEmpty: backend.accountEmpty,
        })
      )
    }),
    mock.post(IMPORTS_PATH, async ({ request }) => {
      backend.imports += 1
      backend.csrfHeaders.push(request.headers.get(CSRF_HEADER_NAME))
      if (backend.holdImport) await backend.holdImport
      return (
        backend.importResponse?.() ?? HttpResponse.json({ counts, countsBySpace }, { status: 201 })
      )
    }),
  )
  return backend
}

/** Partes multipart que salieron por `fetch`, en orden, con la ruta de destino. */
const sentForms: { path: string; parts: [string, FormDataEntryValue][] }[] = []

const createObjectURL = vi.fn<(blob: Blob) => string>()
const revokeObjectURL = vi.fn<(url: string) => void>()
const anchorClick = vi.fn<(download: string, href: string) => void>()

beforeEach(() => {
  createObjectURL.mockReset().mockReturnValue('blob:ficticio')
  revokeObjectURL.mockReset()
  anchorClick.mockReset()
  Object.assign(URL, { createObjectURL, revokeObjectURL })
  // El `File` de jsdom no se puede serializar como multipart en el fetch de Node cuando la respuesta se demora
  // (corta con un error de longitud que no existe en el navegador). Se registra el FormData real que envía el
  // cliente y se reemplaza solo el cuerpo: ruta, método, cabeceras, credenciales y señal llegan intactos a MSW.
  sentForms.length = 0
  const intercepted = globalThis.fetch
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    if (!(init?.body instanceof FormData)) return intercepted(input, init)
    sentForms.push({ path: String(input), parts: [...init.body.entries()] })
    return intercepted(input, { ...init, body: 'multipart-ficticio' })
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    if (this.hasAttribute('download')) anchorClick(this.download, this.href)
  })
})

async function renderData(backendOverrides: Partial<Backend> = {}) {
  const auth = installAuthBackend({ user: a })
  const backend = installBackend(backendOverrides)
  const view = renderWithProviders(<AppRoutes />, { route: '/data' })
  await screen.findByRole('heading', { name: 'Datos de la cuenta', level: 1 })
  const input = await screen.findByLabelText(FILE_LABEL)
  await waitFor(() => expect(input).toBeEnabled())
  return { auth, backend, input, ...view }
}

function expectCounts(list: HTMLElement) {
  expect(within(list).getByText(/Notas diarias: 3/)).toBeVisible()
  expect(within(list).getByText(/Versiones guardadas: 1/)).toBeVisible()
  expect(within(list).getByText(/Notas de voz: 4/)).toBeVisible()
  expect(within(list).getByText(/Referencias: 2/)).toBeVisible()
}

describe('DataPage · exportar', () => {
  it('descarga el Excel con el nombre del servidor, crea y revoca la URL', async () => {
    const held = deferred()
    const { user, backend } = await renderData({ holdExport: held.promise })

    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))

    // En vuelo: deshabilitado y sin anunciar éxito.
    expect(screen.getByRole('button', { name: 'Descargando…' })).toBeDisabled()
    expect(screen.queryByText(/Descarga lista/)).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    held.resolve()

    expect(await screen.findByText('Descarga lista: devnotes-2026-11-10.xlsx')).toBeVisible()
    expect(screen.getByText(/Descarga lista/).closest('[role="status"]')).not.toBeNull()
    expect(backend.exports).toBe(1)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(await createObjectURL.mock.calls[0]?.[0].text()).toBe('PK libro ficticio')
    expect(anchorClick).toHaveBeenCalledExactlyOnceWith('devnotes-2026-11-10.xlsx', 'blob:ficticio')
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:ficticio')
    expect(document.querySelector('a[download]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Descargar Excel' })).toBeEnabled()
  })

  it('sin Content-Disposition usa el nombre de respaldo', async () => {
    const { user } = await renderData({
      exportResponse: () =>
        new HttpResponse('PK', {
          headers: { 'Content-Type': XLSX_MEDIA_TYPE, 'Content-Length': '2' },
        }),
    })
    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))
    expect(await screen.findByText('Descarga lista: devnotes.xlsx')).toBeVisible()
    expect(anchorClick).toHaveBeenCalledExactlyOnceWith('devnotes.xlsx', 'blob:ficticio')
  })

  it.each([
    ['un 500', () => problemResponse(500)],
    ['una caída de red', () => HttpResponse.error()],
    [
      'un cuerpo vacío',
      () => new HttpResponse('', { headers: { 'Content-Type': XLSX_MEDIA_TYPE } }),
    ],
  ])('%s muestra el error con reintento y nunca anuncia éxito', async (_name, failure) => {
    const { user, backend } = await renderData({ exportResponse: failure })

    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo descargar el Excel')
    expect(screen.queryByText(/Descarga lista/)).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(anchorClick).not.toHaveBeenCalled()

    backend.exportResponse = null
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Descarga lista: devnotes-2026-11-10.xlsx')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(backend.exports).toBe(2)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
  })

  it('descarta el cuerpo truncado y permite reintentar sin anunciar éxito', async () => {
    const { user } = await renderData()
    // Simula el cuerpo incompleto ya recibido, sin que el transporte HTTP de Node lo rechace antes.
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('PK', { headers: { 'Content-Type': XLSX_MEDIA_TYPE, 'Content-Length': '99' } }),
    )

    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo descargar el Excel')
    expect(screen.queryByText(/Descarga lista/)).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(anchorClick).not.toHaveBeenCalled()

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Descarga lista: devnotes-2026-11-10.xlsx')).toBeVisible()
    expect(anchorClick).toHaveBeenCalledTimes(1)
  })

  it('explica el límite de exportación sin iniciar una descarga ni anunciar éxito', async () => {
    const { user } = await renderData({
      exportResponse: () => problemResponse(409, { code: 'EXPORT_LIMIT_EXCEEDED' }),
    })

    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta supera los límites de cantidad o tamaño de un respaldo restaurable. No se generó ningún archivo.',
    )
    expect(screen.queryByText(/Descarga lista/)).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(anchorClick).not.toHaveBeenCalled()
  })
})

describe('DataPage · vista previa', () => {
  it('al elegir un archivo muestra la fecha de exportación y los cuatro conteos', async () => {
    const held = deferred()
    const { user, backend, input } = await renderData({ holdPreview: held.promise })
    expect(input).toHaveAttribute('accept', '.xlsx')
    expect(input).toHaveAttribute('type', 'file')

    await user.upload(input, xlsxFile())

    expect(await screen.findByText('Revisando el archivo…')).toHaveAttribute('role', 'status')
    expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument()
    held.resolve()

    const preview = await screen.findByRole('region', { name: 'Contenido del archivo' })
    expect(within(preview).getByText(/Exportado el 10 de noviembre de 2026/)).toBeVisible()
    expect(within(preview).getByText(/12:30.*UTC/)).toBeVisible()
    expect(
      within(preview).getByText('Los respaldos de versión 1 se importan en Trabajo.'),
    ).toBeVisible()
    expectCounts(within(preview).getByRole('list', { name: 'Trabajo' }))
    expect(within(preview).getByRole('list', { name: 'Personal' })).toHaveTextContent(
      'Notas diarias: 0',
    )
    expectCounts(within(preview).getByRole('list', { name: 'Total de la cuenta' }))
    expect(screen.getByRole('button', { name: 'Importar' })).toBeEnabled()
    expect(backend.previews).toBe(1)
    expect(backend.imports).toBe(0)
    expect(backend.csrfHeaders).toEqual(['csrf-ficticio-1'])
  })

  it('muestra la versión 2 y los conteos de ambos espacios antes de confirmar', async () => {
    const { user, backend, input } = await renderData({
      previewResponse: () =>
        HttpResponse.json({
          format: 'devnotes-xlsx',
          version: 2,
          exportedAt: '2026-11-10T12:30:00Z',
          counts,
          countsBySpace: {
            work: { references: 2, dailyNotes: 1, dailyVersions: 1, voiceNotes: 0, imageTexts: 0 },
            personal: {
              references: 0,
              dailyNotes: 2,
              dailyVersions: 0,
              voiceNotes: 4,
              imageTexts: 0,
            },
          },
          accountEmpty: true,
        }),
    })

    await user.upload(input, xlsxFile())
    const preview = await screen.findByRole('region', { name: 'Contenido del archivo' })
    expect(within(preview).getByText(/Versión 2/)).toBeVisible()
    expect(within(preview).getByRole('list', { name: 'Trabajo' })).toHaveTextContent(
      'Notas diarias: 1',
    )
    expect(within(preview).getByRole('list', { name: 'Personal' })).toHaveTextContent(
      'Notas diarias: 2',
    )
    await user.click(within(preview).getByRole('button', { name: 'Importar' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('list', { name: 'Personal' })).toHaveTextContent(
      'Notas de voz: 4',
    )
    expect(backend.imports).toBe(0)
  })

  it('muestra los textos de Imagen por espacio en v3 y al confirmar', async () => {
    const { user, input } = await renderData({
      previewResponse: () =>
        HttpResponse.json({
          format: 'devnotes-xlsx',
          version: 3,
          exportedAt: '2026-11-10T12:30:00Z',
          counts: { references: 0, dailyNotes: 0, dailyVersions: 0, voiceNotes: 0, imageTexts: 3 },
          countsBySpace: {
            work: { references: 0, dailyNotes: 0, dailyVersions: 0, voiceNotes: 0, imageTexts: 1 },
            personal: {
              references: 0,
              dailyNotes: 0,
              dailyVersions: 0,
              voiceNotes: 0,
              imageTexts: 2,
            },
          },
          accountEmpty: true,
        }),
    })

    await user.upload(input, xlsxFile())
    const preview = await screen.findByRole('region', { name: 'Contenido del archivo' })
    expect(within(preview).getByText(/Versión 3/)).toBeVisible()
    for (const [name, count] of [
      ['Trabajo', 1],
      ['Personal', 2],
      ['Total de la cuenta', 3],
    ] as const) {
      expect(within(preview).getByRole('list', { name })).toHaveTextContent(
        'Textos de Imagen: ' + count,
      )
    }
    await user.click(within(preview).getByRole('button', { name: 'Importar' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('list', { name: 'Personal' })).toHaveTextContent(
      'Textos de Imagen: 2',
    )
  })

  it('con accountEmpty: false explica el motivo y no ofrece importar ni confirmar', async () => {
    const { user, backend, input } = await renderData({ accountEmpty: false })

    await user.upload(input, xlsxFile())

    const preview = await screen.findByRole('region', { name: 'Contenido del archivo' })
    expectCounts(within(preview).getByRole('list', { name: 'Total de la cuenta' }))
    expect(within(preview).getByRole('status')).toHaveTextContent(
      'Solo se puede importar en una cuenta sin datos.',
    )
    expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar importación' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(backend.imports).toBe(0)
  })

  it('elegir otro archivo aborta la vista previa en vuelo y descarta su respuesta', async () => {
    const held = deferred()
    const { user, backend, input } = await renderData({ holdPreview: held.promise })
    const previewSpy = vi.spyOn(api, 'previewImport')

    await user.upload(input, xlsxFile('primero.xlsx'))
    await screen.findByText('Revisando el archivo…')
    await waitFor(() => expect(backend.previews).toBe(1))
    expect(input).toBeEnabled()

    // El segundo archivo responde enseguida y dice que la cuenta tiene datos.
    backend.holdPreview = null
    backend.accountEmpty = false
    await user.upload(input, xlsxFile('segundo.xlsx'))

    expect(await screen.findByText('Solo se puede importar en una cuenta sin datos.')).toBeVisible()
    expect(previewSpy.mock.calls.map(([file]) => file.name)).toEqual([
      'primero.xlsx',
      'segundo.xlsx',
    ])
    expect(previewSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    expect(previewSpy.mock.calls[1]?.[1]?.signal?.aborted).toBe(false)

    // La respuesta tardía del primero diría «cuenta vacía»: no debe habilitar la importación.
    backend.accountEmpty = true
    await act(async () => {
      held.resolve()
      await Promise.resolve()
    })
    expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument()
    expect(screen.getByText('Solo se puede importar en una cuenta sin datos.')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('DataPage · importar', () => {
  it('confirma con los conteos, envía el mismo archivo una sola vez e invalida las queries', async () => {
    const held = deferred()
    const { user, backend, input, queryClient } = await renderData({ holdImport: held.promise })
    const previewSpy = vi.spyOn(api, 'previewImport')
    const importSpy = vi.spyOn(api, 'importFile')
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const file = xlsxFile()

    await user.upload(input, file)
    await user.click(await screen.findByRole('button', { name: 'Importar' }))

    const dialog = await screen.findByRole('dialog', { name: '¿Importar este archivo?' })
    expectCounts(within(dialog).getByRole('list', { name: 'Total de la cuenta' }))
    expect(backend.imports).toBe(0)
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar importación' }))

    expect(await screen.findByText('Importando…')).toHaveAttribute('role', 'status')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument()
    expect(input).toBeDisabled()
    const selector = screen.getByRole('button', { name: 'Espacio: Trabajo' })
    await user.click(selector)
    const spaceMenu = screen.getByRole('menu', { name: 'Cambiar de espacio' })
    expect(spaceMenu).toHaveAccessibleDescription('Hay una importación en curso.')
    const personal = within(spaceMenu).getByRole('menuitemradio', { name: 'Personal' })
    expect(personal).toHaveAttribute('aria-disabled', 'true')
    expect(personal).not.toHaveAttribute('href')
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Importación completa')).not.toBeInTheDocument()
    expect(invalidate).not.toHaveBeenCalled()
    held.resolve()

    const title = await screen.findByText('Importación completa')
    const success = title.closest('[role="status"]')
    expect(success).not.toBeNull()
    const list = within(success as HTMLElement).getByRole('list', { name: 'Total de la cuenta' })
    expectCounts(list)
    const work = within(success as HTMLElement).getByRole('list', { name: 'Trabajo' })
    expect(within(work).getByRole('link', { name: 'Ver en Notas (Trabajo)' })).toHaveAttribute(
      'href',
      '/notes?space=work',
    )
    expect(within(work).getByRole('link', { name: 'Ver en Voz (Trabajo)' })).toHaveAttribute(
      'href',
      '/voice?space=work',
    )
    expect(
      within(work).getByRole('link', { name: 'Ver en Referencias (Trabajo)' }),
    ).toHaveAttribute('href', '/reference?space=work')
    expect(title).toHaveFocus()

    expect(backend.previews).toBe(1)
    expect(backend.imports).toBe(1)
    expect(previewSpy).toHaveBeenCalledTimes(1)
    expect(importSpy).toHaveBeenCalledTimes(1)
    expect(importSpy.mock.calls[0]?.[0]).toBe(file)
    expect(previewSpy.mock.calls[0]?.[0]).toBe(file)
    // En el cable: una sola parte «file» por petición, con el mismo File elegido.
    expect(sentForms.map((form) => form.path)).toEqual([IMPORT_PREVIEW_PATH, IMPORTS_PATH])
    for (const form of sentForms) {
      expect(form.parts).toHaveLength(1)
      expect(form.parts[0]?.[0]).toBe('file')
      expect(form.parts[0]?.[1]).toBe(file)
    }
    expect(backend.csrfHeaders).toEqual(['csrf-ficticio-1', 'csrf-ficticio-1'])
    expect(invalidate).toHaveBeenCalledExactlyOnceWith()
    expect(input).toBeEnabled()
  })

  it('cancelar la confirmación no importa y devuelve el foco a «Importar»', async () => {
    const { user, backend, input } = await renderData()

    await user.upload(input, xlsxFile())
    const importButton = await screen.findByRole('button', { name: 'Importar' })
    await user.click(importButton)
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(backend.imports).toBe(0)
    await waitFor(() => expect(importButton).toHaveFocus())
    expect(screen.queryByText('Importación completa')).not.toBeInTheDocument()
  })

  it('un 409 al importar muestra el mensaje, no anuncia éxito ni invalida, y reintentar vuelve a revisar', async () => {
    const { user, backend, input, queryClient } = await renderData({
      importResponse: () => problemResponse(409, { code: 'IMPORT_ACCOUNT_NOT_EMPTY' }),
    })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.upload(input, xlsxFile())
    await user.click(await screen.findByRole('button', { name: 'Importar' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar importación' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo importar el archivo')
    expect(alert).toHaveTextContent('Solo se puede importar en una cuenta sin datos.')
    expect(alert).toHaveFocus()
    expect(screen.queryByText('Importación completa')).not.toBeInTheDocument()
    expect(invalidate).not.toHaveBeenCalled()
    expect(backend.imports).toBe(1)

    backend.accountEmpty = false
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('region', { name: 'Contenido del archivo' })).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // Reintentar nunca reenvía la importación sin una confirmación nueva.
    expect(backend.imports).toBe(1)
    expect(backend.previews).toBe(2)
  })
})

describe('DataPage · errores por código', () => {
  const cases: [string, number, Record<string, unknown>, string][] = [
    [
      'IMPORT_INVALID_FILE',
      400,
      { code: 'IMPORT_INVALID_FILE' },
      'El archivo no es un Excel exportado desde DevNotes.',
    ],
    [
      'IMPORT_UNSUPPORTED_FORMAT',
      400,
      { code: 'IMPORT_UNSUPPORTED_FORMAT', sheet: 'devnotes', row: 2 },
      'El archivo no tiene el formato devnotes-xlsx con una versión compatible (1, 2 o 3). Hoja «devnotes», fila 2.',
    ],
    [
      'IMPORT_INVALID_RECORD',
      400,
      { code: 'IMPORT_INVALID_RECORD', sheet: 'diarias', row: 7 },
      'El archivo tiene datos inválidos y no se puede importar. Hoja «diarias», fila 7.',
    ],
    [
      'IMPORT_TOO_LARGE',
      413,
      { code: 'IMPORT_TOO_LARGE' },
      'El archivo supera el máximo de 10 MB.',
    ],
    [
      'IMPORT_ACCOUNT_NOT_EMPTY',
      409,
      { code: 'IMPORT_ACCOUNT_NOT_EMPTY' },
      'Solo se puede importar en una cuenta sin datos.',
    ],
  ]

  it.each(cases)(
    '%s en la vista previa muestra su mensaje con hoja y fila, sin contenido',
    async (_code, status, problem, message) => {
      const { user, backend, input } = await renderData({
        previewResponse: () =>
          problemResponse(status, { ...problem, detail: 'CONTENIDO-DE-CELDA-FICTICIO' }),
      })

      await user.upload(input, xlsxFile())

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('No se pudo leer el archivo')
      expect(alert).toHaveTextContent(message)
      expect(screen.queryByText(/CONTENIDO-DE-CELDA-FICTICIO/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Contenido del archivo' })).toBeNull()
      expect(backend.imports).toBe(0)
      expect(input).toBeEnabled()
    },
  )

  it.each(cases)(
    '%s al importar muestra su mensaje con hoja y fila',
    async (_code, status, problem, message) => {
      const { user, input } = await renderData({
        importResponse: () => problemResponse(status, problem),
      })

      await user.upload(input, xlsxFile())
      await user.click(await screen.findByRole('button', { name: 'Importar' }))
      await user.click(await screen.findByRole('button', { name: 'Confirmar importación' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('No se pudo importar el archivo')
      expect(alert).toHaveTextContent(message)
      expect(screen.queryByText('Importación completa')).not.toBeInTheDocument()
    },
  )

  it('un 413 del proxy, sin code ni JSON, se trata como archivo demasiado grande', async () => {
    const { user, input } = await renderData({
      previewResponse: () =>
        new HttpResponse('<html><h1>413 Request Entity Too Large</h1></html>', {
          status: 413,
          headers: { 'Content-Type': 'text/html' },
        }),
    })

    await user.upload(input, xlsxFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo supera el máximo de 10 MB.',
    )
    expect(screen.queryByText(/Request Entity/)).not.toBeInTheDocument()
  })

  it('un 403 renueva el CSRF, no reenvía solo y permite reintentar', async () => {
    const { user, backend, input, auth } = await renderData({
      previewResponse: () => problemResponse(403),
    })
    const csrfCalls = auth.calls.csrf

    await user.upload(input, xlsxFile())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'La operación fue rechazada y no se aplicó. Volvé a intentarla.',
    )
    expect(backend.previews).toBe(1)
    expect(auth.calls.csrf).toBe(csrfCalls + 1)

    backend.previewResponse = null
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: 'Importar' })).toBeVisible()
    expect(backend.previews).toBe(2)
  })

  it('un 401 sigue el flujo de sesión existente y saca la pantalla privada', async () => {
    const { user, input, auth } = await renderData({
      previewResponse: () => problemResponse(401),
    })
    auth.expireSession()

    await user.upload(input, xlsxFile())

    expect(await screen.findByText('La sesión terminó. Volvé a ingresar.')).toBeVisible()
    expect(screen.queryByLabelText(FILE_LABEL)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Descargar Excel' })).not.toBeInTheDocument()
  })
})

describe('DataPage · sesión e identidad', () => {
  it('un visitante ve la invitación a ingresar y no se llama a la API', async () => {
    installAuthBackend()
    const backend = installBackend()
    renderWithProviders(<AppRoutes />, { route: '/data' })

    expect(await screen.findByText(/Ingresá para exportar o importar tus datos/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: 'Descargar Excel' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(FILE_LABEL)).not.toBeInTheDocument()
    expect(backend.exports + backend.previews + backend.imports).toBe(0)
  })

  async function switchToB(
    auth: ReturnType<typeof installAuthBackend>,
    queryClient: Awaited<ReturnType<typeof renderData>>['queryClient'],
  ) {
    auth.login(b)
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: authQueryKeys.session })
    })
    await screen.findByRole('button', { name: 'Cuenta de Persona B' })
    const input = await screen.findByLabelText(FILE_LABEL)
    await waitFor(() => expect(input).toBeEnabled())
  }

  it('una importación de A que responde tarde no muestra éxito ni invalida en la sesión de B', async () => {
    const held = deferred()
    const settled = deferred()
    const { user, backend, input, auth, queryClient } = await renderData({
      holdImport: held.promise,
    })
    const original = api.importFile
    const importSpy = vi.spyOn(api, 'importFile').mockImplementation(async (...args) => {
      try {
        return await original(...args)
      } finally {
        settled.resolve()
      }
    })

    await user.upload(input, xlsxFile())
    await user.click(await screen.findByRole('button', { name: 'Importar' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar importación' }))
    await screen.findByText('Importando…')
    await waitFor(() => expect(backend.imports).toBe(1))

    await switchToB(auth, queryClient)
    // La petición de A se abortó con su identidad.
    expect(importSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await act(async () => {
      held.resolve()
      await settled.promise
    })

    expect(screen.queryByText('Importación completa')).not.toBeInTheDocument()
    expect(screen.queryByText('Importando…')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Contenido del archivo' })).toBeNull()
    expect(invalidate).not.toHaveBeenCalled()
    expect(backend.imports).toBe(1)
    expect(queryClient.getQueryData(authQueryKeys.session)).toMatchObject({ id: b.id })
  })

  it('una vista previa de A que responde tarde no aparece en la sesión de B', async () => {
    const held = deferred()
    const { user, input, auth, queryClient } = await renderData({ holdPreview: held.promise })

    await user.upload(input, xlsxFile())
    await screen.findByText('Revisando el archivo…')
    await switchToB(auth, queryClient)
    await act(async () => {
      held.resolve()
      await Promise.resolve()
    })

    expect(screen.queryByText('Revisando el archivo…')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Contenido del archivo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('una descarga de A que responde tarde no entrega el archivo en la sesión de B', async () => {
    const held = deferred()
    const { user, auth, queryClient } = await renderData({ holdExport: held.promise })

    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))
    await screen.findByRole('button', { name: 'Descargando…' })
    await switchToB(auth, queryClient)
    await act(async () => {
      held.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: 'Descargar Excel' })).toBeEnabled()
    expect(screen.queryByText(/Descarga lista/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(anchorClick).not.toHaveBeenCalled()
  })

  it('no usa el almacenamiento del navegador', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { user, input } = await renderData()

    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))
    await screen.findByText(/Descarga lista/)
    await user.upload(input, xlsxFile())
    await user.click(await screen.findByRole('button', { name: 'Importar' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar importación' }))
    await screen.findByText('Importación completa')

    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
  })
})

describe('DataPage · teclado, foco y 375 px', () => {
  it('se recorre y se opera solo con teclado', async () => {
    const { user, backend, input } = await renderData()
    const download = screen.getByRole('button', { name: 'Descargar Excel' })

    // Orden de tabulación: descargar y luego el archivo, ambos controles nativos enfocables.
    download.focus()
    expect(download).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByText(/Descarga lista/)).toBeVisible()
    await user.tab()
    expect(input).toHaveFocus()
    expect(input).toHaveAccessibleName(FILE_LABEL)
    expect(input).toHaveAccessibleDescription(/Solo se puede importar en una cuenta sin datos/)

    await user.upload(input, xlsxFile())
    const importButton = await screen.findByRole('button', { name: 'Importar' })
    await user.tab()
    expect(importButton).toHaveFocus()

    // Escape cierra sin importar y devuelve el foco.
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: '¿Importar este archivo?' })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(importButton).toHaveFocus())
    expect(backend.imports).toBe(0)

    // Confirmar con teclado: Tab hasta «Confirmar importación» dentro del diálogo.
    await user.keyboard('{Enter}')
    const confirm = within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Confirmar importación',
    })
    for (let i = 0; i < 4 && document.activeElement !== confirm; i += 1) await user.tab()
    expect(confirm).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Importación completa')).toHaveFocus()
    expect(backend.imports).toBe(1)
  })

  it('el foco del archivo es visible y nada fuerza ancho fijo a 375 px', async () => {
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))
    const { user, input } = await renderData()
    await user.upload(input, xlsxFile())
    const importButton = await screen.findByRole('button', { name: 'Importar' })

    // jsdom no calcula layout: se comprueban las reglas que impiden el overflow horizontal.
    const page = screen.getByRole('heading', { name: 'Datos de la cuenta', level: 1 }).parentElement
      ?.parentElement as HTMLElement
    expect(getComputedStyle(page).minWidth).toBe('0px')
    expect(getComputedStyle(page).overflowWrap).toBe('anywhere')
    expect(getComputedStyle(input).maxWidth).toBe('100%')
    for (const button of [screen.getByRole('button', { name: 'Descargar Excel' }), importButton]) {
      expect(getComputedStyle(button).maxWidth).toBe('100%')
    }
    for (const element of page.querySelectorAll<HTMLElement>('*')) {
      const style = getComputedStyle(element)
      expect(style.whiteSpace).not.toBe('nowrap')
      expect(style.minWidth === '' || !/^[1-9]\d{2,}px$/.test(style.minWidth)).toBe(true)
      expect(/^\d{3,}px$/.test(style.width)).toBe(false)
    }
    expect(page.querySelector('table')).toBeNull()

    // Regla de foco visible del input nativo.
    const focusRule = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .map((rule) => rule.cssText)
      .find((text) => text.includes(':focus-visible') && text.includes('outline: 2px solid'))
    expect(focusRule).toBeDefined()

    await user.click(importButton)
    const actions = within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Cancelar',
    }).parentElement as HTMLElement
    expect(getComputedStyle(actions).flexWrap).toBe('wrap')
  })
})
