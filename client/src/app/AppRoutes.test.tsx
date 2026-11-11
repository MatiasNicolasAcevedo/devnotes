import projectIdentity from '../project-identity.json'
import { screen, within } from '@testing-library/react'
import { http as mock } from 'msw'
import { describe, expect, it } from 'vitest'
import { buildAuthUser, problemResponse } from '../test/factories'
import { installAuthBackend } from '../test/msw/authBackend'
import { server } from '../test/msw/server'
import { renderWithProviders } from '../test/render'
import { AppRoutes } from './AppRoutes'

describe('AppRoutes', () => {
  it(`la ruta inicial muestra el shell de ${projectIdentity.name} con el estado real del servidor`, async () => {
    installAuthBackend()
    renderWithProviders(<AppRoutes />)

    expect(screen.getByRole('link', { name: `${projectIdentity.name}` })).toHaveAttribute(
      'href',
      '/',
    )
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: `Bienvenido a ${projectIdentity.name}`,
      }),
    ).toBeVisible()
    expect(
      await screen.findByText(`${projectIdentity.name} · versión 0.0.1-TEST`),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
  })

  it('una ruta desconocida muestra la página no encontrada con vuelta al inicio', async () => {
    installAuthBackend()
    const { user } = renderWithProviders(<AppRoutes />, { route: '/no-existe' })

    expect(await screen.findByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Volver al inicio' }))

    expect(
      screen.getByRole('heading', { level: 1, name: `Bienvenido a ${projectIdentity.name}` }),
    ).toBeVisible()
    expect(await screen.findByText(/versión/)).toBeInTheDocument()
  })
})

describe('Página /voice', () => {
  it('muestra la pantalla de notas de voz con el enlace en la barra', async () => {
    installAuthBackend()
    server.use(
      mock.get('/api/v1/voice/capabilities', () => problemResponse(401)),
      mock.get('/api/v1/voice-notes', () => problemResponse(401)),
    )
    renderWithProviders(<AppRoutes />, { route: '/voice' })

    expect(await screen.findByRole('heading', { name: 'Notas de voz' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Voz' })).toHaveAttribute('href', '/voice')
  })
})

describe('Página /data', () => {
  it('el enlace «Datos» de la barra lleva a la pantalla de exportar e importar', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const { user } = renderWithProviders(<AppRoutes />)

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    const link = within(nav).getByRole('link', { name: 'Datos' })
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

  it('con sesión iniciada no ofrece otro ingreso y lleva al inicio', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const { user } = renderWithProviders(<AppRoutes />, { route: '/login' })

    expect(await screen.findByRole('heading', { name: 'Ya iniciaste sesión' })).toBeVisible()
    expect(
      screen.getByText(`Estás usando ${projectIdentity.name} como Persona Demo.`),
    ).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Continuar con Google' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Ir al inicio' }))

    expect(
      screen.getByRole('heading', { level: 1, name: `Bienvenido a ${projectIdentity.name}` }),
    ).toBeVisible()
  })
})
