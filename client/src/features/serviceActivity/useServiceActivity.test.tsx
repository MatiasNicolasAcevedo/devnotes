import { onlineManager } from '@tanstack/react-query'
import { act, screen, waitFor } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { Link, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { installServiceActivityBackend } from '../../test/msw/serviceActivityBackend'
import { renderWithProviders } from '../../test/render'
import { clickLogout } from '../../test/session'
import { AUTH_CSRF_PATH } from '../auth/api'
import { AuthSessionProvider } from '../auth/AuthSessionProvider'
import { SessionAlerts } from '../auth/SessionAlerts'
import { SessionControls } from '../auth/SessionControls'
import { SERVICE_ACTIVITY_START_PATH, serviceActivityQueryKeys } from './api'

const owner = buildAuthUser({
  id: '01900000-0000-7000-8000-0000000000aa',
  displayName: 'Dueña Ficticia',
  email: 'duena@example.com',
})
const other = buildAuthUser({
  id: '01900000-0000-7000-8000-0000000000bb',
  displayName: 'Otra Cuenta',
  email: 'otra@example.com',
})

/** Barra mínima con la sesión real, navegación y un campo de escritura que no debe bloquearse. */
function Harness() {
  return (
    <>
      <SessionControls />
      <SessionAlerts />
      <nav>
        <Link to="/notes">Notas</Link>
        <Link to="/history">Historial</Link>
      </nav>
      <label>
        Nota
        <textarea />
      </label>
    </>
  )
}

function renderApp(route = '/notes') {
  return renderWithProviders(
    <AuthSessionProvider>
      <Routes>
        <Route path="*" element={<Harness />} />
      </Routes>
    </AuthSessionProvider>,
    { route },
  )
}

let visibility: DocumentVisibilityState = 'visible'

function setVisibility(next: DocumentVisibilityState) {
  visibility = next
  act(() => {
    // Como en el navegador, el evento sube del documento a window, donde lo escucha el focusManager de Query.
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
  })
}

/** Espera a que el CSRF esté listo (la opción de cierre se habilita): recién ahí la SPA puede activar. */
async function sessionReady(user: ReturnType<typeof renderApp>['user'], name = 'Dueña Ficticia') {
  await user.click(await screen.findByRole('button', { name: `Cuenta de ${name}` }))
  const logout = await screen.findByRole('menuitem', { name: 'Cerrar sesión' })
  await waitFor(() => expect(logout).not.toHaveAttribute('aria-disabled', 'true'))
  await user.keyboard('{Escape}')
}

beforeEach(() => {
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  })
})

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState')
  // El onlineManager es global: un test que simula un corte de red no deja a los siguientes sin conexión.
  onlineManager.setOnline(true)
  vi.useRealTimers()
})

describe('activación diaria por visita visible', () => {
  it('pide la ventana una sola vez por fecha de servicio pese a renders, foco y re-consultas', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    const { user, queryClient } = renderApp()

    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    await sessionReady(user)
    await user.click(screen.getByRole('link', { name: 'Historial' }))
    await user.click(screen.getByRole('link', { name: 'Notas' }))
    await act(() =>
      queryClient.refetchQueries({ queryKey: serviceActivityQueryKeys.capabilities(owner.id) }),
    )
    setVisibility('hidden')
    setVisibility('visible')

    await waitFor(() => expect(activity.calls.capabilities).toBeGreaterThanOrEqual(2))
    expect(activity.modes()).toEqual(['visit'])
    expect(activity.state.activeDate).toBe('2026-11-13')
  })

  it('con el documento oculto no activa; al volverse visible activa una vez', async () => {
    visibility = 'hidden'
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    const { user } = renderApp()

    await sessionReady(user)
    await waitFor(() => expect(activity.calls.capabilities).toBeGreaterThanOrEqual(1))
    expect(activity.calls.starts).toHaveLength(0)

    setVisibility('visible')
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
  })

  it('espera el CSRF antes de enviar una única visita', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    let csrfRequested = false
    let releaseCsrf = () => {}
    const heldCsrf = new Promise<void>((resolve) => {
      releaseCsrf = resolve
    })
    server.use(
      mock.get(
        AUTH_CSRF_PATH,
        async () => {
          csrfRequested = true
          await heldCsrf
        },
        { once: true },
      ),
    )
    const { user } = renderApp()

    try {
      await waitFor(() => expect(csrfRequested).toBe(true))
      await user.click(await screen.findByRole('button', { name: 'Cuenta de Dueña Ficticia' }))
      expect(await screen.findByRole('menuitem', { name: 'Actividad del servidor' })).toBeVisible()
      expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toHaveAttribute(
        'aria-disabled',
        'true',
      )
      expect(activity.calls.starts).toHaveLength(0)
    } finally {
      releaseCsrf()
    }

    await waitFor(() => expect(activity.state.activeDate).toBe('2026-11-13'))
    expect(activity.modes()).toEqual(['visit'])
  })

  it.each([
    ['otra cuenta autenticada', other.id],
    ['interruptor apagado', null],
  ])('con %s no activa ni ofrece el detalle', async (_case, allowedOwner) => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner })
    const { user } = renderApp()

    await sessionReady(user)
    await waitFor(() => expect(activity.calls.capabilities).toBeGreaterThanOrEqual(1))
    await user.click(screen.getByRole('button', { name: 'Cuenta de Dueña Ficticia' }))
    await screen.findByRole('menuitem', { name: 'Cerrar sesión' })
    expect(screen.queryByRole('menuitem', { name: 'Actividad del servidor' })).toBeNull()
    expect(activity.calls.starts).toHaveLength(0)
    expect(activity.calls.status).toBe(0)
  })

  it('un visitante no consulta ni activa la ventana', async () => {
    const auth = installAuthBackend()
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    renderApp()

    expect(await screen.findByRole('link', { name: 'Ingresar' })).toBeVisible()
    expect(activity.calls.capabilities).toBe(0)
    expect(activity.calls.starts).toHaveLength(0)
  })

  it('respeta la pausa del día al reabrir y en otra pestaña: solo envía visit, nunca resume', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, {
      allowedOwner: owner.id,
      pausedDate: '2026-11-13',
    })
    const first = renderApp()
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    first.unmount()

    // Reapertura o segunda pestaña: memoria nueva, mismo día pausado en el servidor.
    const second = renderApp()
    await waitFor(() => expect(activity.modes()).toEqual(['visit', 'visit']))
    await sessionReady(second.user)

    expect(activity.state.pausedDate).toBe('2026-11-13')
    expect(activity.state.activeDate).toBeNull()
    expect(activity.modes()).not.toContain('resume')
  })

  it('usa la fecha del servidor, no la del dispositivo; un día nuevo se activa al navegar', async () => {
    // Dispositivo en UTC ya en el 14; la zona del servicio todavía está en el 13.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T02:30:00Z'))
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, {
      allowedOwner: owner.id,
      serviceDate: '2026-11-13',
    })
    const { user } = renderApp()

    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    expect(activity.state.activeDate).toBe('2026-11-13')
    await sessionReady(user)

    // Pasó la medianoche del servicio: sin interacción no se pregunta de nuevo.
    activity.state.serviceDate = '2026-11-14'
    vi.setSystemTime(new Date('2026-11-14T03:05:00Z'))
    expect(activity.modes()).toEqual(['visit'])

    // Una navegación real del dueño con la fecha vencida revalida y activa el nuevo día una vez.
    await user.click(screen.getByRole('link', { name: 'Historial' }))
    await waitFor(() => expect(activity.modes()).toEqual(['visit', 'visit']))
    expect(activity.state.activeDate).toBe('2026-11-14')
    await user.click(screen.getByRole('link', { name: 'Notas' }))
    await user.click(screen.getByRole('link', { name: 'Historial' }))
    expect(activity.modes()).toEqual(['visit', 'visit'])
  })

  it('una reconexión de red sin interacción del dueño no activa el día nuevo', async () => {
    // Pestaña visible toda la noche: la fecha del servicio ya venció y la red se corta un momento.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T02:30:00Z'))
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, {
      allowedOwner: owner.id,
      serviceDate: '2026-11-13',
    })
    renderApp()

    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    const capabilities = activity.calls.capabilities

    activity.state.serviceDate = '2026-11-14'
    vi.setSystemTime(new Date('2026-11-14T05:00:00Z'))
    act(() => onlineManager.setOnline(false))
    act(() => onlineManager.setOnline(true))
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))

    // Sin foco ni navegación, el evento `online` no vuelve a preguntar la fecha ni activa la ventana.
    expect(activity.modes()).toEqual(['visit'])
    expect(activity.state.activeDate).toBe('2026-11-13')
    expect(activity.calls.capabilities).toBe(capabilities)
  })

  it('ningún timer pregunta ni activa con la página abierta sin interacción', async () => {
    // Intervalos simulados desde el montaje: cualquier sondeo periódico de la ventana quedaría bajo este reloj.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-11-13T23:00:00Z'))
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    renderApp()
    await vi.waitFor(() => expect(activity.modes()).toEqual(['visit']))
    const capabilities = activity.calls.capabilities

    // Pasa la medianoche del servicio y seis horas más sin foco ni navegación.
    activity.state.serviceDate = '2026-11-14'
    await act(() => vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000))
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

    expect(activity.calls.capabilities).toBe(capabilities)
    expect(activity.calls.status).toBe(0)
    expect(activity.modes()).toEqual(['visit'])
  })

  it('un error al activar no reintenta, no entra en bucle y no bloquea la escritura', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    let starts = 0
    server.use(
      mock.post(SERVICE_ACTIVITY_START_PATH, () => {
        starts += 1
        return problemResponse(503, { detail: 'No disponible.' })
      }),
    )
    const { user, queryClient } = renderApp()

    await waitFor(() => expect(starts).toBe(1))
    await sessionReady(user)
    await act(() =>
      queryClient.refetchQueries({ queryKey: serviceActivityQueryKeys.capabilities(owner.id) }),
    )
    setVisibility('hidden')
    setVisibility('visible')
    const note = screen.getByRole('textbox', { name: 'Nota' })
    await user.type(note, 'sigo escribiendo')

    expect(note).toHaveValue('sigo escribiendo')
    expect(starts).toBe(1)
    expect(activity.calls.status).toBe(0)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('una respuesta tardía de visit tras cerrar sesión no actualiza nada ni activa de nuevo', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    const release = activity.hold('start')
    const { user, queryClient } = renderApp()

    await waitFor(() => expect(activity.calls.starts).toHaveLength(1))
    await clickLogout(user)
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Cuenta de / })).toBeNull())

    // La sesión ya no existe en el servidor: la respuesta vieja es un 401 de una identidad que ya no es la vigente.
    release()
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(activity.state.activeDate).toBeNull()

    expect(activity.calls.starts).toHaveLength(1)
    expect(activity.calls.status).toBe(0)
    expect(queryClient.getQueryCache().findAll({ queryKey: ['serviceActivity'] })).toHaveLength(0)
    expect(screen.queryByText('La sesión terminó. Volvé a ingresar.')).toBeNull()
  })

  it('un 401 tardío de la visit de otra identidad no cierra la sesión vigente', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let starts = 0
    server.use(
      mock.post(SERVICE_ACTIVITY_START_PATH, async () => {
        starts += 1
        await gate
        return problemResponse(401, { detail: 'Se requiere iniciar sesión.' })
      }),
    )
    renderApp()
    await waitFor(() => expect(starts).toBe(1))

    // Otra pestaña cerró la sesión del dueño e ingresó otra cuenta; esta pestaña lo ve al recuperar el foco.
    auth.login(other)
    setVisibility('hidden')
    setVisibility('visible')
    expect(await screen.findByRole('button', { name: 'Cuenta de Otra Cuenta' })).toBeVisible()

    release()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.getByRole('button', { name: 'Cuenta de Otra Cuenta' })).toBeVisible()
    expect(screen.queryByText('La sesión terminó. Volvé a ingresar.')).toBeNull()
    expect(starts).toBe(1)
    expect(activity.calls.status).toBe(0)
  })

  it('un 401 de la visit de la sesión vigente la da por terminada sin reintentar', async () => {
    const auth = installAuthBackend({ user: owner })
    installServiceActivityBackend(auth, { allowedOwner: owner.id })
    let starts = 0
    server.use(
      mock.post(SERVICE_ACTIVITY_START_PATH, () => {
        starts += 1
        auth.expireSession()
        return problemResponse(401, { detail: 'Se requiere iniciar sesión.' })
      }),
    )
    renderApp()

    expect(await screen.findByText('La sesión terminó. Volvé a ingresar.')).toBeVisible()
    expect(starts).toBe(1)
  })

  it('capabilities fuera de contrato no activa', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    server.use(
      mock.get('/api/v1/service-activity/capabilities', () =>
        HttpResponse.json({ available: true }),
      ),
    )
    const { user } = renderApp()

    await sessionReady(user)
    expect(activity.calls.starts).toHaveLength(0)
  })
})
