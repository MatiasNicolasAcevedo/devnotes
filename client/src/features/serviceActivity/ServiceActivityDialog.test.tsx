import { screen, waitFor, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import {
  installServiceActivityBackend,
  type ServiceActivityBackendState,
} from '../../test/msw/serviceActivityBackend'
import { renderWithProviders } from '../../test/render'
import { AuthSessionProvider } from '../auth/AuthSessionProvider'
import { SessionControls } from '../auth/SessionControls'
import {
  SERVICE_ACTIVITY_PATH,
  SERVICE_ACTIVITY_PAUSE_PATH,
  SERVICE_ACTIVITY_START_PATH,
} from './api'
import { PROBE_NOTICE } from './ServiceActivityDialog'

const owner = buildAuthUser({
  id: '01900000-0000-7000-8000-0000000000aa',
  displayName: 'Dueña Ficticia',
  email: 'duena@example.com',
})

const deviceZone = process.env.TZ

afterEach(() => {
  if (deviceZone === undefined) delete process.env.TZ
  else process.env.TZ = deviceZone
})

function setup(window: Partial<ServiceActivityBackendState> = {}) {
  const auth = installAuthBackend({ user: owner })
  const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id, ...window })
  const view = renderWithProviders(
    <AuthSessionProvider>
      <Routes>
        <Route path="*" element={<SessionControls />} />
      </Routes>
    </AuthSessionProvider>,
    { route: '/notes' },
  )
  return { auth, activity, ...view }
}

/** Abre el detalle desde el menú de cuenta, con el CSRF ya disponible. */
async function openDetail(user: ReturnType<typeof setup>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Cuenta de Dueña Ficticia' }))
  const logout = await screen.findByRole('menuitem', { name: 'Cerrar sesión' })
  await waitFor(() => expect(logout).not.toHaveAttribute('aria-disabled', 'true'))
  await user.click(await screen.findByRole('menuitem', { name: 'Actividad del servidor' }))
  return screen.findByRole('dialog', { name: 'Actividad del servidor' })
}

const windowStatus = (dialog: HTMLElement) =>
  within(dialog).findByText(
    /^(Activo hasta las .*|Pausada por hoy|No se pudo comprobar la sonda|Inactiva hoy)$/,
  )

describe('detalle de actividad del servidor', () => {
  it('activo: corte de medianoche en la zona del servicio aunque el dispositivo esté en otra zona', async () => {
    process.env.TZ = 'Asia/Tokyo'
    const { user, activity } = setup({
      lastAttemptAt: '2026-11-13T22:00:00Z',
      lastSuccessAt: '2026-11-13T22:00:00Z',
      lastResult: 'up',
      nextAttemptAt: '2026-11-13T22:10:00Z',
    })
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))

    const dialog = await openDetail(user)

    expect(await windowStatus(dialog)).toHaveTextContent('Activo hasta las 00:00')
    expect(dialog).toHaveTextContent(
      'Corte: 14/11/2026 00:00 (hora de America/Argentina/Buenos_Aires)',
    )
    expect(dialog).toHaveTextContent('Última respuesta: El servidor respondió correctamente')
    expect(dialog).toHaveTextContent('Último intento: 13/11/2026 19:00')
    expect(dialog).toHaveTextContent('Próximo intento: 13/11/2026 19:10')
    expect(dialog).toHaveTextContent(PROBE_NOTICE)
    expect(dialog).toHaveTextContent('La sonda no guarda ni sincroniza notas')
    expect(within(dialog).getByRole('button', { name: 'Pausar por hoy' })).toBeEnabled()
    expect(within(dialog).queryByRole('button', { name: 'Reanudar hoy' })).toBeNull()
  })

  it('pausar y reanudar son explícitos y releen el estado solo tras la acción', async () => {
    const { user, activity } = setup()
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    const dialog = await openDetail(user)
    await windowStatus(dialog)
    expect(activity.calls.status).toBe(1)

    await user.click(within(dialog).getByRole('button', { name: 'Pausar por hoy' }))
    await waitFor(() => expect(within(dialog).getByText('Pausada por hoy')).toBeVisible())
    expect(activity.calls.pause).toBe(1)
    expect(activity.calls.status).toBe(2)

    await user.click(within(dialog).getByRole('button', { name: 'Reanudar hoy' }))
    await waitFor(() => expect(within(dialog).getByText('Activo hasta las 00:00')).toBeVisible())
    expect(activity.modes()).toEqual(['visit', 'resume'])
    expect(activity.calls.status).toBe(3)

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(activity.calls.status).toBe(3)
  })

  it('tres fallos: «No se pudo comprobar la sonda» y el reintento explícito reabre con resume', async () => {
    const { user, activity } = setup({
      activeDate: '2026-11-13',
      consecutiveFailures: 3,
      lastResult: 'timeout',
      lastAttemptAt: '2026-11-13T22:20:00Z',
    })
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    const dialog = await openDetail(user)

    expect(await windowStatus(dialog)).toHaveTextContent('No se pudo comprobar la sonda')
    expect(dialog).toHaveTextContent('Última respuesta: Sin respuesta a tiempo')
    expect(dialog).toHaveTextContent('Fallos seguidos: 3')
    expect(dialog).not.toHaveTextContent('Próximo intento')

    await user.click(within(dialog).getByRole('button', { name: 'Reintentar la sonda' }))
    await waitFor(() => expect(within(dialog).getByText('Activo hasta las 00:00')).toBeVisible())
    expect(activity.modes()).toEqual(['visit', 'resume'])
  })

  it('pausado: no se reactiva solo; ofrece «Reanudar hoy» y no «Pausar por hoy»', async () => {
    const { user, activity } = setup({ pausedDate: '2026-11-13' })
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    const dialog = await openDetail(user)

    expect(await windowStatus(dialog)).toHaveTextContent('Pausada por hoy')
    expect(within(dialog).getByRole('button', { name: 'Reanudar hoy' })).toBeEnabled()
    expect(within(dialog).queryByRole('button', { name: 'Pausar por hoy' })).toBeNull()
    expect(dialog).not.toHaveTextContent('Corte:')
  })

  it('inactiva tras una visita fallida: activa solo por acción explícita', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    server.use(
      mock.post(
        SERVICE_ACTIVITY_START_PATH,
        () => problemResponse(503, { detail: 'No disponible.' }),
        { once: true },
      ),
    )
    const { user } = renderWithProviders(
      <AuthSessionProvider>
        <Routes>
          <Route path="*" element={<SessionControls />} />
        </Routes>
      </AuthSessionProvider>,
      { route: '/notes' },
    )
    const dialog = await openDetail(user)

    expect(await windowStatus(dialog)).toHaveTextContent('Inactiva hoy')
    await user.click(within(dialog).getByRole('button', { name: 'Activar hoy' }))
    await waitFor(() => expect(within(dialog).getByText('Activo hasta las 00:00')).toBeVisible())
    expect(activity.modes()).toEqual(['resume'])
  })

  it('si la capacidad dejó de estar disponible, el detalle lo dice sin datos', async () => {
    const { user, activity } = setup()
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    activity.state.allowedOwner = null

    const dialog = await openDetail(user)

    expect(
      await within(dialog).findByText('La actividad del servidor no está disponible.'),
    ).toBeVisible()
    expect(within(dialog).queryByRole('button', { name: /Pausar|Reanudar|Activar/ })).toBeNull()
  })

  it('sin conexión al consultar: error de conexión distinto del estado de la sonda, con reintento', async () => {
    const { user, activity } = setup()
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    server.use(mock.get(SERVICE_ACTIVITY_PATH, () => HttpResponse.error(), { once: true }))

    const dialog = await openDetail(user)

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo consultar la actividad')
    expect(alert).toHaveTextContent('No se pudo conectar con el servidor')
    expect(dialog).not.toHaveTextContent('No se pudo comprobar la sonda')
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await windowStatus(dialog)).toHaveTextContent('Activo hasta las 00:00')
  })

  it('una pausa rechazada no se presenta como aplicada', async () => {
    const { user, activity } = setup()
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    server.use(
      mock.post(SERVICE_ACTIVITY_PAUSE_PATH, () => problemResponse(500, { detail: 'Error.' }), {
        once: true,
      }),
    )
    const dialog = await openDetail(user)
    await windowStatus(dialog)

    await user.click(within(dialog).getByRole('button', { name: 'Pausar por hoy' }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('La actividad no cambió')
    expect(within(dialog).getByText('Activo hasta las 00:00')).toBeVisible()
    expect(activity.state.pausedDate).toBeNull()
  })

  it('un 403 de CSRF no reenvía la pausa y pide reintentarla', async () => {
    const { user, activity } = setup()
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    const dialog = await openDetail(user)
    await windowStatus(dialog)
    document.cookie = 'XSRF-TOKEN=otro-token-ficticio; Path=/'

    await user.click(within(dialog).getByRole('button', { name: 'Pausar por hoy' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'La operación fue rechazada y no se aplicó',
    )
    expect(activity.calls.pause).toBe(1)
    expect(activity.state.pausedDate).toBeNull()
  })
})
