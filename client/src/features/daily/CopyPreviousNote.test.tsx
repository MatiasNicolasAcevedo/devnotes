import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { Link } from 'react-router'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { authQueryKeys } from '../auth/api'
import { dailyNoteKeys } from './api'
import { emptyDocument, type DailyContent } from './editor/dailyDocument'
import { setTestDebounce } from './useDailyNote'

const notes = '/api/v1/daily-notes'
const date = '2026-11-16'
const detail = `${notes}/${date}`
const offer = 'Copiar nota del 13/11/2026 a 16/11/2026 en Trabajo'
const suggestion = {
  sourceDate: '2026-11-13',
  sourceRevision: 3,
  sourceUpdatedAt: '2026-11-13T12:00:00Z',
}

function document(text: string): DailyContent {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}

function note(content: DailyContent, revision = 1) {
  return {
    id: '01900000-0000-7000-8000-000000000002',
    date,
    content,
    revision,
    updatedAt: `${date}T12:00:00Z`,
  }
}

function setup() {
  installAuthBackend({ user: buildAuthUser() })
  server.use(
    mock.get(detail, () => problemResponse(404)),
    mock.get(`${detail}/previous`, () => HttpResponse.json(suggestion)),
    mock.get(notes, () =>
      HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    ),
  )
  setTestDebounce(150)
  return () => renderWithProviders(<AppRoutes />, { route: `/notes/${date}?space=work` })
}

const editor = () => screen.getByRole('textbox', { name: 'Editor de nota diaria' })
const saveStatus = () => within(screen.getByRole('status', { name: 'Estado de guardado' }))

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeAll(() => {
  Object.defineProperties(Range.prototype, {
    getClientRects: { configurable: true, value: () => [] },
    getBoundingClientRect: { configurable: true, value: () => new DOMRect() },
  })
})
afterAll(() => {
  Reflect.deleteProperty(Range.prototype, 'getClientRects')
  Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect')
})

afterEach(() => setTestDebounce(undefined))

describe('Copiar nota anterior', () => {
  it('muestra el origen antes del click, bloquea mientras espera y deshace con la revisión del ACK', async () => {
    const render = setup()
    const pending = deferred()
    const copied = note(document('Contenido anterior'))
    let saved: ReturnType<typeof note> | undefined
    const posts: unknown[] = []
    const puts: unknown[] = []
    server.use(
      mock.get(detail, () => (saved ? HttpResponse.json(saved) : problemResponse(404))),
      mock.post(`${detail}/copy-previous`, async ({ request }) => {
        posts.push(await request.json())
        expect(new URL(request.url).searchParams.get('space')).toBe('work')
        expect(request.headers.has('X-XSRF-TOKEN')).toBe(true)
        await pending.promise
        saved = copied
        return HttpResponse.json(copied)
      }),
      mock.put(detail, async ({ request }) => {
        puts.push(await request.json())
        saved = note(emptyDocument(), 2)
        return HttpResponse.json(saved)
      }),
    )
    const { user } = render()
    const button = await screen.findByRole('button', { name: offer }, { timeout: 5000 })
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByText(/última nota de Trabajo.*13\/11\/2026/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Copiar nota' })).toBeVisible()
    expect(posts).toEqual([])
    await user.dblClick(button)
    expect(screen.getByRole('button', { name: 'Copiando…' })).toBeDisabled()
    expect(screen.getByLabelText('Fecha')).toBeDisabled()
    expect(editor()).toHaveAttribute('contenteditable', 'false')
    pending.resolve()
    expect(await screen.findByText('Copiada del 13/11/2026')).toBeVisible()
    await waitFor(() => expect(editor()).toHaveTextContent('Contenido anterior'))
    expect(
      within(screen.getByRole('status', { name: 'Estado de guardado' })).getByText('Guardado'),
    ).toBeVisible()
    expect(posts).toEqual([{ sourceDate: '2026-11-13', sourceRevision: 3, expectedRevision: 0 }])
    act(() => editor().focus())
    await user.keyboard('{Control>}z{/Control}')
    await waitFor(() => expect(puts).toEqual([{ content: emptyDocument(), expectedRevision: 1 }]))
    expect(editor()).toHaveTextContent('')
  })

  it('distingue error de ausencia y mantiene editable el destino', async () => {
    const render = setup()
    let requests = 0
    server.use(
      mock.get(`${detail}/previous`, () =>
        ++requests === 1 ? problemResponse(500) : new HttpResponse(null, { status: 204 }),
      ),
    )
    const { user } = render()
    expect(await screen.findByText('No se pudo buscar la nota anterior.')).toBeVisible()
    expect(editor()).toHaveAttribute('contenteditable', 'true')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Todavía no hay una nota anterior en Trabajo')).toBeVisible()
    expect(screen.queryByRole('button', { name: offer })).toBeNull()
  })

  it.each([1, 2])(
    'coordina el GET de revisión %i recibido antes del ACK de revisión 1',
    async (remoteRevision) => {
      const render = setup()
      const pending = deferred()
      const copied = note(document('Copia confirmada en servidor'))
      const remote =
        remoteRevision === 1 ? copied : note(document('Edición remota posterior'), remoteRevision)
      let saved: ReturnType<typeof note> | undefined
      const puts: unknown[] = []
      server.use(
        mock.get(detail, () => (saved ? HttpResponse.json(saved) : problemResponse(404))),
        mock.post(`${detail}/copy-previous`, async () => {
          saved = remote
          await pending.promise
          return HttpResponse.json(copied)
        }),
        mock.put(detail, async ({ request }) => {
          puts.push(await request.json())
          saved = note(emptyDocument(), 2)
          return HttpResponse.json(saved)
        }),
      )

      const { user, queryClient } = render()
      await user.click(await screen.findByRole('button', { name: offer }))
      await waitFor(() => expect(saved).toEqual(remote))
      const queryKey = dailyNoteKeys(buildAuthUser().id, 'work').detail(date)
      await act(async () => queryClient.invalidateQueries({ queryKey }))
      await waitFor(() => expect(queryClient.getQueryData(queryKey)).toEqual(remote))
      expect(editor()).toHaveAttribute('contenteditable', 'false')
      await act(async () => pending.resolve())

      if (remoteRevision > 1) {
        const reload = await screen.findByRole('button', { name: 'Recargar nota' })
        expect(screen.queryByText(/Copiada del/)).toBeNull()
        expect(editor()).not.toHaveTextContent('Copia confirmada en servidor')
        expect(editor()).toHaveAttribute('contenteditable', 'false')
        await user.click(reload)
        await waitFor(() => expect(editor()).toHaveTextContent('Edición remota posterior'))
        expect(editor()).toHaveAttribute('contenteditable', 'true')
        expect(puts).toEqual([])
        return
      }

      expect(await screen.findByText('Copiada del 13/11/2026')).toBeVisible()
      expect(editor()).toHaveTextContent('Copia confirmada en servidor')
      expect(puts).toEqual([])
      act(() => editor().focus())
      await user.keyboard('{Control>}z{/Control}')
      await waitFor(() => expect(puts).toEqual([{ content: emptyDocument(), expectedRevision: 1 }]))
      expect(editor()).toHaveTextContent(/^$/)
    },
  )

  it('ignora la sugerencia que llega después de escribir localmente', async () => {
    const render = setup()
    const pending = deferred()
    let written: ReturnType<typeof note> | undefined
    server.use(
      mock.get(detail, () => (written ? HttpResponse.json(written) : problemResponse(404))),
      mock.get(`${detail}/previous`, async () => {
        await pending.promise
        return HttpResponse.json(suggestion)
      }),
      mock.put(detail, () => {
        written = note(document('borrador local'))
        return HttpResponse.json(written)
      }),
    )
    const { user } = render()
    await screen.findByText('Buscando la nota anterior…')
    act(() => editor().focus())
    await user.keyboard('borrador local')
    await act(async () => pending.resolve())
    await waitFor(() => expect(written?.revision).toBe(1))
    expect(editor()).toHaveTextContent('borrador local')
    expect(screen.queryByRole('button', { name: offer })).toBeNull()
  })

  it('refresca una fuente cambiada y exige otro click', async () => {
    const render = setup()
    let posts = 0
    server.use(
      mock.get(`${detail}/previous`, () =>
        HttpResponse.json(
          posts ? { ...suggestion, sourceDate: '2026-11-14', sourceRevision: 4 } : suggestion,
        ),
      ),
      mock.post(`${detail}/copy-previous`, () => {
        posts++
        return HttpResponse.json({ code: 'COPY_SOURCE_CHANGED' }, { status: 409 })
      }),
    )
    const { user } = render()
    await user.click(await screen.findByRole('button', { name: offer }))
    expect(await screen.findByText(/La nota de origen cambió/)).toBeVisible()
    expect(
      await screen.findByRole('button', {
        name: 'Copiar nota del 14/11/2026 a 16/11/2026 en Trabajo',
      }),
    ).toBeEnabled()
    expect(posts).toBe(1)
    expect(editor()).toHaveTextContent('')
  })

  it.each(['COPY_TARGET_NOT_EMPTY', 'COPY_TARGET_CHANGED', 'respuesta perdida'])(
    'reconsulta el destino antes de permitir repetir ante %s',
    async (failure) => {
      const render = setup()
      let posts = 0
      let failReload = failure === 'respuesta perdida'
      const remote = note(document('Contenido confirmado'))
      server.use(
        mock.get(detail, () => {
          if (!posts) return problemResponse(404)
          return failReload ? problemResponse(500) : HttpResponse.json(remote)
        }),
        mock.post(`${detail}/copy-previous`, () => {
          posts++
          return failure === 'respuesta perdida'
            ? HttpResponse.error()
            : HttpResponse.json({ code: failure }, { status: 409 })
        }),
      )
      const { user } = render()
      await user.click(await screen.findByRole('button', { name: offer }))
      const reload = await screen.findByRole('button', { name: 'Recargar nota' })
      expect(screen.queryByRole('button', { name: offer })).toBeNull()
      expect(editor()).toHaveAttribute('contenteditable', 'false')
      expect(screen.getByRole('button', { name: 'Guardar versión' })).toBeDisabled()
      expect(screen.queryByText(/Copiada del/)).toBeNull()
      expect(saveStatus().queryByText('Guardado')).toBeNull()
      expect(saveStatus().getByText('Sin confirmar')).toBeVisible()
      expect(posts).toBe(1)
      if (failReload) {
        await user.click(reload)
        expect(
          await screen.findByText('No se pudo cargar la nota de destino. Volvé a intentarlo.'),
        ).toBeVisible()
        expect(saveStatus().queryByText('Guardado')).toBeNull()
        expect(saveStatus().getByText('Sin confirmar')).toBeVisible()
        expect(editor()).toHaveAttribute('contenteditable', 'false')
        expect(screen.getByRole('button', { name: 'Guardar versión' })).toBeDisabled()
        failReload = false
      }
      await user.click(reload)
      await waitFor(() => expect(editor()).toHaveTextContent('Contenido confirmado'))
      expect(editor()).toHaveAttribute('contenteditable', 'true')
      expect(screen.getByRole('button', { name: 'Guardar versión' })).toBeEnabled()
      expect(saveStatus().getByText('Guardado')).toBeVisible()
      expect(screen.queryByText(/Copiada del/)).toBeNull()
      expect(screen.queryByRole('button', { name: offer })).toBeNull()
      expect(posts).toBe(1)
    },
  )

  it('conserva la copia sin confirmar al salir y volver a la fecha', async () => {
    const render = setup()
    const nextDate = '2026-11-17'
    const remote = note(document('Copia guardada sin respuesta'))
    let posts = 0
    let failReload = true
    server.use(
      mock.get(detail, () => {
        if (!posts) return problemResponse(404)
        return failReload ? problemResponse(500) : HttpResponse.json(remote)
      }),
      mock.get(`${notes}/${nextDate}`, () => problemResponse(404)),
      mock.get(`${notes}/${nextDate}/previous`, () => new HttpResponse(null, { status: 204 })),
      mock.post(`${detail}/copy-previous`, () => {
        posts++
        return HttpResponse.error()
      }),
    )

    const { user, queryClient } = render()
    await user.click(await screen.findByRole('button', { name: offer }))
    expect(await saveStatus().findByText('Sin confirmar')).toBeVisible()
    expect(editor()).toHaveAttribute('contenteditable', 'false')

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: nextDate } })
    await screen.findByText('Todavía no hay una nota anterior en Trabajo')
    expect(editor()).toHaveAttribute('contenteditable', 'true')
    expect(screen.queryByRole('button', { name: 'Recargar nota' })).toBeNull()

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: date } })
    const queryKey = dailyNoteKeys(buildAuthUser().id, 'work').detail(date)
    await waitFor(() =>
      expect(queryClient.getQueryState(queryKey)).toMatchObject({
        fetchStatus: 'idle',
        error: { status: 500 },
      }),
    )
    await waitFor(() => expect(saveStatus().getByText('Sin confirmar')).toBeVisible())
    const reload = screen.getByRole('button', { name: 'Recargar nota' })
    expect(reload).toBeEnabled()
    expect(editor()).toHaveAttribute('contenteditable', 'false')
    expect(await screen.findByRole('button', { name: 'Guardar versión' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: offer })).toBeNull()
    expect(posts).toBe(1)

    failReload = false
    await user.click(reload)
    await waitFor(() => expect(editor()).toHaveTextContent('Copia guardada sin respuesta'))
    expect(saveStatus().getByText('Guardado')).toBeVisible()
    expect(editor()).toHaveAttribute('contenteditable', 'true')
    expect(screen.getByRole('button', { name: 'Guardar versión' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Recargar nota' })).toBeNull()
    expect(screen.queryByText(/Copiada del/)).toBeNull()
    expect(posts).toBe(1)
  })

  it('aísla la recuperación por espacio y acepta un GET concluyente al volver', async () => {
    const render = setup()
    let posts = 0
    let remoteAvailable = false
    server.use(
      mock.get(detail, ({ request }) => {
        if (!posts || new URL(request.url).searchParams.get('space') === 'personal') {
          return problemResponse(404)
        }
        return remoteAvailable
          ? HttpResponse.json(note(document('Copia recuperada en Trabajo')))
          : problemResponse(500)
      }),
      mock.get(`${detail}/previous`, ({ request }) =>
        new URL(request.url).searchParams.get('space') === 'personal'
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json(suggestion),
      ),
      mock.post(`${detail}/copy-previous`, () => {
        posts++
        return HttpResponse.error()
      }),
    )

    const { user } = render()
    await user.click(await screen.findByRole('button', { name: offer }))
    expect(await saveStatus().findByText('Sin confirmar')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    await screen.findByText('Todavía no hay una nota anterior en Personal')
    expect(editor()).toHaveAttribute('contenteditable', 'true')
    expect(screen.queryByRole('button', { name: 'Recargar nota' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Espacio: Personal' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Trabajo' }))
    expect(await screen.findByRole('button', { name: 'Recargar nota' })).toBeVisible()
    expect(editor()).toHaveAttribute('contenteditable', 'false')

    // Volver con GET 200 recupera automáticamente el documento del espacio correcto.
    await user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    await screen.findByText('Todavía no hay una nota anterior en Personal')
    remoteAvailable = true
    await user.click(screen.getByRole('button', { name: 'Espacio: Personal' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Trabajo' }))
    await waitFor(() => expect(editor()).toHaveTextContent('Copia recuperada en Trabajo'))
    expect(editor()).toHaveAttribute('contenteditable', 'true')
    expect(screen.queryByRole('button', { name: 'Recargar nota' })).toBeNull()
    expect(posts).toBe(1)
  })

  it('descarta la recuperación al cerrar sesión, incluso al volver con la misma cuenta', async () => {
    setup()
    const account = buildAuthUser()
    const backend = installAuthBackend({ user: account })
    const route = `/notes/${date}?space=work`
    let posts = 0
    server.use(
      mock.get(detail, () => problemResponse(posts ? 500 : 404)),
      mock.post(`${detail}/copy-previous`, () => {
        posts++
        return HttpResponse.error()
      }),
    )
    const { user, queryClient } = renderWithProviders(
      <>
        <Link to={route}>Abrir fecha de prueba</Link>
        <AppRoutes />
      </>,
      { route },
    )
    await user.click(await screen.findByRole('button', { name: offer }))
    expect(await saveStatus().findByText('Sin confirmar')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Cuenta/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('link', { name: 'Continuar con Google' })).toBeVisible()

    backend.login(account)
    await act(async () => queryClient.refetchQueries({ queryKey: authQueryKeys.session }))
    await screen.findByRole('heading', { name: 'Ya iniciaste sesión' })
    await user.click(screen.getByRole('link', { name: 'Abrir fecha de prueba' }))
    expect(await screen.findByRole('button', { name: 'Guardar versión' })).toBeEnabled()
    expect(editor()).toHaveAttribute('contenteditable', 'true')
    expect(screen.queryByRole('button', { name: 'Recargar nota' })).toBeNull()
    expect(saveStatus().queryByText('Sin confirmar')).toBeNull()
    expect(posts).toBe(1)
  })

  it('ignora el GET del espacio que se dejó atrás', async () => {
    const render = setup()
    const pending = deferred()
    server.use(
      mock.get(`${detail}/previous`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('space') === 'personal') {
          return new HttpResponse(null, { status: 204 })
        }
        await pending.promise
        return HttpResponse.json(suggestion)
      }),
    )
    const { user } = render()
    await screen.findByText('Buscando la nota anterior…')
    await user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    expect(await screen.findByText('Todavía no hay una nota anterior en Personal')).toBeVisible()
    await act(async () => pending.resolve())
    expect(screen.queryByRole('button', { name: offer })).toBeNull()
  })

  it('retiene el espacio hasta terminar el POST y abre Personal sin el contenido copiado', async () => {
    const render = setup()
    const pending = deferred()
    server.use(
      mock.get(`${detail}/previous`, ({ request }) =>
        new URL(request.url).searchParams.get('space') === 'personal'
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json(suggestion),
      ),
      mock.post(`${detail}/copy-previous`, async () => {
        await pending.promise
        return HttpResponse.json(note(document('Copia de Trabajo')))
      }),
    )
    const { user } = render()
    await user.click(await screen.findByRole('button', { name: offer }))
    await screen.findByRole('button', { name: 'Copiando…' })
    await user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    expect(await screen.findByText(/Se está copiando la nota anterior/)).toBeVisible()
    expect(editor()).toHaveAttribute('contenteditable', 'false')
    await act(async () => pending.resolve())
    expect(await screen.findByText('Todavía no hay una nota anterior en Personal')).toBeVisible()
    expect(editor()).toHaveTextContent('')
    expect(screen.queryByText('Copia de Trabajo')).toBeNull()
  })

  it('descarta el ACK pendiente al cerrar sesión', async () => {
    const render = setup()
    const pending = deferred()
    server.use(
      mock.post(`${detail}/copy-previous`, async () => {
        await pending.promise
        return HttpResponse.json(note(document('Texto privado de la sesión cerrada')))
      }),
    )
    const { user } = render()
    await user.click(await screen.findByRole('button', { name: offer }))
    await screen.findByRole('button', { name: 'Copiando…' })
    await user.click(screen.getByRole('button', { name: /Cuenta/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('link', { name: 'Continuar con Google' })).toBeVisible()
    await act(async () => pending.resolve())
    expect(screen.queryByText('Texto privado de la sesión cerrada')).toBeNull()
    expect(screen.queryByText(/Copiada del/)).toBeNull()
  })

  it('ignora un GET pendiente al cambiar de fecha', async () => {
    const render = setup()
    const pending = deferred()
    const nextDate = '2026-11-17'
    server.use(
      mock.get(`${detail}/previous`, async () => {
        await pending.promise
        return HttpResponse.json(suggestion)
      }),
      mock.get(`${notes}/${nextDate}`, () => problemResponse(404)),
      mock.get(`${notes}/${nextDate}/previous`, () => new HttpResponse(null, { status: 204 })),
    )
    render()
    await screen.findByText('Buscando la nota anterior…')
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: nextDate } })
    await screen.findByText('Todavía no hay una nota anterior en Trabajo')
    await act(async () => pending.resolve())
    expect(screen.queryByRole('button', { name: offer })).toBeNull()
  })
})
