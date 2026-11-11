import projectIdentity from '../project-identity.json'
import { screen, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { todayLocal } from '../features/daily/dateUtils'
import { emptyDocument } from '../features/daily/editor/dailyDocument'
import { buildAuthUser, problemResponse } from '../test/factories'
import { installAuthBackend } from '../test/msw/authBackend'
import { server } from '../test/msw/server'
import { renderWithProviders } from '../test/render'
import { NARROW_VIEWPORT, setViewportWidth } from '../test/viewport'
import { AppRoutes } from './AppRoutes'

const nav = () => screen.getByRole('navigation', { name: 'Navegación principal' })
const TABS = [
  ['Voz', '/voice'],
  ['Notas', '/notes'],
  ['Referencia', '/reference'],
  ['Historial', '/history'],
  ['Datos', '/data'],
]

/** Las pantallas privadas consultan su API aunque las visite alguien sin sesión: el server responde 401. */
function installVisitorApis() {
  server.use(
    mock.get('/api/v1/voice/capabilities', () => problemResponse(401)),
    mock.get('/api/v1/voice-notes', () => problemResponse(401)),
  )
}

function installTodayNote() {
  const today = todayLocal()
  server.use(
    mock.get(`/api/v1/daily-notes/${today}`, () =>
      HttpResponse.json({
        id: '01900000-0000-7000-8000-000000000001',
        date: today,
        content: emptyDocument(),
        revision: 0,
        updatedAt: `${today}T10:00:00Z`,
      }),
    ),
    mock.get('/api/v1/daily-notes', () =>
      HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 1 }),
    ),
  )
}

describe('AppRoutes', () => {
  it('la ruta índice lleva a /notes: un visitante ve el aviso de Notas y «Ingresar», sin pantalla de inicio', async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />)

    expect(await screen.findByText('Inicia sesión para acceder a tus notas.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
    expect(within(nav()).getByRole('link', { name: 'Notas' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.queryByRole('heading', { name: /Bienvenido/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/versión/)).not.toBeInTheDocument()
  })

  it('con sesión, la ruta índice abre la nota de hoy', async () => {
    installAuthBackend({ user: buildAuthUser() })
    installTodayNote()
    renderWithProviders(<AppRoutes />)

    expect(await screen.findByLabelText('Editor de nota diaria')).toBeVisible()
    expect(screen.getByLabelText('Fecha')).toHaveValue(todayLocal())
  })

  it(`el nombre ${projectIdentity.name} de la barra enlaza a /notes`, async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />, { route: '/login' })

    expect(await screen.findByRole('link', { name: `${projectIdentity.name}` })).toHaveAttribute(
      'href',
      '/notes',
    )
  })

  it('la barra ordena Voz, Notas, Referencia, Historial y Datos, sin «Inicio»', () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />, { route: '/login' })

    const links = within(nav()).getAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual(TABS)
    expect(screen.queryByRole('link', { name: 'Inicio' })).not.toBeInTheDocument()
    // En /login ninguna pestaña está activa.
    for (const link of links) expect(link).not.toHaveAttribute('aria-current')
  })

  it.each([
    ['/notes', 'Notas'],
    ['/notes/2024-06-15', 'Notas'],
    ['/history', 'Historial'],
    ['/history/2024-06-15', 'Historial'],
    ['/voice', 'Voz'],
    ['/reference', 'Referencia'],
    ['/data', 'Datos'],
  ])('en %s solo la pestaña «%s» lleva aria-current', async (route, active) => {
    installAuthBackend()
    installVisitorApis()
    renderWithProviders(<AppRoutes />, { route })

    const current = within(nav())
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual([active])
    await screen.findByRole('link', { name: 'Ingresar' })
  })

  it('en angosto las pestañas son iconos con nombre accesible y se oculta el nombre de la aplicación', () => {
    setViewportWidth(NARROW_VIEWPORT)
    installAuthBackend()
    renderWithProviders(<AppRoutes />, { route: '/login' })

    const links = within(nav()).getAllByRole('link')
    expect(
      links.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')]),
    ).toEqual(TABS)
    for (const link of links) {
      expect(link).toHaveTextContent('')
      expect(link.querySelector('svg')).not.toBeNull()
    }
    expect(screen.queryByRole('link', { name: `${projectIdentity.name}` })).not.toBeInTheDocument()
  })

  it('en angosto la pestaña activa conserva aria-current y muestra su nombre al pasar el puntero', async () => {
    setViewportWidth(NARROW_VIEWPORT)
    installAuthBackend()
    const { user } = renderWithProviders(<AppRoutes />, { route: '/notes/2024-06-15' })

    const notes = within(nav()).getByRole('link', { name: 'Notas' })
    expect(notes).toHaveAttribute('aria-current', 'page')
    await user.hover(notes)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Notas')
  })

  it('una ruta desconocida muestra la página no encontrada con vuelta a Notas', async () => {
    installAuthBackend()
    const { user } = renderWithProviders(<AppRoutes />, { route: '/no-existe' })

    expect(await screen.findByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Volver al inicio' }))

    expect(await screen.findByText('Inicia sesión para acceder a tus notas.')).toBeVisible()
  })
})

describe('Estado del servidor en la barra', () => {
  it('muestra «Online» junto a las pestañas en cualquier pantalla', async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />, { route: '/login' })

    const status = await within(screen.getByRole('banner')).findByRole('status', {
      name: 'Servidor conectado',
    })
    expect(status).toHaveTextContent('Online')
  })
})

describe('Página /voice', () => {
  it('muestra la pantalla de notas de voz con el enlace en la barra', async () => {
    installAuthBackend()
    installVisitorApis()
    renderWithProviders(<AppRoutes />, { route: '/voice' })

    expect(await screen.findByRole('heading', { name: 'Notas de voz' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Voz' })).toHaveAttribute('href', '/voice')
  })
})

describe('Página /data', () => {
  it('el enlace «Datos» de la barra lleva a la pantalla de exportar e importar', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const { user } = renderWithProviders(<AppRoutes />, { route: '/login' })

    const link = within(nav()).getByRole('link', { name: 'Datos' })
    expect(link).toHaveAttribute('href', '/data')
    await user.click(link)

    expect(await screen.findByRole('heading', { level: 1, name: 'Datos' })).toBeVisible()
    expect(await screen.findByRole('button', { name: 'Descargar Excel' })).toBeVisible()
    expect(screen.getByLabelText('Archivo de respaldo (.xlsx)')).toHaveAttribute('accept', '.xlsx')
  })

  it('sin sesión, /data invita a ingresar y no muestra acciones', async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />, { route: '/data' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Datos' })).toBeVisible()
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.queryByRole('button', { name: 'Descargar Excel' })).not.toBeInTheDocument()
  })
})

describe('Página /login', () => {
  it('«Continuar con Google» es una navegación completa same-origin al inicio OIDC', async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />, { route: '/login' })

    expect(
      await screen.findByRole('heading', { name: `Ingresar a ${projectIdentity.name}` }),
    ).toBeVisible()
    const google = screen.getByRole('link', { name: 'Continuar con Google' })
    expect(google.tagName).toBe('A')
    expect(google).toHaveAttribute('href', '/oauth2/authorization/google')
    expect(google).not.toHaveAttribute('target')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
  })

  it('un fallo o cancelación muestra un mensaje fijo con reintento, sin reflejar parámetros', async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />, {
      route: '/login?error=authentication&error_description=Detalle%20del%20proveedor',
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo iniciar sesión')
    expect(alert).toHaveTextContent('El ingreso con Google se canceló o no se pudo completar.')
    expect(within(alert).getByRole('link', { name: 'Reintentar' })).toHaveAttribute(
      'href',
      '/oauth2/authorization/google',
    )
    expect(screen.queryByText(/Detalle del proveedor/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar con Google' })).toBeVisible()
  })

  it('otro valor de error no muestra mensaje', async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />, { route: '/login?error=<b>otro</b>' })

    expect(await screen.findByRole('link', { name: 'Continuar con Google' })).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/otro/)).not.toBeInTheDocument()
  })

  it('con sesión iniciada no ofrece otro ingreso y lleva a Notas', async () => {
    installAuthBackend({ user: buildAuthUser() })
    installTodayNote()
    const { user } = renderWithProviders(<AppRoutes />, { route: '/login' })

    expect(await screen.findByRole('heading', { name: 'Ya iniciaste sesión' })).toBeVisible()
    expect(
      screen.getByText(`Estás usando ${projectIdentity.name} como Persona Demo.`),
    ).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Continuar con Google' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Ir al inicio' }))

    expect(await screen.findByLabelText('Editor de nota diaria')).toBeVisible()
  })
})
