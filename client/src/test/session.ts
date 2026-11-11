import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'

/** Abre el menú de usuario de la barra y devuelve la opción de cierre («Cerrar sesión» o «Cerrando sesión…»). */
export async function openAccountMenu(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^Cuenta de / }))
  return screen.findByRole('menuitem', { name: /^Cerra(r|ndo) sesión/ })
}

/** Cierra la sesión desde el menú de usuario, esperando a que la opción esté habilitada (token CSRF obtenido). */
export async function clickLogout(user: UserEvent) {
  const item = await openAccountMenu(user)
  await waitFor(() => expect(item).not.toHaveAttribute('aria-disabled', 'true'))
  await user.click(item)
}
