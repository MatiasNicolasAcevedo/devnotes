import { screen, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { buildAuthUser } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { AppRoutes } from '../../app/AppRoutes'

const LIST_PATH = '/api/v1/daily-versions'

function buildPage(overrides = {}) {
  return {
    content: [
      { date: '2024-01-15', savedAt: '2024-01-15T10:00:00Z', sourceRevision: 3 },
      { date: '2024-01-10', savedAt: '2024-01-10T08:30:00Z', sourceRevision: 1 },
    ],
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
    ...overrides,
  }
}

function buildDetail(overrides = {}) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    date: '2024-01-15',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Versión de prueba' }],
        },
      ],
    },
    sourceRevision: 3,
    savedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  }
}

describe('DailyHistoryPage — sin sesión', () => {
  it('muestra login required sin consultar la API privada', async () => {
    installAuthBackend()
    const listHandler = vi.fn()
    server.use(mock.get(LIST_PATH, listHandler))

    renderWithProviders(<AppRoutes />, { route: '/history' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Inicia sesión')
    expect(listHandler).not.toHaveBeenCalled()
  })

  it('detalle sin sesión tampoco consulta', async () => {
    installAuthBackend()
    const detailHandler = vi.fn()
    server.use(mock.get('/api/v1/daily-versions/2024-01-15', detailHandler))

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Inicia sesión')
    expect(detailHandler).not.toHaveBeenCalled()
  })
})

describe('DailyHistoryPage — lista paginada', () => {
  it('muestra historial vacío cuando no hay versiones', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get(LIST_PATH, () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/history' })

    expect(await screen.findByText(/Aún no tenés versiones guardadas/)).toBeInTheDocument()
  })

  it('muestra listado con versiones y fechas formateadas dd/MM/yyyy', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(LIST_PATH, () => HttpResponse.json(buildPage())))

    renderWithProviders(<AppRoutes />, { route: '/history' })

    expect(await screen.findByText('15/01/2024')).toBeInTheDocument()
    expect(screen.getByText('10/01/2024')).toBeInTheDocument()
  })

  it('cada item de la lista enlaza al detalle', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(LIST_PATH, () => HttpResponse.json(buildPage())))

    renderWithProviders(<AppRoutes />, { route: '/history' })

    await screen.findByText('15/01/2024')
    const links = screen.getAllByRole('link', { name: /15\/01\/2024/ })
    expect(links.length).toBeGreaterThan(0)
  })

  it('muestra error y reintento cuando la API falla', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(LIST_PATH, () => HttpResponse.error()))

    renderWithProviders(<AppRoutes />, { route: '/history' })

    await screen.findByRole('alert')
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })

  it('reintentar recarga la lista', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(LIST_PATH, () => HttpResponse.error()))

    const { user } = renderWithProviders(<AppRoutes />, { route: '/history' })

    await screen.findByRole('alert')

    server.use(mock.get(LIST_PATH, () => HttpResponse.json(buildPage())))
    await user.click(screen.getByText('Reintentar'))

    expect(await screen.findByText('15/01/2024')).toBeInTheDocument()
  })
})

describe('DailyHistoryPage — detalle readonly', () => {
  it('muestra versión con editor readonly y metadatos', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () => HttpResponse.json(buildDetail())),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    expect(await screen.findByText('Versión del 15/01/2024')).toBeInTheDocument()
    expect(screen.getByText(/Revisión: 3/)).toBeInTheDocument()
    expect(screen.getByText('Volver al historial')).toBeInTheDocument()
    expect(screen.getByText(/Volver a mi nota del 15\/01\/2024/)).toBeInTheDocument()
  })

  it('muestra 404 cuando no hay versión guardada', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get('/api/v1/daily-versions/2024-01-20', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Not Found', status: 404 },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-20' })

    await screen.findByRole('alert')
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })

  it('editor readonly no envía mutaciones', async () => {
    const saveHandler = vi.fn()
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () => HttpResponse.json(buildDetail())),
      mock.put('/api/v1/daily-notes/2024-01-15', saveHandler),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    // Esperar a que el contenido cargue (el editor renderiza el texto)
    expect(await screen.findByText('Versión de prueba')).toBeInTheDocument()
    expect(saveHandler).not.toHaveBeenCalled()
  })

  it('contiene links y separadores con el mismo renderer', async () => {
    const detailWithLinks = buildDetail({
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Enlace de prueba',
                marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
              },
            ],
          },
          { type: 'separator', attrs: { width: 50 } },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Después del separador' }],
          },
        ],
      },
    })
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get('/api/v1/daily-versions/2024-01-15', () => HttpResponse.json(detailWithLinks)),
    )

    renderWithProviders(<AppRoutes />, { route: '/history/2024-01-15' })

    expect(await screen.findByText('Enlace de prueba')).toBeInTheDocument()
    expect(screen.getByText('Después del separador')).toBeInTheDocument()
  })
})

describe('DailyHistoryPage — paginación', () => {
  it('navega entre páginas con botones Anterior/Siguiente', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get(LIST_PATH, () =>
        HttpResponse.json({
          ...buildPage(),
          page: 0,
          totalPages: 2,
          totalElements: 35,
        }),
      ),
    )

    const { user } = renderWithProviders(<AppRoutes />, { route: '/history' })

    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument()
    expect(screen.getByText('Siguiente')).toBeInTheDocument()

    server.use(
      mock.get(`${LIST_PATH}?page=1`, () =>
        HttpResponse.json({
          content: [{ date: '2024-01-01', savedAt: '2024-01-01T12:00:00Z', sourceRevision: 1 }],
          page: 1,
          size: 20,
          totalElements: 35,
          totalPages: 2,
        }),
      ),
    )

    await user.click(screen.getByText('Siguiente'))

    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
    expect(screen.getByText('01/01/2024')).toBeInTheDocument()
    expect(screen.getByText('Anterior')).toBeInTheDocument()
  })
})

describe('DailyHistoryPage — navegación', () => {
  it('el shell tiene enlace Historial', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(LIST_PATH, () => HttpResponse.json(buildPage())))

    renderWithProviders(<AppRoutes />, { route: '/history' })

    await screen.findByText('15/01/2024')
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(nav).getByRole('link', { name: 'Historial' })).toHaveAttribute('href', '/history')
  })

  it('la home ofrece enlace al Historial', async () => {
    installAuthBackend({ user: buildAuthUser() })
    renderWithProviders(<AppRoutes />)

    expect(await screen.findByRole('link', { name: 'Ir al Historial' })).toHaveAttribute(
      'href',
      '/history',
    )
  })
})
