import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { freeNoteInput } from './api'

const work = '/api/spaces/work/free-notes'
const personal = '/api/spaces/personal/free-notes'
const id = '01900000-0000-7000-8000-000000000001'
const stamp = '2026-11-22T03:30:36Z'
const document = { type: 'doc', content: [{ type: 'paragraph' }] }
const note = { id, title: 'Original', document, revision: 1, createdAt: stamp, updatedAt: stamp }
const dialog = () => within(screen.getByRole('dialog', { name: /Guardar los cambios/ }))

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

  it('conserva el título al recibir 409 y pide confirmación antes de abrir la revisión reciente', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const writes: unknown[] = []
    let current = note
    server.use(
      http.get(`${work}/${id}`, () => HttpResponse.json(current)),
      http.put(`${work}/${id}`, async ({ request }) => {
        writes.push(await request.json())
        current = { ...note, title: 'Edición remota', revision: 2 }
        return problemResponse(409)
      }),
    )
    const { user } = renderWithProviders(<AppRoutes />, { route: `/free-notes/${id}?space=work` })
    const title = await screen.findByRole('textbox', { name: 'Título' })
    await user.clear(title)
    await user.type(title, 'Edición local')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('La nota cambió en otra sesión.')).toBeVisible()
    expect(title).toHaveValue('Edición local')
    expect(writes).toEqual([{ title: 'Edición local', expectedRevision: 1, document }])
    await user.click(screen.getByRole('button', { name: 'Abrir versión reciente' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Descartar y abrir' }))
    expect(await screen.findByDisplayValue('Edición remota')).toBeVisible()
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
