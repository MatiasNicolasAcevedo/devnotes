import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http as mock, HttpResponse } from 'msw'
import { useState, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/AppProviders'
import { server } from '../../test/msw/server'
import { NARROW_VIEWPORT, setViewportWidth } from '../../test/viewport'
import { AuthSessionContext, type AuthSession } from '../auth/sessionContext'
import type { CaptureResult } from './recorder'
import { VoiceDraftProvider } from './VoiceDraftProvider'
import { FixedSpace } from '../../test/space'
import { VoicePage } from './VoicePage'

/*
 * Presentación de /voice (UI-07 y UI-08) con la página, la lista, el compositor y el borrador reales. Solo se
 * sustituye el grabador: su nivel y su aviso de silencio se prueban aparte, con un AudioContext simulado.
 */
const meter = vi.hoisted(() => ({
  levels: null as number[] | null,
  silent: false,
  stops: 0,
}))

vi.mock('./useVoiceRecorder', () => ({
  useVoiceRecorder: () => {
    const [recording, setRecording] = useState(false)
    const [result, setResult] = useState<CaptureResult | null>(null)
    return {
      state: recording ? 'recording' : 'idle',
      result,
      error: null,
      elapsedSeconds: recording ? 7 : 0,
      elapsedFormatted: recording ? '00:07' : '00:00',
      levels: recording ? meter.levels : null,
      silent: recording && meter.silent,
      cancel: () => setRecording(false),
      resetError: vi.fn(),
      consumeResult: () => setResult(null),
      start: () => setRecording(true),
      stop: () => {
        meter.stops++
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

const LONG =
  '🎙️ Esta es una nota de voz muy larga que antes ensanchaba la columna y rompía la pantalla: ' +
  'sigue y sigue con más detalle sobre la reunión, los pendientes y lo que quedó por revisar mañana.'
const EXCERPT = [...LONG].slice(0, 120).join('')
const NOTE_ID = '01900000-0000-7000-8000-000000000001'
const TIMESTAMP = '2026-11-01T12:00:00.000000Z'

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

function renderPage({ recordingEnabled = true, excerpt = EXCERPT, fullText = LONG } = {}) {
  const transcriptions = vi.fn()
  const detailRequests = vi.fn()
  server.use(
    mock.get('/api/v1/voice/capabilities', () =>
      HttpResponse.json({
        recordingEnabled,
        reason: recordingEnabled ? null : 'disabled',
        maxDurationSeconds: 600,
        maxAudioBytes: 20_971_520,
        maxTextLength: 50_000,
        mimeTypes: ['audio/webm'],
        language: 'es',
      }),
    ),
    mock.get('/api/v1/voice-notes', () =>
      HttpResponse.json({
        content: [
          {
            id: NOTE_ID,
            excerpt,
            revision: 1,
            createdAt: TIMESTAMP,
            updatedAt: TIMESTAMP,
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    ),
    mock.get(`/api/v1/voice-notes/${NOTE_ID}`, () => {
      detailRequests()
      return HttpResponse.json({
        id: NOTE_ID,
        text: fullText,
        revision: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      })
    }),
    mock.post('/api/v1/voice/transcriptions', () => {
      transcriptions()
      return HttpResponse.json({ text: 'Texto transcrito', language: 'es' })
    }),
  )
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthSessionContext value={session}>
        <AppProviders queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <FixedSpace space="work">
              <VoiceDraftProvider>{children}</VoiceDraftProvider>
            </FixedSpace>
          </QueryClientProvider>
        </AppProviders>
      </AuthSessionContext>
    )
  }
  const user = userEvent.setup()
  const view = render(<VoicePage />, { wrapper: Wrapper })
  return { user, transcriptions, detailRequests, ...view }
}

const composer = () => screen.getByRole('region', { name: 'Nueva nota' })
const library = () => screen.getByRole('region', { name: 'Notas guardadas' })
const bars = (container: HTMLElement) => container.querySelectorAll('[data-level-bar]')

beforeEach(() => {
  meter.levels = null
  meter.silent = false
  meter.stops = 0
})

describe('Voz en dos mitades (UI-07)', () => {
  it('en ancho: nueva nota a la izquierda y notas guardadas a la derecha, en dos columnas iguales', async () => {
    renderPage()
    await screen.findByText(EXCERPT)

    const grid = composer().parentElement
    expect(grid).toBe(library().parentElement)
    expect(grid).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    })
    expect(
      composer().compareDocumentPosition(library()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Notas de voz' })).toHaveStyle({
      position: 'absolute',
      width: '1px',
      height: '1px',
    })
  })

  it('en angosto se apilan en una sola columna, con la nueva nota primero', async () => {
    setViewportWidth(NARROW_VIEWPORT)
    renderPage()
    await screen.findByText(EXCERPT)

    expect(composer().parentElement).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
    })
    expect(
      composer().compareDocumentPosition(library()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('la columna izquierda ordena Grabar con «Nueva nota» al lado, el texto, Guardar y el aviso de Groq', async () => {
    renderPage()
    const record = await within(composer()).findByRole('button', { name: 'Grabar' })
    const newNote = within(composer()).getByRole('button', { name: 'Nueva nota' })
    const text = within(composer()).getByRole('textbox', { name: 'Texto de la nota' })
    const save = within(composer()).getByRole('button', { name: 'Guardar' })
    const groq = within(composer()).getByText(/Al detener, el audio se envía a Groq/)

    expect(record.parentElement).toBe(newNote.parentElement)
    expect(record).toHaveStyle({ minHeight: '44px' })
    const order = [record, newNote, text, save, groq]
    for (let index = 1; index < order.length; index++) {
      expect(
        order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })

  it('el aviso de Groq es una línea de texto con el mismo enlace, sin caja', async () => {
    renderPage()
    const groq = await within(composer()).findByText(/Al detener, el audio se envía a Groq/)

    expect(groq).toHaveTextContent('Al detener, el audio se envía a Groq. Ver política de Groq')
    const link = within(groq).getByRole('link', { name: 'Ver política de Groq' })
    expect(link).toHaveAttribute('href', 'https://console.groq.com/docs/your-data')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(groq.closest('[role="alert"]')).toBeNull()
    expect(groq.closest('.MuiAlert-root')).toBeNull()
  })

  it('sin grabación habilitada no se muestra el aviso de Groq', async () => {
    renderPage({ recordingEnabled: false })
    await screen.findByText(/La grabación de voz está deshabilitada/)

    expect(screen.queryByText(/Al detener, el audio se envía a Groq/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Grabar' })).not.toBeInTheDocument()
    expect(within(composer()).getByRole('button', { name: 'Nueva nota' })).toBeVisible()
  })

  it('una nota larga ocupa una línea con puntos suspensivos y el texto completo en title; la fecha no se corta', async () => {
    renderPage()
    const excerpt = await within(library()).findByText(EXCERPT)

    expect([...EXCERPT]).toHaveLength(120)
    expect([...LONG].length).toBeGreaterThan(120)
    await waitFor(() => expect(excerpt).toHaveAttribute('title', LONG))
    expect(excerpt).toHaveStyle({
      display: 'block',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    })
    const date = within(library()).getByText(/2026/)
    expect(date).toHaveStyle({ whiteSpace: 'nowrap' })
    expect(date).not.toHaveStyle({ textOverflow: 'ellipsis' })
  })

  it('usa el extracto como title sin pedir detalle cuando tiene menos de 120 puntos de código', async () => {
    const short = '🎙'.repeat(119)
    const { detailRequests } = renderPage({ excerpt: short, fullText: short })

    expect(await within(library()).findByText(short)).toHaveAttribute('title', short)
    expect(detailRequests).not.toHaveBeenCalled()
  })
})

describe('Señales de grabación (UI-08)', () => {
  it('antes de grabar no hay barras, cronómetro ni aviso de sonido', async () => {
    meter.levels = [0.2, 0.4, 0.6, 0.4, 0.2]
    meter.silent = true
    const { container } = renderPage()
    await within(composer()).findByRole('button', { name: 'Grabar' })

    expect(bars(container)).toHaveLength(0)
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByText(/No se detecta sonido/)).not.toBeInTheDocument()
  })

  it('al grabar el botón dice «Detener», corre el cronómetro y cinco barras decorativas muestran el nivel', async () => {
    meter.levels = [0.1, 0.5, 1, 0.5, 0.1]
    const { user, container } = renderPage()
    await user.click(await within(composer()).findByRole('button', { name: 'Grabar' }))

    const stop = await within(composer()).findByRole('button', { name: 'Detener y transcribir' })
    expect(stop).toHaveTextContent(/^Detener$/)
    expect(stop).toHaveStyle({ minHeight: '44px' })
    expect(stop).toHaveAttribute('data-recording', 'true')
    expect(within(composer()).queryByRole('button', { name: 'Grabar' })).not.toBeInTheDocument()
    const timer = within(composer()).getByRole('timer')
    expect(timer).toHaveTextContent('00:07')
    expect(timer.parentElement).toBe(stop.parentElement)

    const levelBars = bars(container)
    expect(levelBars).toHaveLength(5)
    expect(levelBars[0].parentElement).toHaveAttribute('aria-hidden', 'true')
    const heights = [...levelBars].map((bar) => parseFloat((bar as HTMLElement).style.height))
    expect(heights[2]).toBeGreaterThan(heights[1])
    expect(heights[1]).toBeGreaterThan(heights[0])
    expect(heights[2]).toBe(100)
    expect(screen.queryByText(/No se detecta sonido/)).not.toBeInTheDocument()
  })

  it('con silencio sostenido avisa con role="status" sin detener la grabación', async () => {
    meter.levels = [0, 0, 0, 0, 0]
    meter.silent = true
    const { user } = renderPage()
    await user.click(await within(composer()).findByRole('button', { name: 'Grabar' }))

    const warning = await screen.findByText('No se detecta sonido. Revisá el micrófono.')
    expect(warning.closest('[role="status"]')).not.toBeNull()
    expect(within(composer()).getByRole('button', { name: 'Detener y transcribir' })).toBeEnabled()
    expect(meter.stops).toBe(0)
  })

  it('sin AudioContext graba sin barras ni aviso', async () => {
    meter.levels = null
    const { user, container } = renderPage()
    await user.click(await within(composer()).findByRole('button', { name: 'Grabar' }))

    expect(await within(composer()).findByRole('timer')).toHaveTextContent('00:07')
    expect(bars(container)).toHaveLength(0)
    expect(screen.queryByText(/No se detecta sonido/)).not.toBeInTheDocument()
  })

  it('«Detener» envía una sola transcripción y retira las señales de grabación', async () => {
    meter.levels = [0.3, 0.3, 0.3, 0.3, 0.3]
    meter.silent = true
    const { user, container, transcriptions } = renderPage()
    await user.click(await within(composer()).findByRole('button', { name: 'Grabar' }))
    await user.click(
      await within(composer()).findByRole('button', { name: 'Detener y transcribir' }),
    )

    await waitFor(() =>
      expect(within(composer()).getByRole('textbox', { name: 'Texto de la nota' })).toHaveValue(
        'Texto transcrito',
      ),
    )
    expect(transcriptions).toHaveBeenCalledOnce()
    expect(meter.stops).toBe(1)
    expect(bars(container)).toHaveLength(0)
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByText(/No se detecta sonido/)).not.toBeInTheDocument()
  })

  it('«Cancelar grabación» sigue disponible y retira las señales sin transcribir', async () => {
    meter.levels = [0.3, 0.3, 0.3, 0.3, 0.3]
    const { user, container, transcriptions } = renderPage()
    await user.click(await within(composer()).findByRole('button', { name: 'Grabar' }))
    await user.click(await within(composer()).findByRole('button', { name: 'Cancelar grabación' }))

    expect(await within(composer()).findByRole('button', { name: 'Grabar' })).toBeVisible()
    expect(bars(container)).toHaveLength(0)
    expect(transcriptions).not.toHaveBeenCalled()
  })
})
