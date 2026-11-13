import { act, screen, waitFor, within } from '@testing-library/react'
import { focusManager } from '@tanstack/react-query'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { buildAuthUser } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { installServiceActivityBackend } from '../../test/msw/serviceActivityBackend'
import { renderWithProviders } from '../../test/render'
import { clickLogout, openAccountMenu } from '../../test/session'
import { AuthSessionProvider } from './AuthSessionProvider'
import { SessionControls } from './SessionControls'

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

function renderControls(route = '/notes') {
  return renderWithProviders(
    <AuthSessionProvider>
      <Routes>
        <Route path="*" element={<SessionControls />} />
      </Routes>
    </AuthSessionProvider>,
    { route },
  )
}

function regainFocus() {
  act(() => {
    focusManager.setFocused(false)
    focusManager.setFocused(true)
  })
}

describe('SessionControls', () => {
  it('un visitante ve «Ingresar» y ningún menú de cuenta', async () => {
    installAuthBackend()
    renderControls()

    expect(await screen.findByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: /^Cuenta de / })).toBeNull()
  })

  it('el menú muestra la identidad y, para la cuenta habilitada, «Actividad del servidor»', async () => {
    const auth = installAuthBackend({ user: owner })
    installServiceActivityBackend(auth, { allowedOwner: owner.id })
    const { user } = renderControls()

    await screen.findByRole('button', { name: 'Cuenta de Dueña Ficticia' })
    const logout = await openAccountMenu(user)
    const menu = screen.getByRole('menu')
    expect(within(menu).getByText('Dueña Ficticia')).toBeVisible()
    expect(
      await within(menu).findByRole('menuitem', { name: 'Actividad del servidor' }),
    ).toBeVisible()
    expect(logout).toHaveTextContent('Cerrar sesión')
    // Ningún icono nuevo en la barra: el detalle vive solo en el menú de cuenta.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('para otra cuenta el menú no ofrece la actividad del servidor', async () => {
    const auth = installAuthBackend({ user: other })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    const { user } = renderControls()

    await screen.findByRole('button', { name: 'Cuenta de Otra Cuenta' })
    await waitFor(() => expect(activity.calls.capabilities).toBe(1))
    await openAccountMenu(user)

    expect(screen.queryByRole('menuitem', { name: 'Actividad del servidor' })).toBeNull()
    expect(activity.calls.starts).toHaveLength(0)
  })

  it('al cambiar de identidad el detalle abierto se descarta y no reaparece para la otra cuenta', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    const { user } = renderControls()
    await waitFor(() => expect(activity.modes()).toEqual(['visit']))
    await openAccountMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: 'Actividad del servidor' }))
    await screen.findByRole('dialog', { name: 'Actividad del servidor' })

    auth.login(other)
    regainFocus()

    expect(await screen.findByRole('button', { name: 'Cuenta de Otra Cuenta' })).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await openAccountMenu(user)
    expect(screen.queryByRole('menuitem', { name: 'Actividad del servidor' })).toBeNull()
    expect(activity.modes()).toEqual(['visit'])
  })

  it('cerrar sesión no pausa la ventana ya autorizada', async () => {
    const auth = installAuthBackend({ user: owner })
    const activity = installServiceActivityBackend(auth, { allowedOwner: owner.id })
    const { user } = renderControls()
    await waitFor(() => expect(activity.state.activeDate).toBe('2026-11-13'))

    await clickLogout(user)

    await waitFor(() => expect(auth.calls.logout).toBe(1))
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Cuenta de / })).toBeNull())
    expect(activity.calls.pause).toBe(0)
    expect(activity.state.activeDate).toBe('2026-11-13')
  })
})
