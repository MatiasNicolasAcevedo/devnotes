import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createContext, useContext, type ReactElement, type ReactNode } from 'react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AppProviders } from '../app/AppProviders'
import { createQueryClient } from '../app/queryClient'
import type { Space } from '../features/spaces/space'
import { FixedSpace } from './space'

interface ProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Ruta inicial del router de memoria. */
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

  const ViewContext = createContext<ReactNode>(null)
  function View() {
    return <FixedSpace space={space}>{useContext(ViewContext)}</FixedSpace>
  }
  const router = createMemoryRouter([{ path: '*', element: <View /> }], {
    initialEntries: [route],
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProviders queryClient={queryClient}>
        <ViewContext value={children}>
          <RouterProvider router={router} />
        </ViewContext>
      </AppProviders>
    )
  }

  return { user, queryClient, ...render(ui, { wrapper: Wrapper, ...options }) }
}
