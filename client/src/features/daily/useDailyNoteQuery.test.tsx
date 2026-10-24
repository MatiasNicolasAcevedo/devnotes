import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { act, screen } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../services/http'
import { problemResponse } from '../../test/factories'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { dailyNoteKeys } from './api'
import { emptyDocument } from './editor/dailyDocument'
import { invalidateDailyNote, useDailyNoteQuery } from './useDailyNoteQuery'

const DETAIL_A = '/api/v1/daily-notes/2024-01-15'
const DETAIL_B = '/api/v1/daily-notes/2024-01-16'

function buildDetail(date: string, revision: number) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    date,
    content: emptyDocument(),
    revision,
    updatedAt: `${date}T10:00:00Z`,
  }
}

function wrapHook(owner: string, date: string, sessionIsCurrent?: () => boolean) {
  return function TestHook() {
    return useDailyNoteQuery(owner, date, sessionIsCurrent)
  }
}

describe('useDailyNoteQuery', () => {
  it('carga el detalle de la nota por fecha', async () => {
    const detail = buildDetail('2024-01-15', 1)
    server.use(mock.get(DETAIL_A, () => HttpResponse.json(detail)))

    renderWithProviders(<QueryResultConsumer hook={wrapHook('owner-a', '2024-01-15')} />)

    expect(await screen.findByText(/2024-01-15/)).toBeInTheDocument()
  })

  it('no ejecuta la query si sessionIsCurrent devuelve false', async () => {
    let called = false
    server.use(
      mock.get(DETAIL_A, () => {
        called = true
        return HttpResponse.json(buildDetail('2024-01-15', 1))
      }),
    )

    renderWithProviders(
      <QueryResultConsumer hook={wrapHook('owner-a', '2024-01-15', () => false)} />,
    )

    // La query no se ejecuta porque enabled es false
    await act(async () => {
      // Esperar un ciclo para confirmar que no hubo petición
    })
    expect(called).toBe(false)
    expect(screen.getByText('disabled')).toBeInTheDocument()
  })

  it('ejecuta la query si sessionIsCurrent devuelve true', async () => {
    const detail = buildDetail('2024-01-15', 1)
    server.use(mock.get(DETAIL_A, () => HttpResponse.json(detail)))

    renderWithProviders(
      <QueryResultConsumer hook={wrapHook('owner-a', '2024-01-15', () => true)} />,
    )

    expect(await screen.findByText(/2024-01-15/)).toBeInTheDocument()
  })

  it('distingue 404 de error de red', async () => {
    server.use(
      mock.get(DETAIL_A, () => problemResponse(404, { title: 'Not Found' })),
    )

    renderWithProviders(<QueryResultConsumer hook={wrapHook('owner-a', '2024-01-15')} />)

    const errorEl = await screen.findByRole('alert')
    expect(errorEl).toHaveTextContent('404')
  })

  it('no genera PUT automático ante 404', async () => {
    let putCalled = false
    server.use(
      mock.get(DETAIL_A, () => problemResponse(404, { title: 'Not Found' })),
      mock.put(DETAIL_A, () => {
        putCalled = true
        return HttpResponse.json(buildDetail('2024-01-15', 1))
      }),
    )

    renderWithProviders(<QueryResultConsumer hook={wrapHook('owner-a', '2024-01-15')} />)

    await screen.findByRole('alert')
    expect(putCalled).toBe(false)
  })

  it('cancela lectura previa al cambiar fecha', async () => {
    let releaseA: () => void = () => {}
    const heldA = new Promise<void>((resolve) => {
      releaseA = resolve
    })

    server.use(
      mock.get(DETAIL_A, async () => {
        await heldA
        return HttpResponse.json(buildDetail('2024-01-15', 1))
      }),
      mock.get(DETAIL_B, () => HttpResponse.json(buildDetail('2024-01-16', 2))),
    )

    const { rerender } = renderWithProviders(
      <QueryResultConsumer hook={wrapHook('owner-a', '2024-01-15')} />,
    )

    // Esperar que A esté en progreso
    await screen.findByText('loading')

    // Cambiar a B sin liberar A
    rerender(
      <QueryResultConsumer hook={wrapHook('owner-a', '2024-01-16')} />,
    )

    // B resuelve inmediatamente
    expect(await screen.findByText(/2024-01-16/)).toBeInTheDocument()

    // Liberar A tarde — su respuesta no se presenta
    releaseA()
    await act(async () => {
      // Dar tiempo a que A se resuelva y se descarte
    })

    // B sigue visible; A no lo reemplaza
    expect(screen.queryByText(/2024-01-15/)).not.toBeInTheDocument()
  })

  it('separa identidades A/B y no presenta respuesta de A en B', async () => {
    let releaseA: () => void = () => {}
    const heldA = new Promise<void>((resolve) => {
      releaseA = resolve
    })

    server.use(
      mock.get(DETAIL_A, async () => {
        await heldA
        return HttpResponse.json(buildDetail('2024-01-15', 1))
      }),
      mock.get(DETAIL_B, () => HttpResponse.json(buildDetail('2024-01-16', 2))),
    )

    const { rerender } = renderWithProviders(
      <QueryResultConsumer hook={wrapHook('owner-a', '2024-01-15')} />,
    )

    await screen.findByText('loading')

    // Cambiar identidad y fecha
    rerender(
      <QueryResultConsumer hook={wrapHook('owner-b', '2024-01-16')} />,
    )

    expect(await screen.findByText(/2024-01-16/)).toBeInTheDocument()

    // Liberar A — no afecta a B
    releaseA()
    await act(async () => {})

    expect(screen.queryByText(/2024-01-15/)).not.toBeInTheDocument()
  })

  it('no presenta respuesta tardía de A en B', async () => {
    let releaseA: () => void = () => {}
    const heldA = new Promise<void>((resolve) => {
      releaseA = resolve
    })

    // A devuelve revision 1, B devuelve revision 99
    server.use(
      mock.get(DETAIL_A, async () => {
        await heldA
        return HttpResponse.json(buildDetail('2024-01-15', 1))
      }),
      mock.get(DETAIL_B, () => HttpResponse.json(buildDetail('2024-01-16', 99))),
    )

    const { rerender } = renderWithProviders(
      <QueryResultConsumer hook={wrapHook('owner-a', '2024-01-15')} />,
    )

    await screen.findByText('loading')

    // Cambiar a B
    rerender(
      <QueryResultConsumer hook={wrapHook('owner-a', '2024-01-16')} />,
    )

    // B resuelve con revision 99
    expect(await screen.findByText(/99/)).toBeInTheDocument()

    // Liberar A con revision 1
    releaseA()
    await act(async () => {})

    // B sigue con 99; A no lo reemplaza
    expect(screen.getByText(/99/)).toBeInTheDocument()
    expect(screen.queryByText(/revision: 1/)).not.toBeInTheDocument()
  })
})

describe('invalidateDailyNote', () => {
  it('invalida detalle específico sin escribir cache con setQueryData', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const keys = dailyNoteKeys('owner-a')
    const detail = buildDetail('2024-01-15', 1)

    // Poblar cache
    queryClient.setQueryData(keys.detail('2024-01-15'), detail)
    expect(queryClient.getQueryData(keys.detail('2024-01-15'))).toEqual(detail)

    // Invalidar
    await invalidateDailyNote(queryClient, 'owner-a', '2024-01-15')

    // La query está marcada como stale
    const state = queryClient.getQueryState(keys.detail('2024-01-15'))
    expect(state?.isInvalidated).toBe(true)
  })

  it('invalida lista sin fecha', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const keys = dailyNoteKeys('owner-a')
    const listData = {
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    }

    queryClient.setQueryData(keys.list(), listData)
    await invalidateDailyNote(queryClient, 'owner-a')

    const state = queryClient.getQueryState(keys.list())
    expect(state?.isInvalidated).toBe(true)
  })
})

/** Componente auxiliar para renderizar el resultado del hook. */
function QueryResultConsumer({
  hook: Hook,
}: {
  hook: () => ReturnType<typeof useDailyNoteQuery>
}) {
  const result = Hook()
  const client = useQueryClient()

  if (result.isLoading) {
    return <div role="status">loading</div>
  }
  if (result.isPending && !result.isEnabled) {
    return <div>disabled</div>
  }
  if (result.isError) {
    const status = (result.error as ApiError).status ?? 'error'
    return <div role="alert">error: {status}</div>
  }
  if (result.data) {
    return (
      <div>
        <span>{result.data.date}</span>
        <span> revision: {result.data.revision}</span>
        <button
          onClick={() => {
            invalidateDailyNote(client, 'owner-a', result.data.date)
          }}
        >
          Invalidar
        </button>
      </div>
    )
  }
  return <div>empty</div>
}
