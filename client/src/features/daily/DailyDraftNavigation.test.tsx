import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { http as mock, HttpResponse } from 'msw'
import { renderWithProviders } from '../../test/render'
import { server } from '../../test/msw/server'
import { installAuthBackend } from '../../test/msw/authBackend'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { DailyDraftWorkspace } from './DailyDraftNavigation'
import { useDailyDraftContext, useOptionalDailyDraftContext } from './DailyDraftProvider'
import { setTestDebounce } from './useDailyNote'

const date = '2026-10-19'
const detailPath = `/api/v1/daily-notes/${date}`

function Note() {
  const ctx = useDailyDraftContext()
  return (
    <>
      <textarea
        aria-label="Borrador"
        value={JSON.stringify(ctx.content)}
        onChange={(event) =>
          ctx.edit({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: event.target.value }] }],
          })
        }
      />
      <span>{ctx.status}</span>
    </>
  )
}

function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <DailyDraftWorkspace owner="test-owner" space="work">
      {(outlet) => (
        <>
          <output data-testid="route">{location.pathname}</output>
          <Link to={`/notes/${date}?space=work`}>Nota</Link>
          <Link to="/history?space=work">Historial</Link>
          <button onClick={() => navigate(-1)}>Atrás del navegador</button>
          {outlet}
        </>
      )}
    </DailyDraftWorkspace>
  )
}

function renderWorkspace(route = `/notes/${date}?space=work`) {
  installAuthBackend({ user: buildAuthUser() })
  setTestDebounce(10_000)
  server.use(mock.get(detailPath, () => problemResponse(404)))
  return renderWithProviders(
    <Routes>
      <Route element={<Shell />}>
        <Route path="notes/:date" element={<Note />} />
        <Route path="history" element={<h1>Historial destino</h1>} />
      </Route>
    </Routes>,
    { route },
  )
}

afterEach(() => setTestDebounce(undefined))

describe('borrador diario y espacio', () => {
  it('una URL de notas de otro espacio o inválida no crea el borrador ni lee la nota', async () => {
    let reads = 0
    installAuthBackend({ user: buildAuthUser() })
    server.use(
      mock.get(detailPath, () => {
        reads++
        return problemResponse(404)
      }),
    )
    function Probe() {
      return <p>{useOptionalDailyDraftContext() ? 'con borrador' : 'sin borrador'}</p>
    }
    for (const route of [`/notes/${date}?space=personal`, `/notes/${date}?space=xyz`]) {
      const view = renderWithProviders(
        <Routes>
          <Route element={<Shell />}>
            <Route path="notes/:date" element={<Probe />} />
          </Route>
        </Routes>,
        { route },
      )
      expect(await screen.findByText('sin borrador')).toBeVisible()
      view.unmount()
    }
    expect(reads).toBe(0)
  })
})

describe('navegación del borrador', () => {
  it('un fallo de flush conserva ruta y texto al pulsar un enlace del shell', async () => {
    server.use(mock.put(detailPath, () => problemResponse(503)))
    const { user } = renderWorkspace()
    const draft = await screen.findByLabelText('Borrador')
    fireEvent.change(draft, { target: { value: 'texto pendiente' } })
    await user.click(screen.getByRole('link', { name: 'Historial' }))
    await screen.findByText('error')
    expect(screen.getByTestId('route')).toHaveTextContent(`/notes/${date}`)
    expect(screen.getByLabelText('Borrador')).toHaveDisplayValue(/texto pendiente/)
    expect(screen.queryByText('Historial destino')).not.toBeInTheDocument()
  })

  it('espera el ACK antes de desmontar la nota y navegar al historial', async () => {
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let received = false
    server.use(
      mock.put(detailPath, async ({ request }) => {
        received = true
        const body = (await request.json()) as { content: unknown }
        await held
        return HttpResponse.json({
          id: '01900000-0000-7000-8000-000000000001',
          date,
          content: body.content,
          revision: 1,
          updatedAt: `${date}T10:00:00Z`,
        })
      }),
    )
    const { user } = renderWorkspace()
    fireEvent.change(await screen.findByLabelText('Borrador'), {
      target: { value: 'antes de salir' },
    })
    await user.click(screen.getByRole('link', { name: 'Historial' }))
    await waitFor(() => expect(received).toBe(true))
    expect(screen.getByTestId('route')).toHaveTextContent(`/notes/${date}`)
    release()
    expect(await screen.findByText('Historial destino')).toBeVisible()
  })

  it('atrás conserva el borrador sobre las páginas; volver y descartar requieren acciones explícitas', async () => {
    let writes = 0
    server.use(
      mock.put(detailPath, () => {
        writes++
        return problemResponse(503)
      }),
    )
    const { user } = renderWorkspace('/history?space=work')
    await user.click(screen.getByRole('link', { name: 'Nota' }))
    fireEvent.change(await screen.findByLabelText('Borrador'), {
      target: { value: 'conservar tras atrás' },
    })
    await user.click(screen.getByRole('button', { name: 'Atrás del navegador' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Hay cambios pendientes')
    expect(screen.queryByText('Historial destino')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver a la nota' }))
    expect(await screen.findByLabelText('Borrador')).toHaveDisplayValue(/conservar tras atrás/)
    await user.click(screen.getByRole('button', { name: 'Atrás del navegador' }))
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(writes).toBe(1))
    expect(screen.queryByText('Historial destino')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByText('Historial destino')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar descarte' }))
    expect(await screen.findByText('Historial destino')).toBeVisible()
    expect(writes).toBe(1)
  })
})
