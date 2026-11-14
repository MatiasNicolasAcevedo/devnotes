import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http as mock } from 'msw'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { AppShell } from '../../app/AppShell'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { AuthSessionProvider } from '../auth/AuthSessionProvider'
import { useDailyDraftContext } from '../daily/DailyDraftProvider'
import { documentToPlainText } from '../daily/editor/dailyDocument'
import { setTestDebounce } from '../daily/useDailyNote'
import { useActiveSpace } from './spaceContext'

const DATE = '2026-11-13'

function NoteProbe() {
  const draft = useDailyDraftContext()
  return (
    <textarea
      aria-label="Borrador"
      value={documentToPlainText(draft.content)}
      onChange={(event) =>
        draft.edit({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: event.target.value }] }],
        })
      }
    />
  )
}

function RouteProbe() {
  const { pathname, search, hash } = useLocation()
  const space = useActiveSpace()
  return (
    <output aria-label="Destino">
      {space} {pathname}
      {search}
      {hash}
    </output>
  )
}

function renderShell(route: string) {
  installAuthBackend({ user: buildAuthUser() })
  server.use(
    mock.get('/api/v1/voice/capabilities', () =>
      HttpResponse.json({
        recordingEnabled: false,
        reason: 'Grabación deshabilitada',
        maxDurationSeconds: 600,
        maxAudioBytes: 20_971_520,
        maxTextLength: 50_000,
        mimeTypes: ['audio/webm'],
        language: 'es',
      }),
    ),
  )
  return renderWithProviders(
    <AuthSessionProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="notes/:date" element={<NoteProbe />} />
          <Route path="history/:date" element={<RouteProbe />} />
          <Route path="reference" element={<RouteProbe />} />
          <Route path="voice" element={<RouteProbe />} />
        </Route>
      </Routes>
    </AuthSessionProvider>,
    { route },
  )
}

afterEach(() => {
  localStorage.clear()
  setTestDebounce(undefined)
})

describe('selector de espacio', () => {
  it('permite abrir, elegir y cerrar el menú con teclado y devuelve el foco', async () => {
    const { user } = renderShell(`/history/${DATE}?space=work`)
    const trigger = await screen.findByRole('button', { name: 'Espacio: Trabajo' })
    expect(trigger).toHaveTextContent('Trabajo')
    expect(trigger.querySelector('svg')).not.toBeNull()
    trigger.focus()
    await user.keyboard('{Enter}')
    const menu = await screen.findByRole('menu', { name: 'Cambiar de espacio' })
    expect(within(menu).getByRole('menuitemradio', { name: 'Trabajo' })).toBeChecked()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    await user.keyboard(' {ArrowDown}{Enter}')
    const changed = await screen.findByRole('button', { name: 'Espacio: Personal' })
    await waitFor(() => expect(changed).toHaveFocus())
    expect(screen.getByLabelText('Destino')).toHaveTextContent(
      `personal /history/${DATE}?space=personal`,
    )
  })

  it.each(['/reference', '/voice'])(
    'limpia la selección y los filtros de origen en %s',
    async (path) => {
      const { user } = renderShell(`${path}?space=work&q=origen&id=123&page=2#seleccion`)
      await user.click(await screen.findByRole('button', { name: 'Espacio: Trabajo' }))
      await user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
      expect(screen.getByLabelText('Destino').textContent).toBe(`personal ${path}?space=personal`)
    },
  )

  it('conserva Trabajo y su borrador si el guardado falla, sin leer Personal', async () => {
    setTestDebounce(10_000)
    const reads: (string | null)[] = []
    const writes: (string | null)[] = []
    server.use(
      mock.get('/api/v1/daily-notes/:date', ({ request }) => {
        const space = new URL(request.url).searchParams.get('space')
        reads.push(space)
        return HttpResponse.json({
          id: '01900000-0000-7000-8000-000000000001',
          date: DATE,
          revision: 1,
          updatedAt: '2026-11-13T12:00:00Z',
          content: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Origen' }] }],
          },
        })
      }),
      mock.put('/api/v1/daily-notes/:date', ({ request }) => {
        writes.push(new URL(request.url).searchParams.get('space'))
        return problemResponse(503)
      }),
    )
    const { user } = renderShell(`/notes/${DATE}?space=work`)
    await screen.findByDisplayValue('Origen')
    await user.type(screen.getByRole('textbox', { name: 'Borrador' }), ' editado')
    await user.click(screen.getByRole('button', { name: 'Espacio: Trabajo' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Personal' }))
    expect(await screen.findByText(/El borrador se conserva en Trabajo/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Espacio: Trabajo' })).toBeVisible()
    expect(reads).toEqual(['work'])
    expect(writes).toEqual(['work'])
    await user.click(screen.getByRole('button', { name: 'Volver a Trabajo' }))
    expect(await screen.findByDisplayValue('Origen editado')).toBeVisible()
  })
})
