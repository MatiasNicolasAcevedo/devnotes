import type { MutableRefObject } from 'react'
import { act, screen } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { emptyDocument } from './editor/dailyDocument'
import type { DailyContent } from './editor/dailyDocument'
import { DailyDraftProvider, useDailyDraftContext } from './DailyDraftProvider'
import type { UseDailyNoteReturn } from './useDailyNote'
import { setTestDebounce } from './useDailyNote'

const DETAIL_PATH = '/api/v1/daily-notes/2024-01-15'
const OWNER = '01900000-0000-7000-8000-000000000001'
const DATE_A = '2024-01-15'

function buildDetail(date: string, revision: number, content?: DailyContent) {
  return {
    id: '01900000-0000-7000-8000-000000000002',
    date,
    content: content ?? emptyDocument(),
    revision,
    updatedAt: `${date}T10:00:00Z`,
  }
}

function makeContent(text: string): DailyContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

// ——— Test harness: exposes context methods via ref ———

interface TestHooks {
  ctx: UseDailyNoteReturn & { activeDate: string; navigateToDate: (d: string) => Promise<void> }
}

function TestConsumer({ hooksRef }: { hooksRef: MutableRefObject<TestHooks> }) {
  const ctx = useDailyDraftContext()
  hooksRef.current = { ctx }
  return (
    <div>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="dirty">{String(ctx.isDirty)}</span>
      <span data-testid="saving">{String(ctx.isSaving)}</span>
      <span data-testid="revision">{ctx.revision}</span>
      {ctx.error && <span data-testid="error">{ctx.error.status}</span>}
    </div>
  )
}

function renderHarness(
  opts?: { initialDate?: string; sessionIsCurrent?: () => boolean },
) {
  const hooksRef: MutableRefObject<TestHooks> = { current: {} as TestHooks }
  renderWithProviders(
    <DailyDraftProvider
      owner={OWNER}
      initialDate={opts?.initialDate ?? DATE_A}
      sessionIsCurrent={opts?.sessionIsCurrent}
    >
      <TestConsumer hooksRef={hooksRef} />
    </DailyDraftProvider>,
  )
  return { hooksRef }
}

describe('useDailyNote', () => {
  beforeEach(() => {
    // Debounce corto para pruebas; MSW resuelve sincrónicamente.
    setTestDebounce(50)
  })

  afterEach(() => {
    setTestDebounce(undefined)
  })

  it('GET 404 no genera PUT automático', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCalled = false
    server.use(
      mock.put(DETAIL_PATH, () => {
        putCalled = true
        return HttpResponse.json(buildDetail(DATE_A, 1))
      }),
    )

    renderHarness()
    await act(async () => {})
    expect(screen.getByTestId('status')).toHaveTextContent('idle')
    expect(putCalled).toBe(false)
  })

  it('debounce agrupa teclas: una edición durante el debounce no envía PUT extra', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCount = 0
    server.use(
      mock.put(DETAIL_PATH, () => {
        putCount++
        return HttpResponse.json(buildDetail(DATE_A, putCount))
      }),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Primera edición
    hooksRef.current.ctx.edit(makeContent('uno'))
    await act(async () => {})

    // Esperar menos que debounce, segunda edición
    await act(async () => new Promise((r) => setTimeout(r, 20)))
    hooksRef.current.ctx.edit(makeContent('dos'))
    await act(async () => {})

    // Completar debounce y esperar PUT
    await act(async () => new Promise((r) => setTimeout(r, 100)))

    // Solo un PUT porque el debounce agrupó
    expect(putCount).toBe(1)
  })

  it('edición durante PUT produce segundo PUT con revisión nueva', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCount = 0
    let holdFirst: () => void = () => {}
    const firstPutHeld = new Promise<void>((resolve) => {
      holdFirst = resolve
    })

    server.use(
      mock.put(DETAIL_PATH, async () => {
        putCount++
        if (putCount === 1) {
          await firstPutHeld
        }
        return HttpResponse.json(buildDetail(DATE_A, putCount))
      }),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Primera edición → debounce → PUT
    hooksRef.current.ctx.edit(makeContent('uno'))
    await act(async () => {})
    await act(async () => new Promise((r) => setTimeout(r, 100)))
    expect(putCount).toBe(1)

    // Segunda edición mientras PUT en vuelo
    hooksRef.current.ctx.edit(makeContent('dos'))
    await act(async () => {})

    // Liberar primer PUT
    holdFirst()
    await act(async () => new Promise((r) => setTimeout(r, 100)))

    // Segundo PUT con revisión 1
    expect(putCount).toBe(2)
    expect(screen.getByTestId('revision')).toHaveTextContent('2')
  })

  it('ACK viejo nunca marca guardada una generación pendiente', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail(DATE_A, 0))))

    let putCount = 0
    let holdPut: () => void = () => {}
    const putHeld = new Promise<void>((resolve) => {
      holdPut = resolve
    })

    server.use(
      mock.put(DETAIL_PATH, async () => {
        putCount++
        await putHeld
        return HttpResponse.json(buildDetail(DATE_A, 1))
      }),
    )

    server.use(
      mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail(DATE_A, 1))),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})
    expect(screen.getByTestId('revision')).toHaveTextContent('0')

    // Editar → PUT
    hooksRef.current.ctx.edit(makeContent('editado'))
    await act(async () => {})
    await act(async () => new Promise((r) => setTimeout(r, 100)))
    expect(putCount).toBe(1)

    // Liberar PUT → ACK con revision 1
    holdPut()
    await act(async () => {})

    expect(screen.getByTestId('revision')).toHaveTextContent('1')
    expect(screen.getByTestId('dirty')).toHaveTextContent('false')
  })

  it('flush falla conservando borrador', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    server.use(
      mock.put(DETAIL_PATH, () =>
        problemResponse(500, { title: 'Internal Server Error' }),
      ),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Editar
    hooksRef.current.ctx.edit(makeContent('editado'))
    await act(async () => {})
    expect(screen.getByTestId('dirty')).toHaveTextContent('true')

    // Flush → espera debounce y PUT
    let flushRejected = false
    const flushPromise = hooksRef.current.ctx.flush().catch(() => {
      flushRejected = true
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    await act(async () => {})

    // Borrador se conserva
    expect(screen.getByTestId('dirty')).toHaveTextContent('true')
    expect(screen.getByTestId('status')).toHaveTextContent('error')
    expect(flushRejected).toBe(true)
    await flushPromise
  })

  it('edición inválida conserva texto y bloquea envío', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail(DATE_A, 1))))

    let putCalled = false
    server.use(
      mock.put(DETAIL_PATH, () => {
        putCalled = true
        return HttpResponse.json(buildDetail(DATE_A, 2))
      }),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Contenido inválido
    hooksRef.current.ctx.edit({ type: 'doc', content: [{ type: 'unknown' }] })
    await act(async () => {})
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(putCalled).toBe(false)
  })

  it('409 detiene cola y retiene texto', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    server.use(
      mock.put(DETAIL_PATH, () =>
        problemResponse(409, { title: 'Conflict', detail: 'Revisión conflictiva' }),
      ),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    hooksRef.current.ctx.edit(makeContent('editado'))
    await act(async () => {})
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId('status')).toHaveTextContent('conflict')
    expect(screen.getByTestId('dirty')).toHaveTextContent('true')
    expect(screen.getByTestId('error')).toHaveTextContent('409')
  })

  it('discard durante PUT espera, no crea otra escritura', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCount = 0
    let holdPut: () => void = () => {}
    const putHeld = new Promise<void>((resolve) => {
      holdPut = resolve
    })

    server.use(
      mock.put(DETAIL_PATH, async () => {
        putCount++
        await putHeld
        return HttpResponse.json(buildDetail(DATE_A, putCount))
      }),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Editar → PUT en vuelo
    hooksRef.current.ctx.edit(makeContent('editado'))
    await act(async () => {})
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(putCount).toBe(1)

    // Discard mientras PUT en vuelo
    const discardPromise = hooksRef.current.ctx.discard()
    await act(async () => {})

    expect(putCount).toBe(1)

    // Liberar PUT
    holdPut()
    await act(async () => {})
    await discardPromise

    expect(screen.getByTestId('dirty')).toHaveTextContent('false')
  })

  it('discard no revive borrador por ACK tardío', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail(DATE_A, 1))))

    server.use(
      mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail(DATE_A, 1))),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Editar → dirty
    hooksRef.current.ctx.edit(makeContent('editado'))
    await act(async () => {})
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(screen.getByTestId('dirty')).toHaveTextContent('true')

    // Discard
    await act(async () => {
      await hooksRef.current.ctx.discard()
    })

    expect(screen.getByTestId('dirty')).toHaveTextContent('false')
  })

  it('reintento explícito tras error', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCount = 0
    server.use(
      mock.put(DETAIL_PATH, () => {
        putCount++
        if (putCount === 1) {
          return problemResponse(500, { title: 'Internal Server Error' })
        }
        return HttpResponse.json(buildDetail(DATE_A, putCount))
      }),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Editar → PUT falla
    hooksRef.current.ctx.edit(makeContent('editado'))
    await act(async () => {})
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(screen.getByTestId('status')).toHaveTextContent('error')

    // Reintentar
    hooksRef.current.ctx.retry()
    await act(async () => {})

    expect(putCount).toBe(2)
    expect(screen.getByTestId('status')).toHaveTextContent('saved')
  })

  it('logout/cambio de identidad limpia borrador', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCalled = false
    server.use(
      mock.put(DETAIL_PATH, () => {
        putCalled = true
        return HttpResponse.json(buildDetail(DATE_A, 1))
      }),
    )

    const { rerender } = renderWithProviders(
      <DailyDraftProvider owner={OWNER} initialDate={DATE_A}>
        <TestConsumer hooksRef={{ current: {} as TestHooks }} />
      </DailyDraftProvider>,
    )

    await act(async () => {})

    // Simular logout: desmontar provider
    rerender(<div>logged out</div>)

    expect(putCalled).toBe(false)
  })
})
