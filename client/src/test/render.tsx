import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { AppProviders } from '../app/AppProviders'
import { createQueryClient } from '../app/queryClient'
import type { Space } from '../features/spaces/space'
import { FixedSpace } from './space'

interface ProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Ruta inicial del MemoryRouter. */
  route?: string
  /** Espacio confirmado para lo que se monta fuera del shell (el shell real lo resuelve desde la URL). */
  space?: Space
}

/**
 * Renderiza con los providers reales (tema, Query, router). Cada test recibe un QueryClient propio y sin reintentos,
 * para que los estados de error sean inmediatos y no se comparta cache entre tests.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', space = 'work', ...options }: ProvidersOptions = {},
) {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
    mutations: { retry: false },
  })
  const user = userEvent.setup()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProviders queryClient={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <FixedSpace space={space}>{children}</FixedSpace>
        </MemoryRouter>
      </AppProviders>
    )
  }

  return { user, queryClient, ...render(ui, { wrapper: Wrapper, ...options }) }
}
