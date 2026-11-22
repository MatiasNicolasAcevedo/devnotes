import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { useLayoutEffect } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { authQueryKeys } from '../auth/api'

const CAPABILITIES = '/api/v1/ocr/capabilities'
const EXTRACTIONS = '/api/v1/ocr/extractions'
const IMAGE_TEXTS = '/api/spaces/:space/image-texts'
const DATE = '2026-11-15'
const TITLE = 'Imagen a texto'
const TEXT = 'T-055\nERR_CONNECTION_RESET\n/src/api/foo-bar.ts'
const png = new File(['png ficticio'], 'captura.png', { type: 'image/png' })
const jpeg = new File(['jpeg ficticio'], 'otra.jpeg', { type: 'image/jpeg' })
const createUrl = vi.fn()
const revokeUrl = vi.fn()

beforeEach(() => {
  createUrl.mockReset().mockReturnValueOnce('blob:captura').mockReturnValue('blob:otra')
  revokeUrl.mockReset()
  Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function Navigation({ onReady }: { onReady: (navigate: NavigateFunction) => void }) {
  const navigate = useNavigate()
  useLayoutEffect(() => onReady(navigate), [navigate, onReady])
  return <AppRoutes />
}

async function notes({ available = true, route = `/notes/${DATE}?space=work` } = {}) {
  const auth = installAuthBackend({ user: buildAuthUser() })
  const capability = vi.fn()
  server.use(
    mock.get(IMAGE_TEXTS, () => HttpResponse.json({ items: [], next: null })),
    mock.get(CAPABILITIES, ({ request }) => {
      capability(new URL(request.url).search)
      return HttpResponse.json({ available })
    }),
    mock.get('/api/v1/daily-notes/:date', ({ params }) =>
      HttpResponse.json({
        id: '01900000-0000-7000-8000-000000000002',
        date: params.date,
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Borrador' }] }],
        },
        revision: 1,
        updatedAt: `${DATE}T10:00:00Z`,
      }),
    ),
    mock.get('/api/v1/daily-notes', () =>
      HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 1 }),
    ),
  )
  const navigation = deferred<NavigateFunction>()
  const view = renderWithProviders(<Navigation onReady={navigation.resolve} />, { route })
  const navigate = await navigation.promise
  const trigger = await screen.findByRole('link', { name: 'Imagen' })
  const editor = await screen.findByLabelText('Editor de nota diaria')
  await waitFor(() => expect(editor).toHaveTextContent('Borrador'))
  return { ...view, auth, capability, navigate, trigger, editor }
}

async function openImage(view: Awaited<ReturnType<typeof notes>>) {
  await view.user.click(view.trigger)
  await screen.findByRole('heading', { name: TITLE })
  await waitFor(() =>
    expect(screen.queryByText('Comprobando disponibilidad…')).not.toBeInTheDocument(),
  )
  return screen.getByRole('main')
}

function chooseFile(file: File) {
  fireEvent.change(screen.getByLabelText('Archivo de la captura'), {
    target: { files: [file] },
  })
}

const extractButton = () => screen.getByRole('button', { name: 'Extraer texto' })
const extractedText = () => screen.findByRole('textbox', { name: 'Texto extraído' })

describe('Textos guardados', () => {
  const id = '01900000-0000-7000-8000-000000000004'
  const createdAt = '2026-11-21T23:10:00Z'

  it('protege el doble clic y reintenta el mismo guardado tras perder la respuesta', async () => {
    const view = await notes()
    const responses = deferred<void>()
    const requests: unknown[] = []
    const post = vi.fn(() => HttpResponse.json({ text: TEXT }))
    server.use(
      mock.post(EXTRACTIONS, post),
      mock.post(IMAGE_TEXTS, async ({ params, request }) => {
        expect(params.space).toBe('work')
        requests.push(await request.json())
        if (requests.length === 1) {
          await responses.promise
          return HttpResponse.error()
        }
        return HttpResponse.json({ id, text: 'Texto editado', createdAt }, { status: 201 })
      }),
    )
    await openImage(view)
    chooseFile(png)
    await view.user.click(extractButton())
    const result = await extractedText()
    fireEvent.change(result, { target: { value: 'Texto editado' } })
    const save = screen.getByRole('button', { name: /^Guardar$/ })
    await view.user.dblClick(save)
    await waitFor(() => expect(requests).toHaveLength(1))
    expect(save).toBeDisabled()
    responses.resolve()
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el texto')
    expect(result).toHaveValue('Texto editado')
    await view.user.click(save)
    expect(await screen.findByText('Texto guardado', { exact: true })).toBeVisible()
    expect(requests).toHaveLength(2)
    expect(requests[0]).toEqual({
      text: 'Texto editado',
      attemptId: expect.stringMatching(
        /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
      ),
    })
    expect(requests[1]).toEqual(requests[0])
    expect(result).toHaveValue('Texto editado')
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('conserva la fila al fallar el borrado y enfoca el encabezado después de reintentar', async () => {
    const view = await notes({ available: false })
    let deleted = false
    const remove = vi.fn().mockImplementationOnce(() => new HttpResponse(null, { status: 500 }))
    server.use(
      mock.get(IMAGE_TEXTS, () =>
        HttpResponse.json({
          items: deleted ? [] : [{ id, excerpt: 'Texto anterior', createdAt }],
          next: null,
        }),
      ),
      mock.delete(`${IMAGE_TEXTS}/:id`, ({ params }) => {
        expect(params).toMatchObject({ space: 'work', id })
        const failed = remove()
        if (failed) return failed
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openImage(view)
    const removeButton = await screen.findByRole('button', { name: 'Borrar Texto anterior' })
    await view.user.click(removeButton)
    const dialog = await screen.findByRole('dialog', { name: 'Borrar texto guardado' })
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar' })
    await view.user.click(confirm)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se pudo borrar el texto')
    expect(removeButton).toBeInTheDocument()
    await view.user.click(confirm)
    expect(
      await screen.findByText('Todavía no hay textos guardados en este espacio.'),
    ).toBeVisible()
    expect(removeButton).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Textos guardados' })).toHaveFocus(),
    )
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it.each(['espacio', 'cuenta'] as const)(
    'descarta un guardado tardío al cambiar de %s',
    async (context) => {
      const view = await notes()
      const entered = deferred<void>()
      const resume = deferred<void>()
      server.use(
        mock.post(EXTRACTIONS, () => HttpResponse.json({ text: TEXT })),
        mock.post(IMAGE_TEXTS, async () => {
          entered.resolve()
          await resume.promise
          return HttpResponse.json({ id, text: TEXT, createdAt }, { status: 201 })
        }),
      )
      await openImage(view)
      chooseFile(png)
      await view.user.click(extractButton())
      await extractedText()
      await view.user.click(screen.getByRole('button', { name: /^Guardar$/ }))
      await entered.promise
      if (context === 'espacio') {
        await view.user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
        await view.user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
        await screen.findByRole('button', { name: 'Espacio: Personal' })
      } else {
        act(() => view.queryClient.setQueryData(authQueryKeys.session, buildAuthUser({ id })))
      }
      await waitFor(() => expect(screen.queryByLabelText('Texto extraído')).not.toBeInTheDocument())
      await act(async () => resume.resolve())
      expect(screen.queryByText('Texto guardado', { exact: true })).not.toBeInTheDocument()
      expect(screen.queryByText('Guardando texto…')).not.toBeInTheDocument()
    },
  )
})

describe('Imagen a texto', () => {
  it('muestra la disponibilidad en el espacio activo y no permite extraer cuando está deshabilitada', async () => {
    const post = vi.fn(() => HttpResponse.json({ text: TEXT }))
    server.use(mock.post(EXTRACTIONS, post))
    const view = await notes({ available: false, route: `/notes/${DATE}?space=personal` })
    expect(view.capability).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Herramientas' })).not.toBeInTheDocument()
    view.trigger.focus()
    await view.user.keyboard('{Enter}')
    await screen.findByText('La extracción no está habilitada en este espacio.')
    expect(view.trigger).toHaveAttribute('aria-current', 'page')
    expect(view.trigger).toHaveAttribute('href', '/image?space=personal')
    expect(view.capability).toHaveBeenCalledExactlyOnceWith('?space=personal')
    chooseFile(png)
    expect(extractButton()).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
  })

  it('lee el portapapeles solo con Pegar y orienta a Ctrl+V con permiso denegado', async () => {
    const view = await notes()
    const blob = new Blob([png], { type: png.type })
    const read = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('fixture', 'NotAllowedError'))
      .mockResolvedValueOnce([{ types: ['image/png'], getType: () => Promise.resolve(blob) }])
    Object.defineProperty(navigator.clipboard, 'read', { configurable: true, value: read })
    const image = await openImage(view)
    const zone = within(image).getByRole('group', { name: 'Zona para pegar una captura' })
    const button = within(image).getByRole('button', { name: 'Pegar' })
    expect(read).not.toHaveBeenCalled()
    await view.user.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Ctrl\+V/)
    await waitFor(() => expect(zone).toHaveFocus())
    await view.user.click(button)
    expect(await screen.findByAltText('Vista previa de la captura')).toBeVisible()
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('protege la edición al cambiar de espacio y al cerrar sesión voluntariamente', async () => {
    const view = await notes()
    server.use(mock.post(EXTRACTIONS, () => HttpResponse.json({ text: TEXT })))
    await openImage(view)
    chooseFile(png)
    await view.user.click(extractButton())
    const result = await extractedText()
    fireEvent.change(result, { target: { value: 'Texto editado' } })
    await view.user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
    await view.user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    const confirm = await screen.findByRole('dialog', { name: /descartar los cambios/i })
    await view.user.click(within(confirm).getByRole('button', { name: 'Seguir editando' }))
    expect(result).toHaveValue('Texto editado')
    expect(view.trigger).toHaveAttribute('href', '/image?space=work')

    await view.user.click(screen.getByRole('button', { name: /^Cuenta de / }))
    await view.user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    await view.user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Seguir editando' }),
    )
    expect(result).toHaveValue('Texto editado')

    await view.user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
    await view.user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    await view.user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar cambios' }),
    )
    await waitFor(() => expect(view.trigger).toHaveAttribute('href', '/image?space=personal'))
    expect(result).not.toBeInTheDocument()
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:captura')
  })

  it('pega o elige una imagen y conserva la previa al cancelar o invalidar', async () => {
    const post = vi.fn(() => HttpResponse.json({ text: TEXT }))
    server.use(mock.post(EXTRACTIONS, post))
    const view = await notes()
    await openImage(view)
    const pasteZone = screen.getByRole('group', { name: 'Zona para pegar una captura' })
    expect(pasteZone).toHaveFocus()
    expect(extractButton()).toBeDisabled()
    fireEvent.paste(pasteZone, { clipboardData: { files: [png] } })
    const preview = screen.getByAltText('Vista previa de la captura')
    expect(preview).toHaveAttribute('src', 'blob:captura')
    expect(extractButton()).toHaveAccessibleDescription(/imagen completa a OCR.space/)
    fireEvent(
      screen.getByLabelText('Archivo de la captura'),
      new Event('cancel', { bubbles: true }),
    )
    expect(screen.getByText('La captura anterior sigue seleccionada.')).toBeVisible()
    expect(preview).toHaveAttribute('src', 'blob:captura')
    chooseFile(new File(['demo'], 'captura.gif', { type: 'image/gif' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/PNG o JPG/)
    chooseFile(new File([new Uint8Array(1_000_001)], 'captura.png', { type: 'image/png' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/hasta 1 MB/)
    expect(preview).toHaveAttribute('src', 'blob:captura')
    chooseFile(jpeg)
    expect(preview).toHaveAttribute('src', 'blob:otra')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(createUrl.mock.calls).toEqual([[png], [jpeg]])
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:captura')
    expect(post).not.toHaveBeenCalled()
  })

  it.each(['hijo', 'botón'] as const)(
    'previsualiza una captura pegada desde un %s y mantiene la extracción deliberada',
    async (target) => {
      const post = vi.fn(() => HttpResponse.json({ text: TEXT }))
      server.use(mock.post(EXTRACTIONS, post))
      const view = await notes()
      const image = await openImage(view)
      const zone = within(image).getByRole('group', { name: 'Zona para pegar una captura' })
      expect(zone).toHaveFocus()
      expect(screen.queryByAltText('Vista previa de la captura')).not.toBeInTheDocument()
      expect(screen.queryByRole('textbox', { name: 'Texto extraído' })).not.toBeInTheDocument()
      expect(extractButton()).toBeDisabled()

      const hint = within(zone).getByText('Pegá tu imagen acá')
      await view.user.click(hint)
      expect(zone).toHaveFocus()
      const pasteButton = within(image).getByRole('button', { name: 'Pegar' })
      if (target === 'botón') {
        await view.user.tab()
        expect(pasteButton).toHaveFocus()
      }

      const unnamed = new File([png], 'image', { type: png.type })
      fireEvent.paste(target === 'hijo' ? hint : pasteButton, {
        clipboardData: {
          files: [],
          items: [
            { kind: 'string', type: 'text/plain', getAsFile: () => null },
            { kind: 'file', type: png.type, getAsFile: () => unnamed },
          ],
        },
      })
      const preview = screen.getByAltText('Vista previa de la captura')
      expect(preview).toHaveAttribute('src', 'blob:captura')
      expect(hint).not.toBeInTheDocument()
      expect(createUrl).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          name: 'captura.png',
          type: png.type,
          size: png.size,
        }),
      )
      expect(extractButton()).toBeEnabled()
      expect(post).not.toHaveBeenCalled()
    },
  )

  it('explica el pegado sin imagen o inválido sin reemplazar la captura ni interceptar fuera de OCR', async () => {
    const view = await notes()
    const image = await openImage(view)
    chooseFile(png)
    const preview = screen.getByAltText('Vista previa de la captura')
    const choose = within(image).getByRole('button', { name: 'Elegir otra imagen' })
    const paste = (files: File[], types: string[] = []) =>
      fireEvent.paste(choose, { clipboardData: { files, items: [], types } })
    paste([], ['text/plain'])
    expect(screen.getByRole('alert')).toHaveTextContent(/no hay una imagen/i)
    paste([])
    expect(screen.getByRole('alert')).toHaveTextContent(/no hay una imagen/i)
    paste([new File(['fixture'], 'captura.gif', { type: 'image/gif' })])
    expect(screen.getByRole('alert')).toHaveTextContent(/PNG o JPG/)
    paste([new File([new Uint8Array(1_000_001)], 'image', { type: 'image/png' })])
    expect(screen.getByRole('alert')).toHaveTextContent(/hasta 1 MB/)
    expect(fireEvent.paste(view.trigger, { clipboardData: { files: [jpeg], items: [] } })).toBe(
      true,
    )
    expect(preview).toHaveAttribute('src', 'blob:captura')
    expect(createUrl).toHaveBeenCalledTimes(1)
  })

  it('enfoca el resultado en escritorio, admite pegar texto y conserva la edición si falla copiar', async () => {
    server.use(mock.post(EXTRACTIONS, () => HttpResponse.json({ text: TEXT })))
    const view = await notes()
    await openImage(view)
    chooseFile(png)
    await view.user.click(extractButton())
    const result = await extractedText()
    expect(result).toHaveFocus()
    expect(result).toHaveValue(TEXT)
    if (!(result instanceof HTMLTextAreaElement)) throw new Error('Falta el campo editable')
    result.setSelectionRange(TEXT.length, TEXT.length)
    await view.user.paste('\nNotas de diagnóstico')
    const edited = `${TEXT}\nNotas de diagnóstico`
    expect(result).toHaveValue(edited)
    expect(fireEvent.paste(result, { clipboardData: { files: [jpeg], items: [] } })).toBe(true)
    expect(result).toHaveValue(edited)
    expect(createUrl).toHaveBeenCalledTimes(1)

    const clipboard = vi.spyOn(navigator.clipboard, 'writeText')
    clipboard.mockRejectedValueOnce(new DOMException('fixture', 'NotAllowedError'))
    const copy = screen.getByRole('button', { name: 'Copiar texto' })
    await view.user.click(copy)
    expect(await screen.findByRole('alert')).toHaveTextContent(/copiá el texto manualmente/)
    expect(result).toHaveValue(edited)
    expect(clipboard).toHaveBeenLastCalledWith(edited)
    await view.user.click(copy)
    expect(await screen.findByText('Texto copiado')).toBeVisible()
    expect(clipboard).toHaveBeenCalledTimes(2)
    await act(() => view.navigate(-1))
    expect(screen.queryByRole('heading', { name: TITLE })).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Editor de nota diaria')).toHaveTextContent('Borrador')
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:captura')
  })

  it('confirma el descarte del texto editado al cerrar o reemplazar una selección válida', async () => {
    server.use(mock.post(EXTRACTIONS, () => HttpResponse.json({ text: TEXT })))
    const view = await notes()
    await openImage(view)
    chooseFile(png)
    await view.user.click(extractButton())
    const result = await extractedText()
    fireEvent.change(result, { target: { value: 'Texto editado' } })
    await view.user.click(screen.getByRole('link', { name: 'Notas' }))
    const confirm = await screen.findByRole('dialog', { name: /descartar los cambios/i })
    await view.user.click(within(confirm).getByRole('button', { name: 'Seguir editando' }))
    expect(result).toHaveValue('Texto editado')

    chooseFile(jpeg)
    await view.user.click(
      within(await screen.findByRole('dialog', { name: /descartar los cambios/i })).getByRole(
        'button',
        { name: 'Descartar cambios' },
      ),
    )
    expect(result).not.toBeInTheDocument()
    expect(screen.getByAltText('Vista previa de la captura')).toHaveAttribute('src', 'blob:otra')
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:captura')
  })

  it('anuncia el texto en pantalla táctil y espera el toque antes de enfocar el campo', async () => {
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query === '(pointer: coarse)' ? { ...matchMedia(query), matches: true } : matchMedia(query),
    )
    server.use(mock.post(EXTRACTIONS, () => HttpResponse.json({ text: TEXT })))
    const view = await notes()
    await openImage(view)
    chooseFile(png)
    await view.user.click(extractButton())
    const result = await extractedText()
    expect(result).not.toHaveFocus()
    expect(screen.getByText('Texto listo')).toHaveAttribute('role', 'status')
    await view.user.click(result)
    expect(result).toHaveFocus()
  })

  it.each([
    [400, null, 'No se pudo leer la imagen.'],
    [413, null, 'La imagen supera los límites'],
    [415, null, 'El archivo no es una imagen PNG o JPG válida.'],
    [422, 'OCR_NO_TEXT', 'No se encontró texto'],
    [504, 'OCR_TIMEOUT', 'Se agotó el tiempo'],
    [429, 'OCR_QUOTA_EXHAUSTED', 'Se alcanzó el límite de OCR.space.'],
    [429, 'OCR_BUSY', 'Ya hay extracciones en curso.'],
    [502, 'OCR_PROVIDER_ERROR', 'No se pudo extraer texto'],
    [502, 'OCR_PARTIAL', 'La extracción quedó incompleta.'],
    [503, 'OCR_UNAVAILABLE', 'La extracción de texto no está disponible.'],
  ])('muestra el error %s %s sin texto del proveedor', async (status, code, message) => {
    server.use(
      mock.post(EXTRACTIONS, () => problemResponse(status, { code, detail: 'detalle oculto' })),
    )
    const view = await notes()
    await openImage(view)
    chooseFile(png)
    await view.user.click(extractButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText('detalle oculto')).not.toBeInTheDocument()
    expect(screen.getByAltText('Vista previa de la captura')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar texto' })).toBeDisabled()
  })

  it.each(['imagen', 'atrás', 'ruta', 'espacio', 'identidad', 'sesión'] as const)(
    'aborta e ignora la respuesta anterior al cambiar %s, con un POST pese al doble clic',
    async (change) => {
      const release = deferred<Response>()
      const view = await notes()
      await openImage(view)
      chooseFile(png)
      const fetchImpl = globalThis.fetch
      const post = vi
        .fn(() => release.promise)
        .mockImplementationOnce(() => release.promise)
        .mockResolvedValueOnce(HttpResponse.json({ text: 'respuesta nueva' }))
      const fetch = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation((input, options) =>
          typeof input === 'string' && input.startsWith(EXTRACTIONS)
            ? post()
            : fetchImpl(input, options),
        )
      await view.user.dblClick(extractButton())
      const signal = fetch.mock.calls.find(
        ([input]) => typeof input === 'string' && input.startsWith(EXTRACTIONS),
      )?.[1]?.signal
      expect(signal).toBeInstanceOf(AbortSignal)
      expect(post).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Extrayendo texto…')).toBeVisible()
      if (change === 'imagen') {
        chooseFile(jpeg)
        await view.user.click(extractButton())
        expect(await extractedText()).toHaveValue('respuesta nueva')
      } else if (change === 'atrás') {
        await act(() => view.navigate(-1))
      } else if (change === 'identidad' || change === 'sesión') {
        const user =
          change === 'identidad'
            ? buildAuthUser({ id: '01900000-0000-7000-8000-000000000009' })
            : null
        if (user) view.auth.login(user)
        else view.auth.expireSession()
        act(() => view.queryClient.setQueryData(authQueryKeys.session, user))
      } else {
        const path = change === 'ruta' ? '/notes/2026-11-14?space=work' : '/image?space=personal'
        await act(() => view.navigate(path))
      }
      try {
        await waitFor(() => expect(signal?.aborted).toBe(true))
        expect(revokeUrl).toHaveBeenCalledWith('blob:captura')
      } finally {
        await act(() => {
          release.resolve(HttpResponse.json({ text: 'respuesta anterior' }))
        })
      }
      if (change === 'atrás') await openImage(view)
      expect(screen.queryByDisplayValue('respuesta anterior')).not.toBeInTheDocument()
      expect(post).toHaveBeenCalledTimes(change === 'imagen' ? 2 : 1)
    },
  )
})
