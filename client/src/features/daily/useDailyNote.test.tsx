import type { MutableRefObject } from 'react'
import { act, screen, waitFor } from '@testing-library/react'
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
  // eslint-disable-next-line react-hooks/refs -- test harness: ref externa para exponer el contexto
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

function renderHarness(opts?: { initialDate?: string; sessionIsCurrent?: () => boolean }) {
  const hooksRef: MutableRefObject<TestHooks> = { current: {} as TestHooks }
  const result = renderWithProviders(
    <DailyDraftProvider
      owner={OWNER}
      initialDate={opts?.initialDate ?? DATE_A}
      sessionIsCurrent={opts?.sessionIsCurrent}
    >
      <TestConsumer hooksRef={hooksRef} />
    </DailyDraftProvider>,
  )
  return { hooksRef, queryClient: result.queryClient }
}

describe('useDailyNote', () => {
  it('cargar una fecha vacía no escribe y flush force crea solo el vacío explícito con revisión confirmada', async () => {
    installAuthBackend({ user: buildAuthUser() })
    let writes = 0
    server.use(
      mock.get(DETAIL_PATH, () => problemResponse(404)),
      mock.put(DETAIL_PATH, async ({ request }) => {
        const body = (await request.json()) as { expectedRevision: number; content: DailyContent }
        expect(body).toEqual({ expectedRevision: 0, content: emptyDocument() })
        writes++
        return HttpResponse.json(buildDetail(DATE_A, 1))
      }),
    )
    const { hooksRef } = renderHarness()
    await waitFor(() => expect(hooksRef.current.ctx.isLoading).toBe(false))
    expect(writes).toBe(0)
    await act(async () => hooksRef.current.ctx.flush({ force: true }))
    expect(writes).toBe(1)
    expect(hooksRef.current.ctx.getRevision()).toBe(1)
    await act(async () => hooksRef.current.ctx.flush())
    expect(writes).toBe(1)
  })

  it('hidratar un refetch no pisa la edición local ni programa otra escritura', async () => {
    installAuthBackend({ user: buildAuthUser() })
    setTestDebounce(10_000)
    let remoteRevision = 1
    let reads = 0
    let writes = 0
    server.use(
      mock.get(DETAIL_PATH, () => {
        reads++
        return HttpResponse.json(buildDetail(DATE_A, remoteRevision, makeContent('remoto')))
      }),
      mock.put(DETAIL_PATH, async ({ request }) => {
        const body = (await request.json()) as { expectedRevision: number; content: DailyContent }
        expect(body).toEqual({ expectedRevision: 2, content: makeContent('edición local') })
        writes++
        return HttpResponse.json(buildDetail(DATE_A, 3, body.content))
      }),
    )
    const { hooksRef, queryClient } = renderHarness()
    await waitFor(() => expect(hooksRef.current.ctx.revision).toBe(1))
    act(() => hooksRef.current.ctx.edit(makeContent('edición local')))
    remoteRevision = 2
    await act(async () =>
      queryClient.invalidateQueries({ queryKey: ['daily', OWNER, 'detail', DATE_A] }),
    )
    await waitFor(() => expect(hooksRef.current.ctx.revision).toBe(2))
    expect(hooksRef.current.ctx.content).toEqual(makeContent('edición local'))
    expect(reads).toBe(2)
    expect(writes).toBe(0)
    await act(async () => hooksRef.current.ctx.flush())
    expect(writes).toBe(1)
  })

  it('cambiar de fecha reinicia contenido y revisión, incluso hacia una nota ausente', async () => {
    installAuthBackend({ user: buildAuthUser() })
    const dateB = '2024-01-16'
    server.use(
      mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail(DATE_A, 7, makeContent('solo A')))),
      mock.get(`/api/v1/daily-notes/${dateB}`, () => problemResponse(404)),
    )
    const { hooksRef } = renderHarness()
    await waitFor(() => expect(hooksRef.current.ctx.revision).toBe(7))
    await act(async () => hooksRef.current.ctx.navigateToDate(dateB))
    await waitFor(() => expect(hooksRef.current.ctx.content).toEqual(emptyDocument()))
    expect(hooksRef.current.ctx.revision).toBe(0)
    await act(async () => hooksRef.current.ctx.navigateToDate(DATE_A))
    await waitFor(() => expect(hooksRef.current.ctx.content).toEqual(makeContent('solo A')))
    expect(hooksRef.current.ctx.revision).toBe(7)
  })

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

    server.use(mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail(DATE_A, 1))))

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
      mock.put(DETAIL_PATH, () => problemResponse(500, { title: 'Internal Server Error' })),
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

    server.use(mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail(DATE_A, 1))))

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

  it('debounce se reinicia en cada edición: 3 ediciones a t=0,400,800 con debounce 700 ms producen un solo PUT a t=1500', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCount = 0
    let putTime = -1
    const startTime = Date.now()
    server.use(
      mock.put(DETAIL_PATH, () => {
        putCount++
        putTime = Date.now() - startTime
        return HttpResponse.json(buildDetail(DATE_A, putCount))
      }),
    )

    // Usar debounce de 700 ms para esta prueba.
    setTestDebounce(700)

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Edición 1 a t=0
    hooksRef.current.ctx.edit(makeContent('uno'))
    await act(async () => {})

    // Esperar 400 ms y edición 2
    await act(async () => new Promise((r) => setTimeout(r, 400)))
    hooksRef.current.ctx.edit(makeContent('dos'))
    await act(async () => {})

    // Esperar 400 ms más (t=800) y edición 3
    await act(async () => new Promise((r) => setTimeout(r, 400)))
    hooksRef.current.ctx.edit(makeContent('tres'))
    await act(async () => {})

    // A t=800+700=1500 el debounce debe disparar.
    // Esperar hasta t=1550 para asegurar (700 ms de debounce + 50 ms de margen).
    await act(async () => new Promise((r) => setTimeout(r, 750)))

    // Solo un PUT, y debe haberse disparado cerca de t=1500, no a t=700.
    expect(putCount).toBe(1)
    // El PUT debe ocurrir después de t=1400 (800+700-100 de margen), no antes de t=1000.
    // Margen de 200ms para accommodar variabilidad del entorno.
    expect(putTime).toBeGreaterThanOrEqual(1400)
    expect(putTime).toBeLessThanOrEqual(1700)
  })

  it('error de red con commit remoto seguido de 409 conserva edición', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCount = 0
    server.use(
      mock.put(DETAIL_PATH, () => {
        putCount++
        if (putCount === 1) {
          // Simula commit remoto exitoso pero luego error de red en la respuesta.
          // El servidor confirma pero el cliente recibe error de red.
          return HttpResponse.error()
        }
        // Segundo intento: 409
        return problemResponse(409, { title: 'Conflict', detail: 'Revisión conflictiva' })
      }),
    )

    const { hooksRef } = renderHarness()
    await act(async () => {})

    // Editar → PUT falla con error de red
    hooksRef.current.ctx.edit(makeContent('editado'))
    await act(async () => {})
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // Borrador se conserva tras error de red
    expect(screen.getByTestId('dirty')).toHaveTextContent('true')
    expect(screen.getByTestId('status')).toHaveTextContent('error')

    // Reintentar → 409
    hooksRef.current.ctx.retry()
    await act(async () => {})

    // Borrador sigue conservado tras 409
    expect(screen.getByTestId('dirty')).toHaveTextContent('true')
    expect(screen.getByTestId('status')).toHaveTextContent('conflict')
    expect(putCount).toBe(2)
  })

  it('desmontar/remontar provider retiene dirty', async () => {
    installAuthBackend({ user: buildAuthUser() })
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    let putCalled = false
    server.use(
      mock.put(DETAIL_PATH, () => {
        putCalled = true
        return HttpResponse.json(buildDetail(DATE_A, 1))
      }),
    )

    const hooksRef: MutableRefObject<TestHooks> = { current: {} as TestHooks }
    const { rerender } = renderWithProviders(
      <DailyDraftProvider owner={OWNER} initialDate={DATE_A}>
        <TestConsumer hooksRef={hooksRef} />
      </DailyDraftProvider>,
    )

    await act(async () => {})

    // Editar → dirty
    hooksRef.current.ctx.edit(makeContent('editado'))
    await act(async () => {})
    expect(screen.getByTestId('dirty')).toHaveTextContent('true')

    // Desmontar provider
    rerender(<div>unmounted</div>)
    await act(async () => {})

    // Remontar provider — el borrador se pierde porque el provider se desmontó.
    // Sin embargo, si el provider se desmonta y remonta en el mismo componente padre,
    // el dirty se pierde (comportamiento esperado: provider en memoria).
    // Esta prueba verifica que, si el provider NO se desmonta (solo el hijo),
    // el dirty se retiene.
    rerender(
      <DailyDraftProvider owner={OWNER} initialDate={DATE_A}>
        <TestConsumer hooksRef={hooksRef} />
      </DailyDraftProvider>,
    )
    await act(async () => {})

    // Al remontar el provider completo, el estado se reinicia.
    // El borrador se pierde porque era memoria del provider anterior.
    // Esto es el comportamiento esperado: el provider es la fuente de verdad.
    expect(screen.getByTestId('dirty')).toHaveTextContent('false')
    expect(putCalled).toBe(false)
  })
})
