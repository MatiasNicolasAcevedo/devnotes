import { http as mock, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useState, type ReactNode } from 'react'
import { server } from '../../test/msw/server'
import { problemResponse } from '../../test/factories'
import { AuthSessionContext, type AuthSession } from '../auth/sessionContext'
import { voiceQueryKeys, type VoiceNoteDetail } from './api'
import { VoicePage } from './VoicePage'
import type { CaptureResult } from './recorder'
import { VoiceDraftProvider } from './VoiceDraftProvider'

/*
 * Integración de la pantalla /voice: VoicePage + VoiceLibrary + VoiceComposer + useVoiceDraft reales,
 * con la API simulada por MSW. Solo se sustituye el grabador (MediaRecorder no existe en jsdom).
 * Las versiones anteriores mockeaban el composer y ocultaron los bloqueantes B-1/B-2 de T-035.
 */
const recorderMock = vi.hoisted(() => ({ state: 'idle' }))

vi.mock('./useVoiceRecorder', () => ({
  useVoiceRecorder: () => {
    const [recording, setRecording] = useState(false)
    const [result, setResult] = useState<CaptureResult | null>(null)
    return {
      ...idleRecorder,
      state: recording ? 'recording' : recorderMock.state,
      result,
      consumeResult: () => setResult(null),
      start: () => setRecording(true),
      stop: () => {
        const capture = {
          blob: new Blob(['audio ficticio'], { type: 'audio/webm' }),
          durationSeconds: 1,
          sizeBytes: 14,
          generation: 1,
        }
        setRecording(false)
        setResult(capture)
        return Promise.resolve(capture)
      },
    }
  },
}))

const idleRecorder = {
  state: 'idle',
  result: null,
  error: null,
  elapsedSeconds: 0,
  elapsedFormatted: '00:00',
  cancel: vi.fn(),
  resetError: vi.fn(),
}

const NOTES_PATH = '/api/v1/voice-notes'
const NOTE_PATH = '/api/v1/voice-notes/:id'
const CAPABILITIES_PATH = '/api/v1/voice/capabilities'
const ID_1 = '01900000-0000-7000-8000-000000000001'
const ID_2 = '01900000-0000-7000-8000-000000000002'
const ID_NEW = '01900000-0000-7000-8000-000000000099'

const theme = createTheme()

const session: AuthSession = {
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

interface Backend {
  notes: Map<string, VoiceNoteDetail>
  puts: { id: string; text: string; expectedRevision: number }[]
  posts: { text: string }[]
  deletes: { id: string; expectedRevision: number }[]
  /** Fuerza el estado de la próxima respuesta PUT/DELETE (409, 500…). */
  nextPutStatus: number | null
  nextDeleteStatus: number | null
  /** Si está definida, la respuesta PUT/DELETE espera a que se resuelva (petición en vuelo). */
  holdPut: Promise<void> | null
  holdDelete: Promise<void> | null
  /** Estado forzado y retención de la próxima respuesta GET de detalle. */
  nextGetStatus: number | null
  holdGet: Promise<void> | null
  /** IDs pedidos al GET de detalle, en orden. */
  detailGets: string[]
  /** Capacidad de grabación anunciada por el servidor. */
  recordingEnabled: boolean
}

/** Promesa controlable para retener una respuesta MSW. */
function hold(): { promise: Promise<void>; release: () => void } {
  let release: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function note(id: string, text: string, revision = 1): VoiceNoteDetail {
  return {
    id,
    text,
    revision,
    createdAt: '2026-11-01T12:00:00.000000Z',
    updatedAt: '2026-11-01T12:00:00.000000Z',
  }
}

function installBackend(): Backend {
  const backend: Backend = {
    notes: new Map([
      [ID_1, note(ID_1, 'Texto 1')],
      [ID_2, note(ID_2, 'Texto 2')],
    ]),
    puts: [],
    posts: [],
    deletes: [],
    nextPutStatus: null,
    nextDeleteStatus: null,
    holdPut: null,
    holdDelete: null,
    nextGetStatus: null,
    holdGet: null,
    detailGets: [],
    recordingEnabled: false,
  }
  server.use(
    mock.get(CAPABILITIES_PATH, () =>
      HttpResponse.json({
        recordingEnabled: backend.recordingEnabled,
        reason: backend.recordingEnabled ? null : 'disabled',
        maxDurationSeconds: 600,
        maxAudioBytes: 20_971_520,
        maxTextLength: 50_000,
        mimeTypes: ['audio/webm'],
        language: 'es',
      }),
    ),
    mock.get(NOTES_PATH, () => {
      const content = [...backend.notes.values()].map((n) => ({
        id: n.id,
        excerpt: `Extracto ${n.text}`,
        revision: n.revision,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }))
      return HttpResponse.json({
        content,
        page: 0,
        size: 20,
        totalElements: content.length,
        totalPages: 1,
      })
    }),
    mock.get(NOTE_PATH, async ({ params }) => {
      backend.detailGets.push(String(params.id))
      if (backend.holdGet) await backend.holdGet
      if (backend.nextGetStatus != null) {
        const status = backend.nextGetStatus
        backend.nextGetStatus = null
        return problemResponse(status)
      }
      const found = backend.notes.get(String(params.id))
      return found ? HttpResponse.json(found) : problemResponse(404)
    }),
    mock.post(NOTES_PATH, async ({ request }) => {
      const body = (await request.json()) as { text: string }
      backend.posts.push(body)
      const created = note(ID_NEW, body.text)
      backend.notes.set(ID_NEW, created)
      return HttpResponse.json(created, { status: 201 })
    }),
    mock.put(NOTE_PATH, async ({ params, request }) => {
      const id = String(params.id)
      const body = (await request.json()) as { text: string; expectedRevision: number }
      backend.puts.push({ id, ...body })
      if (backend.holdPut) await backend.holdPut
      if (backend.nextPutStatus != null) {
        const status = backend.nextPutStatus
        backend.nextPutStatus = null
        return problemResponse(status)
      }
      const updated = note(id, body.text, body.expectedRevision + 1)
      backend.notes.set(id, updated)
      return HttpResponse.json(updated)
    }),
    mock.delete(NOTE_PATH, async ({ params, request }) => {
      const id = String(params.id)
      const expectedRevision = Number(new URL(request.url).searchParams.get('expectedRevision'))
      backend.deletes.push({ id, expectedRevision })
      if (backend.holdDelete) await backend.holdDelete
      if (backend.nextDeleteStatus != null) {
        const status = backend.nextDeleteStatus
        backend.nextDeleteStatus = null
        return problemResponse(status)
      }
      backend.notes.delete(id)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return backend
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthSessionContext value={session}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <VoiceDraftProvider>{children}</VoiceDraftProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthSessionContext>
    )
  }
  const user = userEvent.setup()
  render(<VoicePage />, { wrapper: Wrapper })
  return { user, queryClient }
}

/** `hidden: true` porque un diálogo modal abierto marca el resto de la página como aria-hidden. */
function textbox(): HTMLElement {
  return screen.getByRole('textbox', { name: 'Texto de la nota', hidden: true })
}

it('un stop con resultado dispara exactamente un POST de transcripción', async () => {
  const backend = installBackend()
  backend.recordingEnabled = true
  const post = vi.fn()
  server.use(
    mock.post('/api/v1/voice/transcriptions', () => {
      post()
      return HttpResponse.json({ text: 'Texto transcrito', language: 'es' })
    }),
  )
  const { user } = renderPage()
  await user.click(await screen.findByRole('button', { name: 'Grabar' }))
  await user.click(await screen.findByRole('button', { name: 'Detener y transcribir' }))
  await waitFor(() => expect(textbox()).toHaveValue('Texto transcrito'))
  expect(post).toHaveBeenCalledTimes(1)
})

async function openNote(user: ReturnType<typeof userEvent.setup>, excerpt: string, text: string) {
  await user.click(await screen.findByText(excerpt))
  await waitFor(() => expect(textbox()).toHaveValue(text))
}

async function editNote1(user: ReturnType<typeof userEvent.setup>) {
  await openNote(user, 'Extracto Texto 1', 'Texto 1')
  await user.type(textbox(), ' editado')
  expect(textbox()).toHaveValue('Texto 1 editado')
}

describe('VoicePage', () => {
  let backend: Backend

  beforeEach(() => {
    recorderMock.state = 'idle'
    backend = installBackend()
  })

  it('selecciona una nota sin cambios directamente, sin diálogo', async () => {
    const { user } = renderPage()

    await openNote(user, 'Extracto Texto 1', 'Texto 1')
    await openNote(user, 'Extracto Texto 2', 'Texto 2')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  describe('cambios sin guardar al cambiar de nota (B-2)', () => {
    it('Guardar y continuar guarda el texto vigente y luego abre la nota pendiente', async () => {
      const { user } = renderPage()
      await editNote1(user)

      await user.click(screen.getByText('Extracto Texto 2'))
      const dialog = await screen.findByRole('dialog', { name: 'Cambios sin guardar' })
      await user.click(within(dialog).getByRole('button', { name: 'Guardar y continuar' }))

      await waitFor(() => expect(textbox()).toHaveValue('Texto 2'))
      expect(backend.puts).toEqual([{ id: ID_1, text: 'Texto 1 editado', expectedRevision: 1 }])
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('Guardar y continuar con 409 se queda en la nota actual y abre el conflicto', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 409

      await user.click(screen.getByText('Extracto Texto 2'))
      const dialog = await screen.findByRole('dialog', { name: 'Cambios sin guardar' })
      await user.click(within(dialog).getByRole('button', { name: 'Guardar y continuar' }))

      expect(await screen.findByRole('dialog', { name: 'Conflicto de edición' })).toBeVisible()
      expect(textbox()).toHaveValue('Texto 1 editado')
      expect(backend.puts).toHaveLength(1)
    })

    it('Guardar y continuar con error de servidor conserva borrador y nota actual', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 500

      await user.click(screen.getByText('Extracto Texto 2'))
      const dialog = await screen.findByRole('dialog', { name: 'Cambios sin guardar' })
      await user.click(within(dialog).getByRole('button', { name: 'Guardar y continuar' }))

      expect(await screen.findByText(/No se pudieron guardar los cambios/)).toBeVisible()
      expect(textbox()).toHaveValue('Texto 1 editado')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('Descartar y continuar abre la nota pendiente sin guardar', async () => {
      const { user } = renderPage()
      await editNote1(user)

      await user.click(screen.getByText('Extracto Texto 2'))
      const dialog = await screen.findByRole('dialog', { name: 'Cambios sin guardar' })
      await user.click(within(dialog).getByRole('button', { name: 'Descartar y continuar' }))

      await waitFor(() => expect(textbox()).toHaveValue('Texto 2'))
      expect(backend.puts).toHaveLength(0)
    })

    it('Cancelar conserva la nota actual y el borrador', async () => {
      const { user } = renderPage()
      await editNote1(user)

      await user.click(screen.getByText('Extracto Texto 2'))
      const dialog = await screen.findByRole('dialog', { name: 'Cambios sin guardar' })
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(textbox()).toHaveValue('Texto 1 editado')
      expect(backend.puts).toHaveLength(0)
    })

    it('Nueva nota con cambios pide resolver y Descartar deja un borrador vacío', async () => {
      const { user } = renderPage()
      await editNote1(user)

      await user.click(screen.getByRole('button', { name: 'Nueva nota' }))
      const dialog = await screen.findByRole('dialog', { name: 'Cambios sin guardar' })
      await user.click(within(dialog).getByRole('button', { name: 'Descartar y continuar' }))

      await waitFor(() => expect(textbox()).toHaveValue(''))
      expect(screen.queryByText(/Revisión/)).not.toBeInTheDocument()
      expect(backend.puts).toHaveLength(0)
    })
  })

  describe('conflicto de revisión 409 (B-1)', () => {
    it('Guardar con 409 abre el diálogo de conflicto y conserva el borrador', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 409

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      const dialog = await screen.findByRole('dialog', { name: 'Conflicto de edición' })
      expect(within(dialog).getByRole('button', { name: 'Copiar texto' })).toBeVisible()
      expect(within(dialog).getByRole('button', { name: 'Recargar nota' })).toBeVisible()
      expect(within(dialog).getByRole('button', { name: 'Nueva nota' })).toBeVisible()
      expect(textbox()).toHaveValue('Texto 1 editado')
      // Sin reintento automático.
      expect(backend.puts).toHaveLength(1)
    })

    it('Recargar pide confirmación y solo entonces carga la versión del servidor', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.notes.set(ID_1, note(ID_1, 'Texto remoto', 2))
      backend.nextPutStatus = 409
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      const dialog = await screen.findByRole('dialog', { name: 'Conflicto de edición' })

      await user.click(within(dialog).getByRole('button', { name: 'Recargar nota' }))
      expect(within(dialog).getByText(/Se descartará tu borrador/)).toBeVisible()
      await user.click(within(dialog).getByRole('button', { name: 'Volver' }))
      expect(textbox()).toHaveValue('Texto 1 editado')

      await user.click(within(dialog).getByRole('button', { name: 'Recargar nota' }))
      await user.click(within(dialog).getByRole('button', { name: 'Descartar y recargar' }))

      await waitFor(() => expect(textbox()).toHaveValue('Texto remoto'))
      expect(screen.getByText('Revisión 2')).toBeVisible()
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Conflicto de edición' }),
        ).not.toBeInTheDocument(),
      )
    })

    it('Nueva nota desde el conflicto guarda ese texto como nota nueva', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 409
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      const dialog = await screen.findByRole('dialog', { name: 'Conflicto de edición' })

      await user.click(within(dialog).getByRole('button', { name: 'Nueva nota' }))
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Conflicto de edición' }),
        ).not.toBeInTheDocument(),
      )
      expect(textbox()).toHaveValue('Texto 1 editado')

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => expect(backend.posts).toEqual([{ text: 'Texto 1 editado' }]))
      expect(backend.puts).toHaveLength(1)
      expect(backend.notes.get(ID_1)?.text).toBe('Texto 1')
    })

    it('Borrar con 409 abre el diálogo de conflicto y conserva la nota', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      backend.nextDeleteStatus = 409

      await user.click(screen.getByRole('button', { name: 'Borrar' }))
      const confirm = await screen.findByRole('dialog', { name: 'Eliminar nota' })
      await user.click(within(confirm).getByRole('button', { name: 'Confirmar' }))

      expect(await screen.findByRole('dialog', { name: 'Conflicto de edición' })).toBeVisible()
      expect(textbox()).toHaveValue('Texto 1')
      expect(backend.deletes).toEqual([{ id: ID_1, expectedRevision: 1 }])
    })

    it('un error que no es 409 muestra error y no abre el conflicto', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 500

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText(/No se pudieron guardar los cambios/)).toBeVisible()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(textbox()).toHaveValue('Texto 1 editado')
    })
  })

  describe('respuestas tardías de guardado/borrado (4.ª revisión B-1)', () => {
    it('con un guardado en vuelo no se puede cambiar de nota ni crear otra, y el ACK no pisa otra nota', async () => {
      const { user } = renderPage()
      await editNote1(user)
      const put = hold()
      backend.holdPut = put.promise

      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      await waitFor(() => expect(backend.puts).toHaveLength(1))

      expect(screen.getByRole('button', { name: 'Nueva nota' })).toBeDisabled()
      expect(screen.getByText('Extracto Texto 2').closest('[role="button"]')).toHaveAttribute(
        'aria-disabled',
        'true',
      )

      put.release()
      await waitFor(() => expect(screen.getByText('Revisión 2')).toBeVisible())
      expect(textbox()).toHaveValue('Texto 1 editado')

      await user.click(screen.getByRole('button', { name: 'Nueva nota' }))
      await waitFor(() => expect(textbox()).toHaveValue(''))
      await user.type(textbox(), 'Nota totalmente distinta')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => expect(backend.posts).toEqual([{ text: 'Nota totalmente distinta' }]))
      expect(backend.puts).toEqual([{ id: ID_1, text: 'Texto 1 editado', expectedRevision: 1 }])
      expect(backend.notes.get(ID_1)?.text).toBe('Texto 1 editado')
    })

    it('con un borrado en vuelo no se puede cambiar de nota y el 204 no vacía otra nota', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      const del = hold()
      backend.holdDelete = del.promise

      await user.click(screen.getByRole('button', { name: 'Borrar' }))
      const confirm = await screen.findByRole('dialog', { name: 'Eliminar nota' })
      await user.click(within(confirm).getByRole('button', { name: 'Confirmar' }))
      await waitFor(() => expect(backend.deletes).toHaveLength(1))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      expect(screen.getByRole('button', { name: 'Nueva nota' })).toBeDisabled()
      expect(screen.getByText('Extracto Texto 2').closest('[role="button"]')).toHaveAttribute(
        'aria-disabled',
        'true',
      )

      del.release()
      await waitFor(() => expect(textbox()).toHaveValue(''))
      await waitFor(() => expect(screen.queryByText('Extracto Texto 1')).not.toBeInTheDocument())

      await openNote(user, 'Extracto Texto 2', 'Texto 2')
      expect(backend.notes.get(ID_2)?.text).toBe('Texto 2')
    })
  })

  describe('negativos de borrado (4.ª revisión B-2)', () => {
    it('Cancelar el borrado no llama a la API y conserva la nota', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')

      await user.click(screen.getByRole('button', { name: 'Borrar' }))
      const confirm = await screen.findByRole('dialog', { name: 'Eliminar nota' })
      await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(backend.deletes).toEqual([])
      expect(textbox()).toHaveValue('Texto 1')
      expect(screen.getByText('Revisión 1')).toBeVisible()
    })

    it('404 al borrar conserva el texto como borrador nuevo y Guardar hace POST', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      backend.nextDeleteStatus = 404

      await user.click(screen.getByRole('button', { name: 'Borrar' }))
      const confirm = await screen.findByRole('dialog', { name: 'Eliminar nota' })
      await user.click(within(confirm).getByRole('button', { name: 'Confirmar' }))

      expect(await screen.findByText(/La nota ya no existe/)).toBeVisible()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(textbox()).toHaveValue('Texto 1')
      expect(screen.queryByText(/Revisión/)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      await waitFor(() => expect(backend.posts).toEqual([{ text: 'Texto 1' }]))
      expect(backend.puts).toHaveLength(0)
    })

    it('error 500 al borrar muestra aviso y conserva nota y texto', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      backend.nextDeleteStatus = 500

      await user.click(screen.getByRole('button', { name: 'Borrar' }))
      const confirm = await screen.findByRole('dialog', { name: 'Eliminar nota' })
      await user.click(within(confirm).getByRole('button', { name: 'Confirmar' }))

      expect(await screen.findByText('No se pudo borrar la nota.')).toBeVisible()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(textbox()).toHaveValue('Texto 1')
      expect(screen.getByText('Revisión 1')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Borrar' })).toBeEnabled()
      expect(backend.notes.has(ID_1)).toBe(true)
      expect(screen.getByText('Extracto Texto 1')).toBeVisible()
    })
  })

  describe('observaciones de la 4.ª revisión', () => {
    it('O-1: PUT con 404 desvincula la nota, avisa y el siguiente Guardar hace POST', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 404

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText(/La nota ya no existe/)).toBeVisible()
      expect(textbox()).toHaveValue('Texto 1 editado')
      expect(screen.queryByText(/Revisión/)).not.toBeInTheDocument()
      expect(screen.queryByText(/No se pudieron guardar los cambios/)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      await waitFor(() => expect(backend.posts).toEqual([{ text: 'Texto 1 editado' }]))
      expect(backend.puts).toHaveLength(1)
    })

    it('O-2: mientras carga la nota el editor está bloqueado y avisa', async () => {
      const { user } = renderPage()
      const get = hold()
      backend.holdGet = get.promise

      await user.click(await screen.findByText('Extracto Texto 1'))

      expect(await screen.findByText('Cargando nota…')).toBeVisible()
      expect(textbox()).toBeDisabled()

      get.release()
      await waitFor(() => expect(textbox()).toHaveValue('Texto 1'))
      expect(textbox()).toBeEnabled()
      expect(screen.queryByText('Cargando nota…')).not.toBeInTheDocument()
    })

    it('O-2: si falla abrir la nota avisa, conserva el editor y Reintentar la carga', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      backend.nextGetStatus = 500

      await user.click(screen.getByText('Extracto Texto 2'))

      const alert = await screen.findByText(/No se pudo abrir la nota/)
      expect(alert).toBeVisible()
      expect(textbox()).toHaveValue('Texto 1')

      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      await waitFor(() => expect(textbox()).toHaveValue('Texto 2'))
      expect(screen.queryByText(/No se pudo abrir la nota/)).not.toBeInTheDocument()
    })

    it('O-3: Copiar texto en el conflicto informa éxito y fallo', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 409
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      const dialog = await screen.findByRole('dialog', { name: 'Conflicto de edición' })

      await user.click(within(dialog).getByRole('button', { name: 'Copiar texto' }))
      expect(await within(dialog).findByText('Texto copiado al portapapeles.')).toBeVisible()
      await expect(navigator.clipboard.readText()).resolves.toBe('Texto 1 editado')

      const failing = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockRejectedValue(new Error('denied'))
      await user.click(within(dialog).getByRole('button', { name: 'Copiar texto' }))
      expect(await within(dialog).findByText(/No se pudo copiar/)).toBeVisible()
      expect(within(dialog).queryByText('Texto copiado al portapapeles.')).not.toBeInTheDocument()
      failing.mockRestore()
    })

    it('O-4: «Nota guardada correctamente» solo tras guardar, no al abrir', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      expect(screen.queryByText('Nota guardada correctamente.')).not.toBeInTheDocument()

      await user.type(textbox(), ' editado')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(await screen.findByText('Nota guardada correctamente.')).toBeVisible()

      await openNote(user, 'Extracto Texto 2', 'Texto 2')
      expect(screen.queryByText('Nota guardada correctamente.')).not.toBeInTheDocument()
    })
  })

  describe('5.ª revisión', () => {
    it('B-1: tras borrar con 204 no se vuelve a pedir la nota ni aparece «No se pudo abrir la nota»', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')

      await user.click(screen.getByRole('button', { name: 'Borrar' }))
      const confirm = await screen.findByRole('dialog', { name: 'Eliminar nota' })
      const getsBeforeDelete = backend.detailGets.length
      await user.click(within(confirm).getByRole('button', { name: 'Confirmar' }))

      await waitFor(() => expect(textbox()).toHaveValue(''))
      await waitFor(() => expect(screen.queryByText('Extracto Texto 1')).not.toBeInTheDocument())
      expect(screen.queryByText(/No se pudo abrir la nota/)).not.toBeInTheDocument()
      expect(backend.detailGets.slice(getsBeforeDelete)).not.toContain(ID_1)
    })

    it('B-1: tras un PUT con 404 la nota deja de estar seleccionada y no se vuelve a pedir', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 404
      const getsBeforeSave = backend.detailGets.length

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText(/La nota ya no existe/)).toBeVisible()
      await waitFor(() =>
        expect(screen.getByText('Extracto Texto 1').closest('[role="button"]')).not.toHaveClass(
          'Mui-selected',
        ),
      )
      expect(screen.queryByText(/No se pudo abrir la nota/)).not.toBeInTheDocument()
      expect(backend.detailGets.slice(getsBeforeSave)).not.toContain(ID_1)
    })

    it('B-2: con una grabación en curso no se puede abrir otra nota ni crear una nueva', async () => {
      recorderMock.state = 'recording'
      renderPage()

      const row = (await screen.findByText('Extracto Texto 1')).closest('[role="button"]')
      await waitFor(() => expect(row).toHaveAttribute('aria-disabled', 'true'))
      expect(screen.getByRole('button', { name: 'Nueva nota' })).toBeDisabled()
      expect(backend.detailGets).toHaveLength(0)
    })
  })

  describe('6.ª revisión', () => {
    it('B-1: una nota nueva guardada aparece en la lista', async () => {
      const { user } = renderPage()
      await screen.findByText('Extracto Texto 1')

      await user.type(textbox(), 'Nota recién creada')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText('Extracto Nota recién creada')).toBeVisible()
    })

    it('B-1: el extracto se actualiza tras corregir una nota', async () => {
      const { user } = renderPage()
      await editNote1(user)

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText('Extracto Texto 1 editado')).toBeVisible()
      expect(screen.queryByText('Extracto Texto 1')).not.toBeInTheDocument()
    })

    it('B-2: mientras carga otra nota no se ofrece Grabar', async () => {
      backend.recordingEnabled = true
      const { user } = renderPage()
      expect(await screen.findByRole('button', { name: 'Grabar' })).toBeVisible()
      const get = hold()
      backend.holdGet = get.promise

      await user.click(screen.getByText('Extracto Texto 1'))

      expect(await screen.findByText('Cargando nota…')).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Grabar' })).not.toBeInTheDocument()
      get.release()
      await waitFor(() => expect(textbox()).toHaveValue('Texto 1'))
      expect(screen.queryByRole('button', { name: 'Grabar' })).not.toBeInTheDocument()
    })

    it('B-2: si falla abrir la nota el editor queda bloqueado y no se ofrece Grabar', async () => {
      backend.recordingEnabled = true
      const { user } = renderPage()
      expect(await screen.findByRole('button', { name: 'Grabar' })).toBeVisible()
      backend.nextGetStatus = 500

      await user.click(screen.getByText('Extracto Texto 1'))

      expect(await screen.findByText(/No se pudo abrir la nota/)).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Grabar' })).not.toBeInTheDocument()
      expect(textbox()).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    })

    it('observación: tras un 404 la nota inexistente desaparece de la lista', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.notes.delete(ID_1)
      backend.nextPutStatus = 404

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText(/La nota ya no existe/)).toBeVisible()
      await waitFor(() => expect(screen.queryByText('Extracto Texto 1')).not.toBeInTheDocument())
      expect(textbox()).toHaveValue('Texto 1 editado')
    })
  })

  describe('auditoría propia tras la 6.ª revisión', () => {
    it('A-1: un error de validación no pasa a la nota que se abre después', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      await user.clear(textbox())
      expect(await screen.findByText(/al menos un carácter/)).toBeVisible()

      await user.click(screen.getByText('Extracto Texto 2'))
      const dialog = await screen.findByRole('dialog', { name: 'Cambios sin guardar' })
      await user.click(within(dialog).getByRole('button', { name: 'Descartar y continuar' }))

      await waitFor(() => expect(textbox()).toHaveValue('Texto 2'))
      expect(screen.queryByText(/al menos un carácter/)).not.toBeInTheDocument()
    })

    it('A-2: al reabrir una nota cambiada en otra sesión se carga la revisión nueva, no la cacheada', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      await openNote(user, 'Extracto Texto 2', 'Texto 2')
      backend.notes.set(ID_1, note(ID_1, 'Texto remoto', 2))

      await user.click(screen.getByText('Extracto Texto 1'))

      await waitFor(() => expect(textbox()).toHaveValue('Texto remoto'))
      expect(screen.getByText('Revisión 2')).toBeVisible()
    })

    it('A-3: «Nueva nota» desde el conflicto deja de seleccionar la nota anterior', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextPutStatus = 409
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      const dialog = await screen.findByRole('dialog', { name: 'Conflicto de edición' })

      await user.click(within(dialog).getByRole('button', { name: 'Nueva nota' }))

      await waitFor(() =>
        expect(screen.getByText('Extracto Texto 1').closest('[role="button"]')).not.toHaveClass(
          'Mui-selected',
        ),
      )
      expect(textbox()).toHaveValue('Texto 1 editado')
    })
  })

  describe('7.ª revisión', () => {
    it('B-1: una revisión nueva que llega durante el guardado no pisa la edición y el 409 abre el conflicto', async () => {
      const { user, queryClient } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      await openNote(user, 'Extracto Texto 2', 'Texto 2')
      backend.notes.set(ID_1, note(ID_1, 'Texto remoto', 2))
      const get = hold()
      backend.holdGet = get.promise

      // Detalle cacheado (revisión 1) mientras el refetch está retenido.
      await user.click(screen.getByText('Extracto Texto 1'))
      await waitFor(() => expect(textbox()).toHaveValue('Texto 1'))
      await user.type(textbox(), ' editado')
      const put = hold()
      backend.holdPut = put.promise
      backend.nextPutStatus = 409
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      await waitFor(() => expect(backend.puts).toHaveLength(1))

      get.release()
      // Espera a que la revisión 2 esté en caché (y por tanto llegue al composer).
      await waitFor(() =>
        expect(
          queryClient.getQueryData<VoiceNoteDetail>(voiceQueryKeys.detail(ID_1))?.revision,
        ).toBe(2),
      )
      expect(textbox()).toHaveValue('Texto 1 editado')
      put.release()

      expect(await screen.findByRole('dialog', { name: 'Conflicto de edición' })).toBeVisible()
      expect(textbox()).toHaveValue('Texto 1 editado')
    })

    it('B-1: una revisión nueva que llega durante el borrado no reemplaza la nota y el 409 abre el conflicto', async () => {
      const { user, queryClient } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      await openNote(user, 'Extracto Texto 2', 'Texto 2')
      backend.notes.set(ID_1, note(ID_1, 'Texto remoto', 2))
      const get = hold()
      backend.holdGet = get.promise

      await user.click(screen.getByText('Extracto Texto 1'))
      await waitFor(() => expect(textbox()).toHaveValue('Texto 1'))
      const del = hold()
      backend.holdDelete = del.promise
      backend.nextDeleteStatus = 409
      await user.click(screen.getByRole('button', { name: 'Borrar' }))
      const confirm = await screen.findByRole('dialog', { name: 'Eliminar nota' })
      await user.click(within(confirm).getByRole('button', { name: 'Confirmar' }))
      await waitFor(() => expect(backend.deletes).toHaveLength(1))

      get.release()
      // Espera a que la revisión 2 esté en caché (y por tanto llegue al composer).
      await waitFor(() =>
        expect(
          queryClient.getQueryData<VoiceNoteDetail>(voiceQueryKeys.detail(ID_1))?.revision,
        ).toBe(2),
      )
      expect(textbox()).toHaveValue('Texto 1')
      del.release()

      expect(await screen.findByRole('dialog', { name: 'Conflicto de edición' })).toBeVisible()
      expect(textbox()).toHaveValue('Texto 1')
    })

    it('O-1: un aviso de error de borrado no pasa a la nota que se abre después', async () => {
      const { user } = renderPage()
      await openNote(user, 'Extracto Texto 1', 'Texto 1')
      backend.nextDeleteStatus = 500
      await user.click(screen.getByRole('button', { name: 'Borrar' }))
      const confirm = await screen.findByRole('dialog', { name: 'Eliminar nota' })
      await user.click(within(confirm).getByRole('button', { name: 'Confirmar' }))
      expect(await screen.findByText('No se pudo borrar la nota.')).toBeVisible()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      await openNote(user, 'Extracto Texto 2', 'Texto 2')

      expect(screen.queryByText('No se pudo borrar la nota.')).not.toBeInTheDocument()
    })

    it('O-3: si falla el refetch de la nota ya abierta el editor sigue usable', async () => {
      const { user } = renderPage()
      await editNote1(user)
      backend.nextGetStatus = 500

      // El PUT correcto invalida el detalle; su refetch falla.
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(await screen.findByText('Nota guardada correctamente.')).toBeVisible()
      await waitFor(() => expect(backend.detailGets.filter((id) => id === ID_1)).toHaveLength(2))

      expect(screen.queryByText(/No se pudo abrir la nota/)).not.toBeInTheDocument()
      expect(textbox()).toBeEnabled()
    })
  })
})
