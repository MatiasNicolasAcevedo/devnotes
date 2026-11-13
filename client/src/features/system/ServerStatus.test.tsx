import { act, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { NARROW_VIEWPORT, setViewportWidth } from '../../test/viewport'
import { ServerStatus } from './ServerStatus'

const READY = '/actuator/health/readiness'
const READY_KEY = ['system', 'readiness'] as const

const online = () => screen.queryByRole('status', { name: 'Servidor conectado' })
const offline = () => screen.queryByRole('status', { name: 'Servidor sin conexión' })

let visibility: DocumentVisibilityState = 'visible'

/** Como en el navegador: el evento sube del documento a window, donde lo escucha el focusManager de Query. */
function setVisibility(next: DocumentVisibilityState) {
  visibility = next
  act(() => {
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
  })
}

/** Deja correr respuestas pendientes con el reloj real (los intervalos siguen simulados). */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))

beforeEach(() => {
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
})

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState')
  vi.useRealTimers()
})

describe('ServerStatus', () => {
  it('muestra «Conectando» hasta la primera respuesta y después «Online»', async () => {
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let requested = false
    server.use(
      http.get(READY, async () => {
        requested = true
        await held
        return HttpResponse.json({ status: 'UP' })
      }),
    )
    renderWithProviders(<ServerStatus />)
    try {
      await waitFor(() => expect(requested).toBe(true))
      expect(screen.getByRole('status', { name: 'Conectando con el servidor' })).toHaveTextContent(
        'Conectando',
      )
      expect(online()).not.toBeInTheDocument()
      expect(offline()).not.toBeInTheDocument()
    } finally {
      release()
    }
    expect(await screen.findByRole('status', { name: 'Servidor conectado' })).toHaveTextContent(
      'Online',
    )
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it.each(['503', 'HTML', 'JSON inválido', 'DOWN', 'componentes', 'sin red'])(
    'con readiness %s muestra «Offline», sin éxito engañoso',
    async (kind) => {
      let calls = 0
      server.use(
        http.get(READY, () => {
          calls++
          if (kind === 'sin red') return HttpResponse.error()
          if (kind === '503') return HttpResponse.json({ status: 'DOWN' }, { status: 503 })
          if (kind === 'HTML') return HttpResponse.html('<html>SPA</html>')
          if (kind === 'JSON inválido')
            return new HttpResponse('{', { headers: { 'Content-Type': 'application/json' } })
          return HttpResponse.json(
            kind === 'DOWN' ? { status: 'DOWN' } : { status: 'UP', components: { db: {} } },
          )
        }),
      )
      renderWithProviders(<ServerStatus />)

      expect(
        await screen.findByRole('status', { name: 'Servidor sin conexión' }),
      ).toHaveTextContent('Offline')
      expect(online()).not.toBeInTheDocument()
      expect(calls).toBe(1)
    },
  )

  it('retira el «Online» anterior tras un 503 y lo recupera sin retener éxito de cache', async () => {
    let available = true
    server.use(
      http.get(READY, () =>
        HttpResponse.json({ status: available ? 'UP' : 'DOWN' }, { status: available ? 200 : 503 }),
      ),
    )
    const { queryClient } = renderWithProviders(<ServerStatus />)
    expect(await screen.findByRole('status', { name: 'Servidor conectado' })).toBeVisible()
    available = false
    await act(() => queryClient.invalidateQueries({ queryKey: READY_KEY }))
    expect(await screen.findByRole('status', { name: 'Servidor sin conexión' })).toBeVisible()
    expect(online()).not.toBeInTheDocument()
    available = true
    await act(() => queryClient.invalidateQueries({ queryKey: READY_KEY }))
    expect(await screen.findByRole('status', { name: 'Servidor conectado' })).toBeVisible()
    expect(offline()).not.toBeInTheDocument()
  })

  it('revalida cada 60 s con el documento visible: ni antes ni cada 5 s', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let available = true
    let calls = 0
    server.use(
      http.get(READY, () => {
        calls++
        return HttpResponse.json(
          { status: available ? 'UP' : 'DOWN' },
          { status: available ? 200 : 503 },
        )
      }),
    )
    renderWithProviders(<ServerStatus />)
    expect(await screen.findByRole('status', { name: 'Servidor conectado' })).toBeVisible()
    expect(calls).toBe(1)
    available = false

    await act(() => vi.advanceTimersByTimeAsync(59_000))
    await settle()
    expect(calls).toBe(1)
    expect(online()).toBeVisible()

    await act(() => vi.advanceTimersByTimeAsync(1_000))
    await vi.waitFor(() => expect(offline()).toBeVisible())
    expect(calls).toBe(2)
    expect(online()).not.toBeInTheDocument()
  })

  it('con el documento oculto no consulta en segundo plano; al volver a verse revalida', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let calls = 0
    server.use(
      http.get(READY, () => {
        calls++
        return HttpResponse.json({ status: 'UP' })
      }),
    )
    renderWithProviders(<ServerStatus />)
    expect(await screen.findByRole('status', { name: 'Servidor conectado' })).toBeVisible()

    setVisibility('hidden')
    await act(() => vi.advanceTimersByTimeAsync(10 * 60_000))
    await settle()
    expect(calls).toBe(1)

    setVisibility('visible')
    await vi.waitFor(() => expect(calls).toBe(2))
  })

  it.each([
    ['conectado', true, 'Servidor conectado', 'Online'],
    ['sin conexión', false, 'Servidor sin conexión', 'Offline'],
  ])(
    'en angosto muestra solo el punto %s, con nombre accesible y tooltip',
    async (_case, up, name, text) => {
      setViewportWidth(NARROW_VIEWPORT)
      server.use(
        http.get(READY, () =>
          HttpResponse.json({ status: up ? 'UP' : 'DOWN' }, { status: up ? 200 : 503 }),
        ),
      )
      const { user } = renderWithProviders(<ServerStatus />)

      const status = await screen.findByRole('status', { name })
      expect(status).toHaveTextContent('')
      expect(screen.queryByText(text)).not.toBeInTheDocument()
      await user.hover(status)
      expect(await screen.findByRole('tooltip')).toHaveTextContent(name)
    },
  )
})
