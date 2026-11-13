import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { expect, it } from 'vitest'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { installServiceActivityBackend } from '../../test/msw/serviceActivityBackend'
import { renderWithProviders } from '../../test/render'
import { AuthSessionProvider } from '../auth/AuthSessionProvider'
import { SessionControls } from '../auth/SessionControls'
import { ServerStatus } from '../system/ServerStatus'
import { SERVICE_ACTIVITY_PAUSE_PATH, serviceActivityQueryKeys } from './api'

const owner = buildAuthUser({ id: '01900000-0000-7000-8000-000000000056', displayName: 'Ada' })
const other = buildAuthUser({ id: '01900000-0000-7000-8000-000000000057', displayName: 'Bruno' })

function setup(actor = owner) {
  const auth = installAuthBackend({ user: actor })
  const activity = installServiceActivityBackend(auth, {
    allowedOwner: owner.id,
    lastResult: 'up',
    lastAttemptAt: '2026-11-14T02:15:00Z',
    lastSuccessAt: '2026-11-14T02:15:00Z',
  })
  const view = renderWithProviders(
    <AuthSessionProvider>
      <ServerStatus />
      <SessionControls />
    </AuthSessionProvider>,
    { route: '/notes' },
  )
  return { activity, ...view }
}

it('una visita muestra la última respuesta y permite pausar y reanudar aunque falle una acción', async () => {
  const { activity, queryClient, user } = setup()
  const online = await screen.findByRole('status', { name: 'Servidor conectado' })
  expect(online).toHaveTextContent('Online')
  await waitFor(() => expect(activity.modes()).toEqual(['visit']))

  await user.click(screen.getByRole('button', { name: 'Cuenta de Ada' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Actividad del servidor' }))
  const detail = within(await screen.findByRole('dialog', { name: 'Actividad del servidor' }))
  expect(await detail.findByText('Activo hasta las 00:00')).toBeVisible()
  expect(detail.getByText(/Corte: 14\/11\/2026 00:00/)).toBeVisible()
  expect(detail.getByText('Última respuesta correcta: 13/11/2026 23:15')).toBeVisible()
  expect(
    detail.getByText(
      'La sonda intenta evitar la suspensión por inactividad. Render puede reiniciar el servicio.',
    ),
  ).toBeVisible()

  server.use(
    http.post(
      SERVICE_ACTIVITY_PAUSE_PATH,
      () => problemResponse(503, { detail: 'Error temporal de prueba.' }),
      { once: true },
    ),
  )
  const pause = detail.getByRole('button', { name: 'Pausar por hoy' })
  await waitFor(() => expect(pause).toBeEnabled())
  await user.click(pause)
  expect(await detail.findByRole('alert')).toHaveTextContent('La actividad no cambió')
  expect(detail.getByText('Activo hasta las 00:00')).toBeVisible()
  expect(detail.queryByText('Pausada por hoy')).toBeNull()
  expect(activity.state.pausedDate).toBeNull()
  expect(online).toHaveTextContent('Online')

  await user.click(pause)
  expect(await detail.findByText('Pausada por hoy')).toBeVisible()
  expect(detail.queryByRole('alert')).toBeNull()
  expect(activity.calls.pause).toBe(1)

  const resume = detail.getByRole('button', { name: 'Reanudar hoy' })
  await waitFor(() => expect(resume).toBeEnabled())
  await user.click(resume)
  expect(await detail.findByText('Activo hasta las 00:00')).toBeVisible()
  expect(activity.modes()).toEqual(['visit', 'resume'])

  await user.click(detail.getByRole('button', { name: 'Cerrar' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(await screen.findByRole('status', { name: 'Servidor conectado' })).toHaveTextContent(
    'Online',
  )
  expect(queryClient.isFetching({ queryKey: serviceActivityQueryKeys.status(owner.id) })).toBe(0)
})

it('la otra cuenta ve su conexión pero no tiene acceso al detalle ni inicia una visita', async () => {
  const { activity, queryClient, user } = setup(other)
  expect(await screen.findByRole('status', { name: 'Servidor conectado' })).toHaveTextContent(
    'Online',
  )
  await waitFor(() =>
    expect(queryClient.getQueryData(serviceActivityQueryKeys.capabilities(other.id))).toEqual({
      available: false,
    }),
  )
  await user.click(await screen.findByRole('button', { name: 'Cuenta de Bruno' }))
  const menu = within(await screen.findByRole('menu'))
  expect(menu.queryByRole('menuitem', { name: 'Actividad del servidor' })).toBeNull()
  expect(activity.modes()).toEqual([])
  expect(activity.calls.status).toBe(0)
})
