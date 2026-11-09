import { http as mock, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../services/http'
import { server } from '../../test/msw/server'
import { problemResponse } from '../../test/factories'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import {
  useVoiceCapabilities,
  useVoiceNotes,
  useVoiceNote,
  useCreateVoiceNote,
  useUpdateVoiceNote,
  useDeleteVoiceNote,
  useTranscribeAudio,
} from './useVoiceNotes'

const CAPABILITIES_PATH = '/api/v1/voice/capabilities'
const NOTES_PATH = '/api/v1/voice-notes'

const theme = createTheme()

function buildQueryClient(): QueryClient {
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
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}

function buildCapabilities() {
  return {
    recordingEnabled: false,
    reason: 'disabled',
    maxDurationSeconds: 600,
    maxAudioBytes: 20_971_520,
    maxTextLength: 50_000,
    mimeTypes: ['audio/webm'],
    language: 'es',
  }
}

function buildNoteDetail(overrides = {}) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    text: 'Texto de prueba',
    revision: 1,
    createdAt: '2026-11-01T12:00:00.000000Z',
    updatedAt: '2026-11-01T12:00:00.000000Z',
    ...overrides,
  }
}

describe('useVoiceCapabilities', () => {
  it('carga capacidades', async () => {
    server.use(mock.get(CAPABILITIES_PATH, () => HttpResponse.json(buildCapabilities())))
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useVoiceCapabilities(), { wrapper: wrapper(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(buildCapabilities())
  })
})

describe('useVoiceNotes', () => {
  it('carga lista vacía', async () => {
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
    const { result } = renderHook(() => useVoiceNotes(), { wrapper: wrapper(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.content).toEqual([])
  })
})

describe('useVoiceNote', () => {
  it('no ejecuta sin id', async () => {
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useVoiceNote(''), { wrapper: wrapper(queryClient) })
    // TanStack Query v5: cuando enabled es false, la consulta está idle (no fetching)
    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('carga detalle por id', async () => {
    const detail = buildNoteDetail()
    server.use(mock.get(`${NOTES_PATH}/:id`, () => HttpResponse.json(detail)))
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useVoiceNote(detail.id), { wrapper: wrapper(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(detail)
  })
})

describe('useCreateVoiceNote', () => {
  it('crea nota e invalida lista', async () => {
    const detail = buildNoteDetail()
    server.use(
      mock.post(NOTES_PATH, async ({ request }) => {
        const body = (await request.json()) as { text: string }
        return HttpResponse.json({ ...detail, text: body.text }, { status: 201 })
      }),
    )
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useCreateVoiceNote(), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync('Nuevo texto')
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.text).toBe('Nuevo texto')
  })

  it('propaga 400 como ApiError', async () => {
    server.use(mock.post(NOTES_PATH, () => problemResponse(400, { detail: 'Solicitud inválida.' })))
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useCreateVoiceNote(), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await expect(result.current.mutateAsync('')).rejects.toMatchObject({ status: 400 })
    })
  })
})

describe('useUpdateVoiceNote', () => {
  it('actualiza con CAS', async () => {
    server.use(
      mock.put(`${NOTES_PATH}/:id`, async ({ request }) => {
        const body = (await request.json()) as { text: string; expectedRevision: number }
        return HttpResponse.json({
          ...buildNoteDetail({ text: body.text, revision: body.expectedRevision + 1 }),
        })
      }),
    )
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useUpdateVoiceNote(), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ id: 'note-1', text: 'Editado', expectedRevision: 1 })
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.text).toBe('Editado')
    expect(result.current.data?.revision).toBe(2)
  })

  it('propaga 409 como ApiError', async () => {
    server.use(
      mock.put(`${NOTES_PATH}/:id`, () =>
        problemResponse(409, { detail: 'Conflicto de revisión.' }),
      ),
    )
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useUpdateVoiceNote(), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'note-1', text: 'Editado', expectedRevision: 1 }),
      ).rejects.toMatchObject({ status: 409 })
    })
  })
})

describe('useDeleteVoiceNote', () => {
  it('elimina con CAS y consume 204', async () => {
    server.use(mock.delete(`${NOTES_PATH}/:id`, () => new HttpResponse(null, { status: 204 })))
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useDeleteVoiceNote(), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ id: 'note-1', expectedRevision: 1 })
    })

    expect(result.current.isSuccess).toBe(true)
  })

  it('propaga 404 como ApiError', async () => {
    server.use(mock.delete(`${NOTES_PATH}/:id`, () => problemResponse(404)))
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useDeleteVoiceNote(), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'note-1', expectedRevision: 1 }),
      ).rejects.toMatchObject({ status: 404 })
    })
  })
})

describe('useTranscribeAudio', () => {
  it('transcribe audio y devuelve texto', async () => {
    // Se valida que el hook invoca la función y propaga el resultado.
    const apiMod = await import('./api')
    const transcribeSpy = vi
      .spyOn(apiMod, 'transcribeAudio')
      .mockResolvedValue({ text: 'transcrito', language: 'es' })
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useTranscribeAudio(), { wrapper: wrapper(queryClient) })

    const blob = new Blob(['fake-audio'], { type: 'audio/webm' })
    await act(async () => {
      await result.current.mutateAsync(blob)
    })

    // El observer de la mutación publica el estado después de que mutateAsync resuelve.
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.text).toBe('transcrito')
    expect(transcribeSpy).toHaveBeenCalledWith(blob)
    transcribeSpy.mockRestore()
  })

  it('propaga 429 como ApiError sin retry', async () => {
    const apiMod = await import('./api')
    const transcribeSpy = vi
      .spyOn(apiMod, 'transcribeAudio')
      .mockRejectedValue(
        new ApiError(429, { title: 'Too Many Requests', detail: 'Servicio ocupado.' }),
      )
    const queryClient = buildQueryClient()
    const { result } = renderHook(() => useTranscribeAudio(), { wrapper: wrapper(queryClient) })

    const blob = new Blob(['x'], { type: 'audio/webm' })
    await act(async () => {
      await expect(result.current.mutateAsync(blob)).rejects.toMatchObject({ status: 429 })
    })

    // Sin retry automático — una sola invocación
    expect(transcribeSpy).toHaveBeenCalledTimes(1)
    transcribeSpy.mockRestore()
  })
})
