import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildAuthUser } from '../test/factories'
import { installAuthBackend } from '../test/msw/authBackend'
import { renderWithProviders } from '../test/render'
import { setViewportWidth } from '../test/viewport'
import { AppRoutes } from './AppRoutes'

describe('AppShell', () => {
  it.each([320, 360, 375, 390, 767, 768, 1280])(
    'ubica la navegación, Demo y Datos a %i px',
    async (width) => {
      setViewportWidth(width)
      installAuthBackend({ user: buildAuthUser() })
      const { user } = renderWithProviders(<AppRoutes />, { route: '/data' })
      const banner = screen.getByRole('banner')
      const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
      const links = within(nav).getAllByRole('link')
      const mobile = width < 768
      expect(banner.contains(nav)).toBe(!mobile)
      expect(links.map((link) => link.textContent)).toEqual(
        mobile
          ? ['Notas', 'Voz', 'Referencias', 'Imagen', 'Historial']
          : ['Voz', 'Notas', 'Referencias', 'Imagen', 'Historial'],
      )
      if (mobile) {
        for (const link of links) expect(link.querySelector('svg')).not.toBeNull()
      }
      expect(within(banner).queryByRole('link', { name: 'DevNotes' })).not.toBeInTheDocument()
      expect(links.some((link) => link.getAttribute('aria-current') === 'page')).toBe(false)
      expect(await within(banner).findByRole('button', { name: 'Espacio: Trabajo' })).toBeVisible()
      const demo = within(banner).getByRole('link', { name: 'Demo' })
      expect(demo).toHaveAttribute('href', '/demo?space=work')
      expect(nav.contains(demo)).toBe(false)
      expect(demo.querySelector('svg')).not.toBeNull()
      expect(demo).not.toHaveAttribute('aria-current')
      await user.click(await screen.findByRole('button', { name: /^Cuenta de / }))
      expect(screen.getByRole('menuitem', { name: 'Datos de la cuenta' })).toHaveAttribute(
        'href',
        '/data',
      )
    },
  )

  it.each([375, 1280])('en /demo el enlace Demo lleva aria-current a %i px', async (width) => {
    setViewportWidth(width)
    installAuthBackend({ user: buildAuthUser() })
    renderWithProviders(<AppRoutes />, { route: '/demo?space=work' })

    const banner = screen.getByRole('banner')
    expect(await within(banner).findByRole('link', { name: 'Demo' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(nav).getAllByRole('link')).toHaveLength(5)
    for (const link of within(nav).getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current')
    }
  })
})
