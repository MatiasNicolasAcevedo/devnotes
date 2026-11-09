import { http as mock, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { server } from '../../test/msw/server'
import type { VoiceNoteListItem } from './api'

const NOTES_PATH = '/api/v1/voice-notes'
const CAPABILITIES_PATH = '/api/v1/voice/capabilities'
const theme = createTheme()

// Estado compartido global para el mock de VoiceComposer
interface VoicePageMockState {
  isDirty: boolean
  saveFn: (() => void) & { mockClear: () => void }
  resetFn: (() => void) & { mockClear: () => void }
}

const mockState: VoicePageMockState = {
  isDirty: false,
  saveFn: vi.fn() as (() => void) & { mockClear: () => void },
  resetFn: vi.fn() as (() => void) & { mockClear: () => void },
}

beforeAll(() => {
  ;(globalThis as Record<string, unknown>).__voicePageMockState = mockState
})

function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

function fullWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}

function buildListItem(index: number): VoiceNoteListItem {
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

// Mock de VoiceComposer con ref support para isDirty
// vi.mock factory necesita require para React porque los imports estáticos no están disponibles
vi.mock('./VoiceComposer', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- vi.mock factory is hoisted; static imports are not available
    const React = require('react')
  return {
    VoiceComposer: (function () {
      return React.forwardRef(function VoiceComposerMock(
        {
          selectedDetail,
        }: {
          selectedDetail?: { id: string; text: string; revision: number } | null
        },
        ref: React.Ref<{ isDirty: boolean; save: () => void; reset: () => void }>,
      ) {
        const globalState = globalThis as Record<string, unknown>
        const ms = globalState.__voicePageMockState as VoicePageMockState | undefined
        React.useImperativeHandle(ref, () => ({
          get isDirty() {
            return ms?.isDirty ?? false
          },
          save() {
            if (typeof ms?.saveFn === 'function') ms.saveFn()
          },
          reset() {
            if (typeof ms?.resetFn === 'function') ms.resetFn()
          },
        }))
        return (
          <div data-testid="voice-composer">
            {selectedDetail && <span>Nota: {selectedDetail.id}</span>}
            {!selectedDetail && <span>Composer vacío</span>}
          </div>
        )
      })
    })(),
  }
})

// Mock de VoiceLibrary con lista de notas
const mockItems: VoiceNoteListItem[] = [buildListItem(1), buildListItem(2)]

vi.mock('./VoiceLibrary', () => ({
  VoiceLibrary: vi.fn(
    ({
      onSelect,
      selectedId,
    }: {
      onSelect: (item: VoiceNoteListItem) => void
      selectedId: string | null
    }) => {
      return (
        <div data-testid="voice-library">
          {mockItems.map((item) => (
            <button
              key={item.id}
              data-selected={item.id === selectedId}
              onClick={() => onSelect(item)}
            >
              {item.excerpt}
            </button>
          ))}
        </div>
      )
    },
  ),
}))

// Mock de useVoiceNote
vi.mock('./useVoiceNotes', () => ({
  useVoiceNote: (id: string) => ({
    data: id
      ? {
          id,
          text: 'Texto de la nota',
          revision: 1,
          createdAt: '2026-11-01T12:00:00Z',
          updatedAt: '2026-11-01T12:00:00Z',
        }
      : null,
    isSuccess: !!id,
  }),
  useVoiceCapabilities: () => ({
    data: { recordingEnabled: false, reason: 'disabled' },
    isSuccess: true,
  }),
}))

// Importar después de los mocks
import { VoicePage } from './VoicePage'

describe('VoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.isDirty = false
    mockState.saveFn.mockClear()
    mockState.resetFn.mockClear()
    ;(globalThis as Record<string, unknown>).__voicePageMockState = mockState
    server.use(
      mock.get(NOTES_PATH, () =>
        HttpResponse.json({
          content: mockItems,
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
        }),
      ),
      mock.get(CAPABILITIES_PATH, () =>
        HttpResponse.json({
          recordingEnabled: false,
          reason: 'disabled',
        }),
      ),
    )
  })

  it('renderiza sin crash con composer y library', () => {
    const queryClient = buildQueryClient()
    render(<VoicePage />, { wrapper: fullWrapper(queryClient) })

    expect(screen.getByTestId('voice-composer')).toBeInTheDocument()
    expect(screen.getByTestId('voice-library')).toBeInTheDocument()
    expect(screen.getByText(/Notas de voz/i)).toBeInTheDocument()
  })

  it('selecciona una nota sin dirty directamente', async () => {
    mockState.isDirty = false
    const queryClient = buildQueryClient()
    render(<VoicePage />, { wrapper: fullWrapper(queryClient) })

    const user = userEvent.setup()
    const noteButton = screen.getByText('Extracto de la nota 1…')
    await user.click(noteButton)

    // No debería aparecer el diálogo de dirty
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre diálogo de dirty cuando hay cambios sin guardar', async () => {
    mockState.isDirty = true
    const queryClient = buildQueryClient()
    render(<VoicePage />, { wrapper: fullWrapper(queryClient) })

    const user = userEvent.setup()
    const noteButton = screen.getByText('Extracto de la nota 1…')
    await user.click(noteButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByText(/Guardar y continuar/i)).toBeInTheDocument()
    expect(screen.getByText(/Descartar y continuar/i)).toBeInTheDocument()
    expect(screen.getByText(/Cancelar/i)).toBeInTheDocument()
  })

  it('cierra el diálogo de dirty con Cancelar', async () => {
    mockState.isDirty = true
    const queryClient = buildQueryClient()
    render(<VoicePage />, { wrapper: fullWrapper(queryClient) })

    const user = userEvent.setup()
    const noteButton = screen.getByText('Extracto de la nota 1…')
    await user.click(noteButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.click(screen.getByText(/Cancelar/i))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('Descartar y continuar invoca reset y cambia la selección', async () => {
    mockState.isDirty = true
    const queryClient = buildQueryClient()
    render(<VoicePage />, { wrapper: fullWrapper(queryClient) })

    const user = userEvent.setup()
    const noteButton = screen.getByText('Extracto de la nota 1…')
    await user.click(noteButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.click(screen.getByText(/Descartar y continuar/i))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mockState.resetFn).toHaveBeenCalled()
  })

  it('Guardar y continuar invoca save del composer', async () => {
    mockState.isDirty = true
    const queryClient = buildQueryClient()
    render(<VoicePage />, { wrapper: fullWrapper(queryClient) })

    const user = userEvent.setup()
    const noteButton = screen.getByText('Extracto de la nota 1…')
    await user.click(noteButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.click(screen.getByText(/Guardar y continuar/i))
    expect(mockState.saveFn).toHaveBeenCalled()
  })
})
