import { act, fireEvent, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { freeNoteInput, type FreeNote, type FreeNoteDocument } from './api'

const work = '/api/spaces/work/free-notes'
const personal = '/api/spaces/personal/free-notes'
const id = '01900000-0000-7000-8000-000000000001'
const stamp = '2026-11-22T03:30:36Z'
const document = { type: 'doc', content: [{ type: 'paragraph' }] }
const note = { id, title: 'Original', document, revision: 1, createdAt: stamp, updatedAt: stamp }
const dialog = () => within(screen.getByRole('dialog', { name: /Guardar los cambios/ }))
const textDocument = (text: string): FreeNoteDocument => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})
const replaceBody = (body: HTMLElement, text: string) => {
  body.focus()
  fireEvent.keyDown(body, { key: 'a', ctrlKey: true })
  fireEvent.paste(body, { clipboardData: { types: ['text/plain'], getData: () => text } })
}

// TipTap scrolls the selection into view after paste. jsdom does not lay out ranges.
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

describe('Libres', () => {
  it('guarda el borrador de Trabajo antes de cambiar a Personal y conserva el ámbito de la mutación', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const writes: unknown[] = []
    server.use(
      http.post(work, async ({ request }) => {
        writes.push(await request.json())
        return HttpResponse.json({ ...note, title: 'Borrador de Trabajo' }, { status: 201 })
      }),
      http.get(personal, () => HttpResponse.json({ items: [], next: null })),
    )
    const { user } = renderWithProviders(<AppRoutes />, { route: '/free-notes/new?space=work' })
    await user.type(await screen.findByRole('textbox', { name: 'Título' }), 'Borrador de Trabajo')

    const switchSpace = async () => {
      await user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
      await user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    }
    await switchSpace()
    await user.click(dialog().getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('Borrador de Trabajo')
    expect(writes).toEqual([])
    await switchSpace()
    await user.click(dialog().getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Todavía no hay notas libres')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Espacio: Personal' })).toBeVisible()
    expect(writes).toEqual([
      { attemptId: expect.any(String), title: 'Borrador de Trabajo', document },
    ])
  })

  it('abre la nota recién creada al guardar desde el editor y conserva la fecha de retorno', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      http.post(work, () => HttpResponse.json(note, { status: 201 })),
      http.get(`${work}/${id}`, () => HttpResponse.json(note)),
    )
    const { user } = renderWithProviders(<AppRoutes />, {
      route: '/free-notes/new?space=work&from=2025-06-17',
    })
    await user.type(await screen.findByRole('textbox', { name: 'Título' }), 'Original')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('heading', { name: 'Editar nota' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Libres' })).toHaveAttribute(
      'href',
      '/free-notes?from=2025-06-17&space=work',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reabre el título y el cuerpo guardados y usa la revisión confirmada en el segundo guardado', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const writes: unknown[] = []
    let current: FreeNote = { ...note, document: textDocument('Cuerpo original') }
    let holdNextRead = false
    let markReadStarted = () => {}
    let releaseRead = () => {}
    const readStarted = new Promise<void>((resolve) => {
      markReadStarted = resolve
    })
    const release = new Promise<void>((resolve) => {
      releaseRead = resolve
    })
    server.use(
      http.get(work, () => HttpResponse.json({ items: [current], next: null })),
      http.get(`${work}/${id}`, async () => {
        const snapshot = current
        if (holdNextRead) {
          holdNextRead = false
          markReadStarted()
          await release
        }
        return HttpResponse.json(snapshot)
      }),
      http.put(`${work}/${id}`, async ({ request }) => {
        const body = await request.json()
        writes.push(body)
        if (
          !body ||
          typeof body !== 'object' ||
          !('expectedRevision' in body) ||
          body.expectedRevision !== current.revision
        )
          return problemResponse(409)
        current = { ...current, ...freeNoteInput.parse(body), revision: current.revision + 1 }
        return HttpResponse.json(current)
      }),
    )
    const { user, queryClient } = renderWithProviders(<AppRoutes />, {
      route: `/free-notes/${id}?space=work`,
    })
    const title = () => screen.findByRole('textbox', { name: 'Título' })
    const body = () => screen.findByRole('textbox', { name: 'Contenido' })
    const edit = async (name: string, content: string) => {
      const field = await title()
      await user.clear(field)
      await user.type(field, name)
      replaceBody(await body(), content)
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(await screen.findByText('Guardada')).toBeVisible()
    }

    await body()
    holdNextRead = true
    const backgroundRead = queryClient.refetchQueries({ queryKey: ['free-notes'] })
    await readStarted
    try {
      await edit('Renombrada', 'Cuerpo guardado')
    } finally {
      releaseRead()
      await act(async () => backgroundRead)
    }
    expect(current).toMatchObject({
      title: 'Renombrada',
      document: textDocument('Cuerpo guardado'),
      revision: 2,
    })
    await user.click(screen.getByRole('link', { name: 'Libres' }))
    await user.click(await screen.findByRole('link', { name: /Renombrada/ }))

    expect(await title()).toHaveValue('Renombrada')
    expect(await body()).toHaveTextContent('Cuerpo guardado')
    await edit('Segunda edición', 'Segundo cuerpo')
    expect(writes).toEqual([
      { title: 'Renombrada', expectedRevision: 1, document: textDocument('Cuerpo guardado') },
      { title: 'Segunda edición', expectedRevision: 2, document: textDocument('Segundo cuerpo') },
    ])
    expect(current).toMatchObject({
      title: 'Segunda edición',
      document: textDocument('Segundo cuerpo'),
      revision: 3,
    })
  })

  it('conserva el borrador ante refetch y 409 y pide confirmación antes de abrir la revisión reciente', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const writes: unknown[] = []
    let current: FreeNote = { ...note, document: textDocument('Cuerpo original') }
    server.use(
      http.get(`${work}/${id}`, () => HttpResponse.json(current)),
      http.put(`${work}/${id}`, async ({ request }) => {
        writes.push(await request.json())
        return problemResponse(409)
      }),
    )
    const { user, queryClient } = renderWithProviders(<AppRoutes />, {
      route: `/free-notes/${id}?space=work`,
    })
    const title = await screen.findByRole('textbox', { name: 'Título' })
    const body = await screen.findByRole('textbox', { name: 'Contenido' })
    await user.clear(title)
    await user.type(title, 'Edición local')
    replaceBody(body, 'Cuerpo local')
    current = {
      ...current,
      title: 'Edición remota',
      document: textDocument('Cuerpo remoto'),
      revision: 2,
    }
    await act(async () => queryClient.refetchQueries({ queryKey: ['free-notes'] }))
    expect(title).toHaveValue('Edición local')
    expect(body).toHaveTextContent('Cuerpo local')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('La nota cambió en otra sesión.')).toBeVisible()
    expect(title).toHaveValue('Edición local')
    expect(body).toHaveTextContent('Cuerpo local')
    expect(writes).toEqual([
      { title: 'Edición local', expectedRevision: 1, document: textDocument('Cuerpo local') },
    ])
    await user.click(screen.getByRole('button', { name: 'Abrir versión reciente' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Descartar y abrir' }))
    expect(await screen.findByDisplayValue('Edición remota')).toBeVisible()
    expect(body).toHaveTextContent('Cuerpo remoto')
  })

  it('protege el borrador al cerrar sesión y limpia el caché privado al descartar', async () => {
    const auth = installAuthBackend({ user: buildAuthUser() })
    server.use(http.get(`${work}/${id}`, () => HttpResponse.json(note)))
    const { user, queryClient } = renderWithProviders(<AppRoutes />, {
      route: `/free-notes/${id}?space=work`,
    })
    const title = await screen.findByRole('textbox', { name: 'Título' })
    await user.type(title, ' modificado')
    await user.click(screen.getByRole('button', { name: /^Cuenta de / }))
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    await user.click(dialog().getByRole('button', { name: 'Seguir editando' }))
    expect(auth.calls.logout).toBe(0)
    expect(title).toHaveValue('Original modificado')
    await user.click(screen.getByRole('button', { name: /^Cuenta de / }))
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    await user.click(dialog().getByRole('button', { name: 'Descartar' }))
    expect(await screen.findByRole('link', { name: 'Continuar con Google' })).toBeVisible()
    expect(auth.calls.logout).toBe(1)
    expect(queryClient.getQueriesData({ queryKey: ['free-notes'] })).toEqual([])
  })

  it('valida los límites y admite los párrafos vacíos existentes', () => {
    const parse = (title: string, text: string) =>
      freeNoteInput.safeParse({
        title,
        document: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
        },
      })
    expect(freeNoteInput.safeParse({ title: '  🧪 ', document }).data?.title).toBe('🧪')
    expect(parse('🧪'.repeat(160), '🧪'.repeat(60_000)).success).toBe(true)
    expect(parse('🧪'.repeat(161), 'texto').success).toBe(false)
    expect(parse('Título', '🧪'.repeat(60_001)).success).toBe(false)
    expect(parse('Título', '\u0000').success).toBe(false)
    expect(parse('Título', '\ud800').success).toBe(false)
    expect(
      freeNoteInput.safeParse({
        title: 'Título',
        document: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [] }],
        },
      }).success,
    ).toBe(true)
  })
})
