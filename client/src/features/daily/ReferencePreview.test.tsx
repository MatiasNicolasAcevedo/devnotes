import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { buildAuthUser } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { installReferenceBackend, referenceItem } from '../../test/msw/referenceBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { AppRoutes } from '../../app/AppRoutes'

const REFERENCE_PATH = '/api/v1/reference-items'

function buildDetailWithReference(refId: string) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    date: '2024-01-15',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Nota con ' },
            { type: 'reference', attrs: { id: refId } },
            { type: 'text', text: ' insertada' },
          ],
        },
      ],
    },
    sourceRevision: 1,
    savedAt: '2024-01-15T10:00:00Z',
  }
}

describe('ReferencePreview — vista previa accesible', () => {
  it('muestra @Título en el historial cuando la referencia está disponible', async () => {
    const auth = installAuthBackend({ user: buildAuthUser() })
    const ref = referenceItem({ id: '01900000-0000-7000-8000-000000000200' })
    installReferenceBackend(auth, [{ owner: auth.state.user!.id, item: ref }])

    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () =>
        HttpResponse.json(buildDetailWithReference(ref.id)),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    // El átomo muestra @Título
    expect(await screen.findByText(`@${ref.title}`)).toBeInTheDocument()
  })

  it('muestra Referencia no disponible cuando la referencia da 404', async () => {
    installAuthBackend({ user: buildAuthUser() })

    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () =>
        HttpResponse.json(buildDetailWithReference('01900000-0000-7000-8000-000000000999')),
      ),
      mock.get(`${REFERENCE_PATH}/01900000-0000-7000-8000-000000000999`, () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Not Found', status: 404 },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    expect(await screen.findByText('Referencia no disponible')).toBeInTheDocument()
  })

  it('átomo de referencia tiene role button y tabIndex para accesibilidad', async () => {
    const auth = installAuthBackend({ user: buildAuthUser() })
    const ref = referenceItem({ id: '01900000-0000-7000-8000-000000000201' })
    installReferenceBackend(auth, [{ owner: auth.state.user!.id, item: ref }])

    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () =>
        HttpResponse.json(buildDetailWithReference(ref.id)),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    await screen.findByText(`@${ref.title}`)
    const atom = document.querySelector('[data-reference-id]')
    expect(atom).toBeInTheDocument()
    expect(atom).toHaveAttribute('role', 'button')
    expect(atom).toHaveAttribute('tabindex', '0')
  })

  it('Enter abre y cierra la vista previa en el historial', async () => {
    const user = userEvent.setup()
    const auth = installAuthBackend({ user: buildAuthUser() })
    const ref = referenceItem({
      id: '01900000-0000-7000-8000-000000000202',
      description: 'Descripción de prueba',
    })
    installReferenceBackend(auth, [{ owner: auth.state.user!.id, item: ref }])

    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () =>
        HttpResponse.json(buildDetailWithReference(ref.id)),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    await screen.findByText(`@${ref.title}`)
    const atom = document.querySelector<HTMLElement>('[data-reference-id]')!
    atom.focus()
    expect(atom).toHaveFocus()

    // Enter abre la vista previa — buscar por el título dentro del popper
    await user.keyboard('{Enter}')
    // El Popper de MUI renderiza en un portal; buscar el título de la referencia
    await waitFor(() => {
      // El popper contiene el título de la referencia como subtitle2
      const titles = screen.getAllByText(ref.title)
      expect(titles.length).toBeGreaterThan(0)
    })

    // La vista previa muestra descripción
    expect(screen.getByText(ref.description)).toBeInTheDocument()

    // Escape cierra
    await user.keyboard('{Escape}')
    await waitFor(() => {
      // Tras cerrar, solo queda el átomo con @Título
      const titles = screen.getAllByText(`@${ref.title}`)
      expect(titles.length).toBe(1)
    })
  })

  it('vista previa muestra (Sin descripción) cuando la descripción está vacía', async () => {
    const user = userEvent.setup()
    const auth = installAuthBackend({ user: buildAuthUser() })
    const ref = referenceItem({
      id: '01900000-0000-7000-8000-000000000203',
      description: '',
    })
    installReferenceBackend(auth, [{ owner: auth.state.user!.id, item: ref }])

    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () =>
        HttpResponse.json(buildDetailWithReference(ref.id)),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    await screen.findByText(`@${ref.title}`)
    const atom = document.querySelector<HTMLElement>('[data-reference-id]')!
    atom.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByText('(Sin descripción)')).toBeInTheDocument()
  })

  it('vista previa muestra botón Reintentar ante error de red', async () => {
    const user = userEvent.setup()
    installAuthBackend({ user: buildAuthUser() })

    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () =>
        HttpResponse.json(buildDetailWithReference('01900000-0000-7000-8000-000000000204')),
      ),
      mock.get(`${REFERENCE_PATH}/01900000-0000-7000-8000-000000000204`, () =>
        HttpResponse.error(),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    expect(await screen.findByText('Referencia no disponible')).toBeInTheDocument()

    const atom = document.querySelector<HTMLElement>('[data-reference-id]')!
    atom.focus()
    await user.keyboard('{Enter}')

    // La vista previa muestra error con reintento
    await waitFor(() => {
      const retryBtn = screen.queryByText('Reintentar')
      expect(retryBtn).toBeInTheDocument()
    })
  })
})
