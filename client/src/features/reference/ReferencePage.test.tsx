import { act, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http as mock } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser, problemResponse, validationProblemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { installReferenceBackend, referenceItem } from '../../test/msw/referenceBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { REFERENCE_PATH } from './api'

const person = buildAuthUser()
function setup(initial: ReturnType<typeof referenceItem>[] = []) {
  const auth = installAuthBackend({ user: person })
  const backend = installReferenceBackend(
    auth,
    initial.map((item) => ({ owner: person.id, item })),
  )
  return { backend, ...renderWithProviders(<AppRoutes />, { route: '/reference' }) }
}

describe('ReferencePage', () => {
  it('visitor has an explicit login invitation and no private requests', async () => {
    installAuthBackend()
    let calls = 0
    server.use(
      mock.get(REFERENCE_PATH, () => {
        calls++
        return problemResponse(401)
      }),
    )
    renderWithProviders(<AppRoutes />, { route: '/reference' })
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(calls).toBe(0)
  })
  it('creates with real providers, validation, plain text and restored focus', async () => {
    const { user, backend } = setup()
    expect(await screen.findByText('No tenés elementos en esta página.')).toBeVisible()
    const create = screen.getByRole('button', { name: 'Crear elemento' })
    await waitFor(() => expect(create).toBeEnabled())
    await user.click(create)
    const dialog = screen.getByRole('form', { name: 'Crear elemento' })
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    const title = within(dialog).getByRole('textbox', { name: /Título/ })
    expect(title).toHaveAccessibleDescription('Ingresá un título.')
    expect(title).toHaveFocus()
    expect(backend.calls.save).toBe(0)
    await user.type(title, '  Elemento A ')
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Descripción' }),
      '<b>Texto plano</b>',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('heading', { name: 'Elemento A' })).toBeVisible()
    expect(screen.getByText('<b>Texto plano</b>')).toBeVisible()
    await waitFor(() => expect(create).toHaveFocus())
    expect(backend.rows.size).toBe(1)
  })
  it('edits and confirms deletion with keyboard, cancellation and restored focus', async () => {
    const { user, backend } = setup([
      referenceItem({ title: 'Elemento A', description: '<b>Texto plano</b>' }),
    ])
    await screen.findByRole('heading', { name: 'Elemento A' })
    const create = screen.getByRole('button', { name: 'Crear elemento' })
    await user.click(screen.getByRole('button', { name: 'Editar Elemento A' }))
    const edit = await screen.findByRole('textbox', { name: /Título/ })
    await user.clear(edit)
    await user.type(edit, 'Elemento editado')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('heading', { name: 'Elemento editado' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Eliminar Elemento editado' }))
    await user.click(screen.getByRole('button', { name: 'Volver al listado' }))
    expect(backend.calls.remove).toBe(0)
    await user.click(await screen.findByRole('button', { name: 'Eliminar Elemento editado' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar eliminación' })
    confirm.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Elemento eliminado.')).toBeVisible()
    expect(screen.getByText('No tenés elementos en esta página.')).toBeVisible()
    expect(backend.rows.size).toBe(0)
    await waitFor(() => expect(create).toHaveFocus())
  })
  it('paginates and adjusts to a valid page after deleting its final item', async () => {
    const initial = Array.from({ length: 21 }, (_, index) =>
      referenceItem({
        id: `01900000-0000-7000-8000-${String(index + 1).padStart(12, '0')}`,
        title: `Elemento ${index}`,
      }),
    )
    const { user } = setup(initial)
    await screen.findByRole('heading', { name: 'Elemento 20' })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByRole('heading', { name: 'Elemento 0' })
    await user.click(screen.getByRole('button', { name: 'Eliminar Elemento 0' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    expect(await screen.findByRole('heading', { name: 'Elemento 20' })).toBeVisible()
    expect(screen.getByText('Página 1 de 1 · 20 elementos')).toBeVisible()
  })
  it('shows loading, a network error and an explicit successful retry', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { user } = setup()
    server.use(
      mock.get(
        REFERENCE_PATH,
        async () => {
          await gate
          return HttpResponse.error()
        },
        { once: true },
      ),
    )
    expect(await screen.findByText('Cargando elementos…')).toBeVisible()
    await act(async () => {
      release()
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No tenés elementos en esta página.')).toBeVisible()
  })
  it('keeps real server field errors focused and requires explicit retry after a CSRF rejection', async () => {
    const { user, backend } = setup()
    await screen.findByText('No tenés elementos en esta página.')
    await user.click(screen.getByRole('button', { name: 'Crear elemento' }))
    const title = screen.getByRole('textbox', { name: /Título/ })
    await user.type(title, 'Título')
    server.use(
      mock.post(
        REFERENCE_PATH,
        () => validationProblemResponse([{ field: 'title', message: 'Título rechazado.' }]),
        { once: true },
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Título rechazado.')).toBeVisible()
    expect(title).toHaveFocus()
    server.use(mock.post(REFERENCE_PATH, () => problemResponse(403), { once: true }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(
      await screen.findByText('La operación fue rechazada y no se aplicó. Volvé a intentarla.'),
    ).toBeVisible()
    expect(backend.calls.save).toBe(0)
    expect(screen.getByRole('button', { name: /^Cuenta de / })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Elemento guardado.')).toBeVisible()
  })
  it('handles a retired resource without claiming success and refreshes on return', async () => {
    const item = referenceItem()
    const { user, backend } = setup([item])
    await screen.findByRole('heading', { name: item.title })
    backend.rows.clear()
    await user.click(screen.getByRole('button', { name: `Editar ${item.title}` }))
    expect(await screen.findByText('El elemento ya no está disponible.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Volver al listado' }))
    expect(await screen.findByText('No tenés elementos en esta página.')).toBeVisible()
    expect(screen.queryByText('Elemento guardado.')).not.toBeInTheDocument()
  })

  it('shows copy buttons for title and description with accessible labels', async () => {
    setup([referenceItem({ title: 'Elemento A', description: 'Descripción de prueba' })])
    await screen.findByRole('heading', { name: 'Elemento A' })
    const copyTitle = screen.getByRole('button', { name: 'Copiar título Elemento A' })
    expect(copyTitle).toBeVisible()
    const copyDesc = screen.getByRole('button', { name: 'Copiar descripción Elemento A' })
    expect(copyDesc).toBeVisible()
  })

  it('copies exact title text including Unicode and spaces', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { user } = setup([referenceItem({ title: 'Título 🌍', description: 'desc' })])
    await screen.findByRole('heading', { name: 'Título 🌍' })
    await user.click(screen.getByRole('button', { name: 'Copiar título Título 🌍' }))
    expect(writeText).toHaveBeenCalledWith('Título 🌍')
    await waitFor(() => expect(screen.getByText('Copiado')).toBeVisible())
    writeText.mockRestore()
  })

  it('copies exact description text and hides button when description is empty', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { user } = setup([
      referenceItem({
        id: '01900000-0000-7000-8000-000000000201',
        title: 'SinDesc',
        description: '',
      }),
      referenceItem({
        id: '01900000-0000-7000-8000-000000000202',
        title: 'ConDesc',
        description: 'texto con saltos',
      }),
    ])
    await screen.findByRole('heading', { name: 'SinDesc' })
    // Sin descripción: no hay botón de copiar descripción
    expect(
      screen.queryByRole('button', { name: 'Copiar descripción SinDesc' }),
    ).not.toBeInTheDocument()
    // Con descripción: botón presente y copia texto exacto
    await user.click(screen.getByRole('button', { name: 'Copiar descripción ConDesc' }))
    expect(writeText).toHaveBeenCalledWith('texto con saltos')
    writeText.mockRestore()
  })

  it('supports keyboard navigation on copy buttons', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { user } = setup([referenceItem({ title: 'Item' })])
    await screen.findByRole('heading', { name: 'Item' })
    const copyButton = screen.getByRole('button', { name: 'Copiar título Item' })
    copyButton.focus()
    expect(copyButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(writeText).toHaveBeenCalledWith('Item')
    writeText.mockRestore()
  })
})
