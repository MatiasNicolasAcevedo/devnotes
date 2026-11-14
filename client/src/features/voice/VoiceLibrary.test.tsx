import { http as mock, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FixedSpace } from '../../test/space'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { VoiceLibrary } from './VoiceLibrary'
import { server } from '../../test/msw/server'

const NOTES_PATH = '/api/v1/voice-notes'
const theme = createTheme()

function buildQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <FixedSpace space="work" owner="owner-a">
          {children}
        </FixedSpace>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

function buildListItem(index: number) {
  const day = String(Math.min(index, 28)).padStart(2, '0')
  const suffix = String(index).padStart(4, '0')
  return {
    id: `01900000-0000-7000-8000-00000000${suffix}`,
    excerpt: `Extracto de la nota ${index}…`,
    revision: 1,
    createdAt: `2026-11-${day}T12:00:00.000000Z`,
    updatedAt: `2026-11-${day}T12:00:00.000000Z`,
  }
}

function renderLibrary(queryClient: QueryClient, onSelect = vi.fn()) {
  return render(<VoiceLibrary onSelect={onSelect} selectedId={null} />, {
    wrapper: wrapper(queryClient),
  })
}

describe('VoiceLibrary', () => {
  it('muestra estado cargando', async () => {
    server.use(mock.get(NOTES_PATH, () => new HttpResponse(null, { status: 200 })))
    const queryClient = buildQueryClient()
    renderLibrary(queryClient)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('muestra lista vacía cuando no hay notas', async () => {
    server.use(
      mock.get(NOTES_PATH, () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        }),
      ),
    )
    const queryClient = buildQueryClient()
    renderLibrary(queryClient)

    await waitFor(() => {
      expect(screen.getByText(/no hay notas de voz/i)).toBeInTheDocument()
    })
  })

  it('muestra error cuando falla la carga', async () => {
    server.use(mock.get(NOTES_PATH, () => new HttpResponse(null, { status: 500 })))
    const queryClient = buildQueryClient()
    renderLibrary(queryClient)

    await waitFor(() => {
      expect(screen.getByText(/no se pudo cargar la lista/i)).toBeInTheDocument()
    })
  })

  it('muestra las notas y permite seleccionar una', async () => {
    const items = [buildListItem(1), buildListItem(2)]
    const onSelect = vi.fn()
    server.use(
      mock.get(NOTES_PATH, () =>
        HttpResponse.json({
          content: items,
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
        }),
      ),
    )
    const queryClient = buildQueryClient()
    renderLibrary(queryClient, onSelect)

    await waitFor(() => {
      expect(screen.getByText('Extracto de la nota 1…')).toBeInTheDocument()
      expect(screen.getByText('Extracto de la nota 2…')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Extracto de la nota 1…'))

    expect(onSelect).toHaveBeenCalledWith(items[0])
  })

  it('resalta la nota seleccionada', async () => {
    const items = [buildListItem(1)]
    server.use(
      mock.get(NOTES_PATH, () =>
        HttpResponse.json({
          content: items,
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        }),
      ),
    )
    const queryClient = buildQueryClient()
    render(<VoiceLibrary onSelect={vi.fn()} selectedId={items[0].id} />, {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => {
      expect(screen.getByText('Extracto de la nota 1…')).toBeInTheDocument()
    })

    // ListItemButton con selected=true aplica la clase Mui-selected
    const selectedButton = document.querySelector('.Mui-selected')
    expect(selectedButton).toBeInTheDocument()
  })

  it('no muestra paginación con una sola página', async () => {
    const items = [buildListItem(1)]
    server.use(
      mock.get(NOTES_PATH, () =>
        HttpResponse.json({
          content: items,
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        }),
      ),
    )
    const queryClient = buildQueryClient()
    renderLibrary(queryClient)

    await waitFor(() => {
      expect(screen.getByText('Extracto de la nota 1…')).toBeInTheDocument()
    })

    // No hay componente Pagination con count > 1
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('muestra paginación con múltiples páginas', async () => {
    const items = Array.from({ length: 20 }, (_, i) => buildListItem(i + 1))
    server.use(
      mock.get(NOTES_PATH, () =>
        HttpResponse.json({
          content: items,
          page: 0,
          size: 20,
          totalElements: 35,
          totalPages: 2,
        }),
      ),
    )
    const queryClient = buildQueryClient()
    renderLibrary(queryClient)

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  it('navega a la página siguiente', async () => {
    const items1 = Array.from({ length: 20 }, (_, i) => buildListItem(i + 1))
    const items2 = [buildListItem(100)]

    let callCount = 0
    server.use(
      mock.get(NOTES_PATH, ({ request }) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page') ?? '0')
        callCount++
        if (page === 0) {
          return HttpResponse.json({
            content: items1,
            page: 0,
            size: 20,
            totalElements: 21,
            totalPages: 2,
          })
        }
        return HttpResponse.json({
          content: items2,
          page: 1,
          size: 20,
          totalElements: 21,
          totalPages: 2,
        })
      }),
    )

    const queryClient = buildQueryClient()
    renderLibrary(queryClient)

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    // Hacer clic en la página 2
    const page2Button = screen.getByRole('button', { name: /Go to page 2/i })
    await user.click(page2Button)

    await waitFor(() => {
      expect(screen.getByText('Extracto de la nota 100…')).toBeInTheDocument()
    })

    // Se hicieron dos llamadas: página 0 y página 1
    expect(callCount).toBe(2)
  })

  it('retrocede a la página anterior cuando la actual queda vacía tras invalidar', async () => {
    const items1 = Array.from({ length: 20 }, (_, i) => buildListItem(i + 1))
    let items2 = [buildListItem(100)]
    server.use(
      mock.get(NOTES_PATH, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? '0')
        const totalElements = items1.length + items2.length
        const totalPages = Math.ceil(totalElements / 20)
        return HttpResponse.json({
          content: page === 0 ? items1 : items2,
          page,
          size: 20,
          totalElements,
          totalPages,
        })
      }),
    )
    const queryClient = buildQueryClient()
    renderLibrary(queryClient)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Go to page 2/i }))
    expect(await screen.findByText('Extracto de la nota 100…')).toBeInTheDocument()

    // Se borra la única nota de la página 2 (como tras un DELETE 204) y se invalida la lista.
    items2 = []
    await queryClient.invalidateQueries({ queryKey: ['voice'] })

    expect(await screen.findByText('Extracto de la nota 1…')).toBeInTheDocument()
    expect(screen.queryByText(/No hay notas de voz/)).not.toBeInTheDocument()
  })
})
