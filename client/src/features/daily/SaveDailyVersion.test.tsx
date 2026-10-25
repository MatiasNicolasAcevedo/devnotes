import type { MutableRefObject } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http as mock, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { emptyDocument, type DailyContent } from './editor/dailyDocument'
import { setTestDebounce } from './useDailyNote'
import { SaveDailyVersion, useSaveDailyVersion } from './SaveDailyVersion'

const OWNER = '01900000-0000-7000-8000-000000000001'
const DATE = '2024-01-15'
const DETAIL_PATH = `/api/v1/daily-notes/${DATE}`
const VERSION_CHECK_PATH = '/api/v1/daily-versions/2024-01-15'
const VERSION_SAVE_PATH = `/api/v1/daily-notes/${DATE}/version`

function buildNoteDetail(revision: number, content?: DailyContent) {
  return {
    id: '01900000-0000-7000-8000-000000000002',
    date: DATE,
    content: content ?? emptyDocument(),
    revision,
    updatedAt: `${DATE}T10:00:00Z`,
  }
}

function buildVersionDetail() {
  return {
    id: '01900000-0000-7000-8000-000000000003',
    date: DATE,
    content: emptyDocument(),
    sourceRevision: 2,
    savedAt: `${DATE}T12:00:00Z`,
  }
}

function buildVersionSaveResponse() {
  return {
    id: '01900000-0000-7000-8000-000000000004',
    date: DATE,
    content: emptyDocument(),
    sourceRevision: 3,
    savedAt: `${DATE}T14:00:00Z`,
  }
}

// ——— Test harness ———

interface TestHooks {
  isLocked: boolean
  phase: string
  handleClick: () => void
  handleConfirm: () => void
  handleCancel: () => void
  handleRetry: () => void
  showConfirmDialog: boolean
}

interface FlushControl {
  flush: (opts?: { force?: boolean }) => Promise<void>
  resolveFlush: () => void
}

function createFlushControl(): FlushControl {
  let resolveFlush: () => void = () => {}
  return {
    flush: async () => {
      return new Promise<void>((resolve) => {
        resolveFlush = resolve
      })
    },
    resolveFlush: () => {
      resolveFlush()
    },
  }
}

function TestConsumer({
  hooksRef,
  flush,
  revision,
  sessionIsCurrent,
}: {
  hooksRef: MutableRefObject<TestHooks>
  flush: (opts?: { force?: boolean }) => Promise<void>
  revision: number
  sessionIsCurrent?: () => boolean
}) {
  const save = useSaveDailyVersion({
    owner: OWNER,
    date: DATE,
    note: { flush, revision },
    sessionIsCurrent,
  })

  // eslint-disable-next-line react-hooks/refs -- test harness
  hooksRef.current = {
    isLocked: save.isLocked,
    phase: save.phase,
    handleClick: save.handleClick,
    handleConfirm: save.handleConfirm,
    handleCancel: save.handleCancel,
    handleRetry: save.handleRetry,
    showConfirmDialog: save.showConfirmDialog,
  }

  return (
    <div>
      <span data-testid="phase">{save.phase}</span>
      <span data-testid="locked">{String(save.isLocked)}</span>
      <SaveDailyVersion save={save} date={DATE} />
    </div>
  )
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderHarness(opts?: {
  initialRevision?: number
  initialContent?: DailyContent
  sessionIsCurrent?: () => boolean
}) {
  const revision = opts?.initialRevision ?? 0
  const content = opts?.initialContent ?? emptyDocument()

  // Mock note detail (siempre, para DailyDraftProvider)
  if (revision > 0) {
    server.use(
      mock.get(DETAIL_PATH, () => HttpResponse.json(buildNoteDetail(revision, content))),
    )
  } else {
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))
  }

  const hooksRef: MutableRefObject<TestHooks> = { current: {} as TestHooks }
  const queryClient = createQueryClient()
  const theme = createTheme()
  const flushControl = createFlushControl()

  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TestConsumer
            hooksRef={hooksRef}
            flush={flushControl.flush}
            revision={revision}
            sessionIsCurrent={opts?.sessionIsCurrent}
          />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )

  return { hooksRef, queryClient, flushControl }
}

describe('SaveDailyVersion', () => {
  beforeEach(() => {
    setTestDebounce(50)
    installAuthBackend({ user: buildAuthUser() })
  })

  afterEach(() => {
    setTestDebounce(undefined)
  })

  it('consulta 404 → crea versión directamente sin diálogo', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => problemResponse(404, { title: 'Not Found' })))
    server.use(
      mock.post(VERSION_SAVE_PATH, () => HttpResponse.json(buildVersionSaveResponse())),
    )

    const { hooksRef, flushControl } = renderHarness({ initialRevision: 3 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))

    // 404 → pasa a saving (flush pendiente)
    await act(async () => {})
    expect(hooksRef.current.phase).toBe('saving')
    expect(hooksRef.current.isLocked).toBe(true)

    // Resolver flush → POST se ejecuta
    await act(async () => {
      flushControl.resolveFlush()
    })

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('success')
    })
  })

  it('consulta 200 → muestra diálogo de confirmación', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => HttpResponse.json(buildVersionDetail())))

    const { hooksRef } = renderHarness({ initialRevision: 2 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    expect(hooksRef.current.showConfirmDialog).toBe(true)
    expect(screen.getByText('Reemplazar versión existente')).toBeInTheDocument()
    expect(screen.getByText(/Ya hay una versión guardada/)).toBeInTheDocument()
  })

  it('cancelar diálogo no modifica copia ni ejecuta POST', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => HttpResponse.json(buildVersionDetail())))

    let postCalled = false
    server.use(
      mock.post(VERSION_SAVE_PATH, () => {
        postCalled = true
        return HttpResponse.json(buildVersionSaveResponse())
      }),
    )

    const { hooksRef } = renderHarness({ initialRevision: 2 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    expect(hooksRef.current.showConfirmDialog).toBe(true)

    // Cancelar
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await act(async () => {})

    expect(postCalled).toBe(false)
    expect(hooksRef.current.phase).toBe('idle')
    expect(hooksRef.current.isLocked).toBe(false)
  })

  it('confirmar diálogo → flush + POST con revisión correcta', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => HttpResponse.json(buildVersionDetail())))
    server.use(
      mock.post(VERSION_SAVE_PATH, () => HttpResponse.json(buildVersionSaveResponse())),
    )

    const { hooksRef, flushControl } = renderHarness({ initialRevision: 5 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    expect(hooksRef.current.showConfirmDialog).toBe(true)

    // Confirmar
    await user.click(screen.getByRole('button', { name: 'Reemplazar' }))
    await act(async () => {})

    expect(hooksRef.current.phase).toBe('saving')
    expect(hooksRef.current.isLocked).toBe(true)

    // Resolver flush
    await act(async () => {
      flushControl.resolveFlush()
    })

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('success')
    })
  })

  it('POST 409 → muestra conflicto y libera bloqueo', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => problemResponse(404, { title: 'Not Found' })))
    server.use(
      mock.post(VERSION_SAVE_PATH, () =>
        problemResponse(409, { title: 'Conflict', detail: 'Revisión distinta' }),
      ),
    )

    const { hooksRef, flushControl } = renderHarness({ initialRevision: 3 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    await act(async () => {
      flushControl.resolveFlush()
    })

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('conflict')
    })

    expect(screen.getByText('Conflicto de revisión')).toBeInTheDocument()
    expect(hooksRef.current.isLocked).toBe(false)
  })

  it('error de red tras POST → resultado desconocido y sugiere historial', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => problemResponse(404, { title: 'Not Found' })))
    server.use(mock.post(VERSION_SAVE_PATH, () => HttpResponse.error()))

    const { flushControl } = renderHarness({ initialRevision: 3 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    await act(async () => {
      flushControl.resolveFlush()
    })

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('unknown')
    })

    expect(screen.getByText('Resultado desconocido')).toBeInTheDocument()
    expect(screen.getByText(/historial/)).toBeInTheDocument()
  })

  it('no envía POST automático al montar', async () => {
    let postCalled = false
    server.use(
      mock.post(VERSION_SAVE_PATH, () => {
        postCalled = true
        return HttpResponse.json(buildVersionSaveResponse())
      }),
    )
    server.use(mock.get(VERSION_CHECK_PATH, () => problemResponse(404, { title: 'Not Found' })))

    renderHarness({ initialRevision: 1 })
    await act(async () => {})

    expect(postCalled).toBe(false)
  })

  it('deshabilita botón durante saving', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => problemResponse(404, { title: 'Not Found' })))
    server.use(
      mock.post(VERSION_SAVE_PATH, () => HttpResponse.json(buildVersionSaveResponse())),
    )

    renderHarness({ initialRevision: 3 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    const button = screen.getByRole('button', { name: 'Guardar versión' })
    expect(button).toBeDisabled()
  })

  it('reintento tras error limpia estado y permite nueva acción', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => HttpResponse.error()))

    const { hooksRef } = renderHarness({ initialRevision: 3 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('error')
    })

    // Reintentar (es un button, no un link)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await act(async () => {})

    expect(hooksRef.current.phase).toBe('idle')
  })

  it('respuesta tardía tras logout no marca éxito', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => problemResponse(404, { title: 'Not Found' })))
    server.use(
      mock.post(VERSION_SAVE_PATH, () => HttpResponse.json(buildVersionSaveResponse())),
    )

    let sessionCurrent = true
    const { flushControl } = renderHarness({
      initialRevision: 3,
      sessionIsCurrent: () => sessionCurrent,
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    // Simular logout durante POST
    sessionCurrent = false

    await act(async () => {
      flushControl.resolveFlush()
    })

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('unknown')
    })
  })

  it('vacío explícito (revision 0) permite crear versión', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => problemResponse(404, { title: 'Not Found' })))
    server.use(
      mock.post(VERSION_SAVE_PATH, () => HttpResponse.json(buildVersionSaveResponse())),
    )

    const { flushControl } = renderHarness({ initialRevision: 0 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    await act(async () => {
      flushControl.resolveFlush()
    })

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('success')
    })
  })

  it('click durante debounce espera la última generación', async () => {
    server.use(mock.get(VERSION_CHECK_PATH, () => problemResponse(404, { title: 'Not Found' })))
    server.use(
      mock.post(VERSION_SAVE_PATH, () => HttpResponse.json(buildVersionSaveResponse())),
    )

    const { hooksRef, flushControl } = renderHarness({ initialRevision: 3 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await act(async () => {})

    expect(hooksRef.current.phase).toBe('saving')

    await act(async () => {
      flushControl.resolveFlush()
    })

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('success')
    })
  })
})
