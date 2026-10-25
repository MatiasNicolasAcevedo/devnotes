import { screen, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { buildAuthUser } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { AppRoutes } from '../../app/AppRoutes'
import { todayLocal } from './dateUtils'
import { emptyDocument } from './editor/dailyDocument'

const DETAIL = '/api/v1/daily-notes/2024-06-15'
const LIST = '/api/v1/daily-notes'

function emptyList() {
  return { content: [], page: 0, size: 20, totalElements: 0, totalPages: 1 }
}

function buildDetail(date: string, revision: number) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    date,
    content: emptyDocument(),
    revision,
    updatedAt: `${date}T10:00:00Z`,
  }
}

describe('DailyNotesPage', () => {
  it('la ruta /notes muestra la página de notas', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const today = todayLocal()
    server.use(
      mock.get(DETAIL.replace('2024-06-15', today), () => HttpResponse.json(buildDetail(today, 0))),
      mock.get(LIST, () => HttpResponse.json(emptyList())),
    )

    renderWithProviders(<AppRoutes />, { route: '/notes' })

    expect(await screen.findByRole('heading', { name: 'Notas diarias' })).toBeVisible()
    // El enlace Notas en el nav lleva a /notes
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(nav).getByRole('link', { name: 'Notas' })).toHaveAttribute('href', '/notes')
  })

  it('la ruta /notes/:date muestra la página con la fecha seleccionada', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get(DETAIL, () => HttpResponse.json(buildDetail('2024-06-15', 1))),
      mock.get(LIST, () => HttpResponse.json(emptyList())),
    )

    renderWithProviders(<AppRoutes />, { route: '/notes/2024-06-15' })

    expect(await screen.findByRole('heading', { name: 'Notas diarias' })).toBeVisible()
    const dateInput = screen.getByLabelText('Fecha')
    expect(dateInput).toHaveValue('2024-06-15')
  })

  it('una fecha inválida en la ruta muestra error sin petición', async () => {
    installAuthBackend({ user: buildAuthUser() })
    let called = false
    server.use(
      mock.get(DETAIL, () => {
        called = true
        return HttpResponse.json(buildDetail('2024-06-15', 1))
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/notes/2024-13-01' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Fecha inválida')
    expect(alert).toHaveTextContent('2024-13-01')
    expect(called).toBe(false)
  })

  it('sin sesión muestra aviso de login', async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />, { route: '/notes' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Inicia sesión')
  })

  it('el selector de fecha muestra la fecha activa', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get(DETAIL, () => HttpResponse.json(buildDetail('2024-06-15', 1))),
      mock.get(LIST, () => HttpResponse.json(emptyList())),
    )

    renderWithProviders(<AppRoutes />, { route: '/notes/2024-06-15' })

    expect(await screen.findByRole('heading', { name: 'Notas diarias' })).toBeVisible()
    const dateInput = screen.getByLabelText('Fecha')
    expect(dateInput).toHaveAttribute('type', 'date')
    expect(dateInput).toHaveValue('2024-06-15')
  })

  it('el enlace "Hoy" navega a /notes', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get(DETAIL, () => HttpResponse.json(buildDetail('2024-06-15', 1))),
      mock.get(LIST, () => HttpResponse.json(emptyList())),
    )

    renderWithProviders(<AppRoutes />, { route: '/notes/2024-06-15' })

    expect(await screen.findByRole('heading', { name: 'Notas diarias' })).toBeVisible()
    const hoyLink = screen.getByRole('link', { name: 'Hoy' })
    expect(hoyLink).toHaveAttribute('href', '/notes')
  })

  it('muestra el editor de notas', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get(DETAIL, () => HttpResponse.json(buildDetail('2024-06-15', 1))),
      mock.get(LIST, () => HttpResponse.json(emptyList())),
    )

    renderWithProviders(<AppRoutes />, { route: '/notes/2024-06-15' })

    expect(await screen.findByRole('heading', { name: 'Notas diarias' })).toBeVisible()
    // El editor tiene un label accesible
    expect(screen.getByLabelText('Editor de nota diaria')).toBeInTheDocument()
  })

  it('la home ofrece enlace a Notas', async () => {
    installAuthBackend({ user: buildAuthUser() })
    renderWithProviders(<AppRoutes />)

    expect(await screen.findByRole('link', { name: 'Ir a Notas' })).toHaveAttribute(
      'href',
      '/notes',
    )
  })
})

describe('todayLocal', () => {
  it('usa componentes locales, no UTC', () => {
    // todayLocal usa getFullYear/getMonth/getDate que son locales
    const d = new Date()
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(todayLocal()).toBe(expected)
  })
})

describe('DailyNotesPage notes list', () => {
  it('carga la lista "Notas guardadas" al montar la página', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const today = todayLocal()
    const detailPath = `/api/v1/daily-notes/${today}`
    const listPath = '/api/v1/daily-notes'

    server.use(
      mock.get(detailPath, () => HttpResponse.json(buildDetail(today, 0))),
      mock.get(listPath, () =>
        HttpResponse.json({
          content: [
            { date: '2024-06-15', updatedAt: '2024-06-15T10:00:00Z', revision: 1 },
            { date: '2024-06-14', updatedAt: '2024-06-14T09:00:00Z', revision: 0 },
          ],
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/notes' })

    // El heading de la sección de lista debe aparecer
    expect(await screen.findByRole('heading', { name: 'Notas guardadas' })).toBeVisible()
    // Las notas de la lista deben renderizarse, no el mensaje vacío
    expect(await screen.findByText('2024-06-15')).toBeVisible()
    expect(screen.getByText('2024-06-14')).toBeVisible()
    // El mensaje "Aún no tenés notas guardadas" NO debe aparecer
    expect(screen.queryByText('Aún no tenés notas guardadas')).not.toBeInTheDocument()
  })
})
