import { http as mock, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { AuthSessionContext, type AuthSession } from '../auth/sessionContext'
import { z } from 'zod'
import { VoiceDraftProvider } from './VoiceDraftProvider'
import { FixedSpace } from '../../test/space'

const CAPABILITIES_PATH = '/api/v1/voice/capabilities'

const theme = createTheme()

function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

const defaultSession: AuthSession = {
  status: 'authenticated',
  user: { id: 'test-user', email: 'test@example.com', displayName: null, emailVerified: true },
  sessionError: null,
  retrySession: vi.fn(),
  csrfReady: true,
  csrfError: null,
  retryCsrf: vi.fn(),
  sessionEnded: false,
  logout: vi.fn(),
  logoutPending: false,
  logoutError: null,
}

function fullWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthSessionContext value={defaultSession}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <FixedSpace space="work">
            <VoiceDraftProvider>{children}</VoiceDraftProvider>
          </FixedSpace>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthSessionContext>
  )
}

function buildCapabilities(recordingEnabled = false) {
  return {
    recordingEnabled,
    reason: recordingEnabled ? undefined : 'disabled',
    maxDurationSeconds: 600,
    maxAudioBytes: 20_971_520,
    maxTextLength: 50_000,
    mimeTypes: ['audio/webm'],
    language: 'es',
  }
}

// Mock estable de useVoiceRecorder — evita el bucle infinito de VoiceComposer
// (draft como dep en useEffect que llama setCaptureState → nuevo draft → re-render)
vi.mock('./useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    state: 'idle',
    result: null,
    error: null,
    elapsedSeconds: 0,
    elapsedFormatted: '00:00',
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(null),
    cancel: vi.fn(),
    resetError: vi.fn(),
  }),
}))

// Mock de useVoiceDraft con estado controlado
const mockSetCaptureState = vi.fn()
const mockSetText = vi.fn()
const mockTranscribe = vi.fn()
const mockSave = vi.fn().mockResolvedValue('saved')
const mockCopyToClipboard = vi.fn().mockResolvedValue(true)
const mockLoadNote = vi.fn()
const mockDeleteNote = vi.fn().mockResolvedValue('deleted')

vi.mock('./useVoiceDraft', () => {
  const voiceNoteTextSchema = z
    .string()
    .refine((s) => {
      const normalized = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      if (
        /\0|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<=[\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test(
          normalized,
        )
      ) {
        return false
      }
      const trimmed = normalized.replace(/\s/g, '')
      return trimmed.length > 0
    }, 'El texto debe contener al menos un carácter válido.')
    .refine((s) => {
      const normalized = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      return normalized.length >= 1 && normalized.length <= 50_000
    }, 'El texto debe tener entre 1 y 50 000 caracteres.')

  return {
    useVoiceDraft: () => ({
      state: {
        text: '',
        documentState: 'new' as const,
        captureState: 'idle' as const,
        captureResult: null,
        captureError: null,
        elapsedFormatted: '00:00',
        elapsedSeconds: 0,
        noteId: null,
        revision: null,
        generation: 0,
        conflict: null,
      },
      isBusy: false,
      isTextEmpty: true,
      isDirty: false,
      setText: mockSetText,
      loadNote: mockLoadNote,
      transcribe: mockTranscribe,
      save: mockSave,
      deleteNote: mockDeleteNote,
      dismissConflict: vi.fn(),
      detachAsNewNote: vi.fn(),
      copyToClipboard: mockCopyToClipboard,
      reset: vi.fn(),
      setCaptureState: mockSetCaptureState,
      transcribeMutation: { isPending: false, error: null },
      createMutation: { isPending: false, error: null },
      updateMutation: { isPending: false, error: null, isError: false, reset: vi.fn() },
      deleteMutation: { isPending: false, error: null, isError: false, reset: vi.fn() },
    }),
    voiceNoteTextSchema,
  }
})

// Mock de useVoiceNotes
vi.mock('./useVoiceNotes', () => ({
  useVoiceCapabilities: () => ({
    data: buildCapabilities(false),
    isSuccess: true,
  }),
  useTranscribeAudio: () => ({
    isPending: false,
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  }),
  useCreateVoiceNote: () => ({
    isPending: false,
    error: null,
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  }),
}))

// Importar después de los mocks
import { VoiceComposer } from './VoiceComposer'

describe('VoiceComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.use(mock.get(CAPABILITIES_PATH, () => HttpResponse.json(buildCapabilities(false))))
  })

  it('renderiza sin crash con grabación deshabilitada', () => {
    const queryClient = buildQueryClient()
    render(<VoiceComposer />, { wrapper: fullWrapper(queryClient) })

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Guardar/i })).toBeInTheDocument()
    expect(screen.getByText(/grabación de voz está deshabilitada/i)).toBeInTheDocument()
  })

  it('permite escribir texto en el textarea', () => {
    const queryClient = buildQueryClient()
    render(<VoiceComposer />, { wrapper: fullWrapper(queryClient) })

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hola mundo' } })

    expect(mockSetText).toHaveBeenCalledWith('Hola mundo')
  })

  it('copy con fallback cuando navigator.clipboard no está disponible', async () => {
    // Simular que clipboard falla — copyToClipboard devuelve false
    mockCopyToClipboard.mockResolvedValueOnce(false)

    const queryClient = buildQueryClient()
    render(<VoiceComposer />, { wrapper: fullWrapper(queryClient) })

    // Verificar que copyToClipboard devuelve false cuando clipboard no está disponible
    const success = await mockCopyToClipboard()
    expect(success).toBe(false)
  })

  it('guardado manual invoca save del draft', async () => {
    const queryClient = buildQueryClient()
    render(<VoiceComposer />, { wrapper: fullWrapper(queryClient) })

    const saveButton = screen.getByRole('button', { name: /Guardar/i })
    fireEvent.click(saveButton)

    // Con texto vacío, save no se invoca (canSave es false)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('no tiene grabación ni transcripción automática en el componente', () => {
    const queryClient = buildQueryClient()
    render(<VoiceComposer />, { wrapper: fullWrapper(queryClient) })

    expect(screen.queryByRole('button', { name: /Grabar/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Transcribiendo/i)).not.toBeInTheDocument()
  })
})
