import { useState } from 'react'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AppProviders } from './AppProviders'
import { AppRoutes } from './AppRoutes'
import { createQueryClient } from './queryClient'

const router = createBrowserRouter([{ path: '*', element: <AppRoutes /> }])

export function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
