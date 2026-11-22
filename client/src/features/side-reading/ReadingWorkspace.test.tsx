import { act, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'

const id = '01900000-0000-7000-8000-000000000011'
const stamp = '2026-11-20T12:00:00Z'
const date = '2026-11-20'
const freePath = '/api/spaces/work/free-notes'
const note = { id, title: 'Consulta de Trabajo', revision: 1, createdAt: stamp, updatedAt: stamp }
const version = { date, sourceRevision: 1, savedAt: stamp }
const content = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Versión ficticia' }] }],
}
let resize: (width: number) => void

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: (entries: { contentRect: { width: number } }[]) => void) {
        resize = (width) => act(() => callback([{ contentRect: { width } }]))
      }
      observe() {}
      disconnect() {}
    },
  )
  installAuthBackend({ user: buildAuthUser() })
  server.use(
    http.get(freePath, () => HttpResponse.json({ items: [note], next: null })),
    http.get('/api/v1/daily-versions', () =>
      HttpResponse.json({
        content: [version],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    ),
    http.get(`/api/v1/daily-versions/${date}`, () =>
      HttpResponse.json({ ...version, id, content }),
    ),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('Consulta al lado', () => {
  it('mide el ancho interno, conserva el editor y enfoca el destino correcto', async () => {
    const { user } = renderWithProviders(<AppRoutes />, { route: '/free-notes/new?space=work' })
    const title = await screen.findByRole('textbox', { name: 'Título' })
    const tools = screen.getByRole('button', { name: 'Herramientas' })
    const body = screen.getByRole('textbox', { name: 'Contenido' })
    await user.type(title, 'Borrador sin guardar')
    resize(1099)
    await user.click(tools)
    expect(screen.queryByRole('menuitem', { name: 'Abrir al lado' })).toBeNull()
    await user.keyboard('{Escape}')
    resize(1100)
    const open = async () => {
      await user.click(tools)
      await user.click(screen.getByRole('menuitem', { name: 'Abrir al lado' }))
      return within(screen.getByRole('dialog', { name: 'Elegir una consulta' }))
    }
    await open()
    await user.keyboard('{Escape}')
    expect(tools).toHaveFocus()
    const selector = await open()
    await user.click(await selector.findByRole('button', { name: 'Versión del 20/11/2026' }))
    const heading = screen.getByRole('heading', { name: 'Versión del 20/11/2026' })
    expect(heading).toHaveFocus()
    const panel = within(screen.getByRole('complementary', { name: 'Versión del 20/11/2026' }))
    expect(await panel.findByRole('textbox', { name: 'Versión en consulta' })).toHaveAttribute(
      'contenteditable',
      'false',
    )
    await user.keyboard('{Tab}{Enter}')
    expect(body).toHaveFocus()
    resize(1099)
    expect(screen.queryByRole('complementary', { name: 'Versión del 20/11/2026' })).toBeNull()
    expect(body).toHaveFocus()
    await user.click(tools)
    expect(screen.getByRole('menuitem', { name: 'Ver consulta' })).toHaveAttribute(
      'href',
      `/history/${date}?space=work`,
    )
    await user.click(screen.getByRole('menuitem', { name: 'Ver consulta' }))
    const guard = within(await screen.findByRole('dialog', { name: /Guardar los cambios/ }))
    await user.click(guard.getByRole('button', { name: 'Seguir editando' }))
    resize(1100)
    const restored = within(screen.getByRole('complementary', { name: 'Versión del 20/11/2026' }))
    expect(await restored.findByRole('textbox', { name: 'Versión en consulta' })).toBeVisible()
    await user.click(restored.getByRole('button', { name: 'Cerrar consulta' }))
    expect(tools).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Contenido' })).toBe(body)
    expect(title).toHaveValue('Borrador sin guardar')
  })

  it('ofrece elegir otra fuente después de un 404 y pierde la consulta al cambiar de espacio', async () => {
    server.use(
      http.get(`${freePath}/${id}`, () => problemResponse(404)),
      http.get('/api/spaces/personal/free-notes', () =>
        HttpResponse.json({ items: [], next: null }),
      ),
    )
    const { user } = renderWithProviders(<AppRoutes />, { route: '/free-notes/new?space=work' })
    const tools = await screen.findByRole('button', { name: 'Herramientas' })
    resize(1200)
    await user.click(tools)
    await user.click(screen.getByRole('menuitem', { name: 'Abrir al lado' }))
    await user.click(await screen.findByRole('button', { name: note.title }))
    await user.click(await screen.findByRole('button', { name: 'Elegir otra nota' }))
    expect(await screen.findByRole('dialog', { name: 'Elegir una consulta' })).toBeVisible()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    expect(await screen.findByRole('button', { name: 'Espacio: Personal' })).toBeVisible()
    expect(screen.queryByRole('complementary', { name: note.title })).toBeNull()
  })
})
