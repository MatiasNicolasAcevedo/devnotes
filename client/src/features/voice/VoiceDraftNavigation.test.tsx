import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { authQueryKeys, LOGOUT_PATH } from '../auth/api'
import { voiceQueryKeys } from './api'

const VOICE = '/voice?origen=prueba#editor'
const DAILY = '/notes/2026-10-19'
const LIST = '/api/v1/voice-notes'
const TRANSCRIPTION = '/api/v1/voice/transcriptions'
const id = '01900000-0000-7000-8000-000000000001'
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')

function TestNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="location">{location.pathname + location.search + location.hash}</output>
      <button onClick={() => void navigate(VOICE)}>Ir a voz</button>
      <button onClick={() => void navigate(DAILY)}>Ir a destino diario</button>
      <button onClick={() => void navigate(-1)}>Atrás</button>
      <button onClick={() => void navigate(1)}>Adelante</button>
    </>
  )
}

function renderApp(route = VOICE, voiceNotes: object[] = []) {
  const auth = installAuthBackend({ user: buildAuthUser({ displayName: 'Persona A' }) })
  const dailyRead = vi.fn()
  const dailyWrite = vi.fn()
  server.use(
    mock.get('/api/v1/voice/capabilities', () =>
      HttpResponse.json({
        recordingEnabled: true,
        reason: null,
        maxDurationSeconds: 600,
        maxAudioBytes: 20_971_520,
        maxTextLength: 50_000,
        mimeTypes: ['audio/webm'],
        language: 'es',
      }),
    ),
    mock.get(LIST, () =>
      HttpResponse.json({
        content: voiceNotes,
        page: 0,
        size: 20,
        totalElements: voiceNotes.length,
        totalPages: voiceNotes.length > 0 ? 1 : 0,
      }),
    ),
    mock.get('/api/v1/daily-notes', () =>
      HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    ),
    mock.get('/api/v1/daily-notes/:date', () => {
      dailyRead()
      return problemResponse(404)
    }),
    mock.put('/api/v1/daily-notes/:date', () => {
      dailyWrite()
      return problemResponse(503)
    }),
  )
  const app = renderWithProviders(
    <>
      <TestNavigation />
      <AppRoutes />
    </>,
    { route },
  )
  return { ...app, auth, dailyRead, dailyWrite }
}

function heldResponse() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function note(text: string) {
  return HttpResponse.json(
    {
      id,
      text,
      revision: 1,
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
    },
    { status: 201 },
  )
}

function guard() {
  return screen.findByText(/Hay cambios pendientes en la nota de voz/)
}

function voiceText() {
  return screen.findByRole('textbox', { name: 'Texto de la nota' })
}

function unload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

function installMicrophone() {
  const track = Object.assign(new EventTarget(), { stop: vi.fn() })
  const stream = { getTracks: () => [track] }
  const getUserMedia = vi.fn(async () => stream)
  vi.stubGlobal(
    'MediaRecorder',
    class {
      static isTypeSupported = () => true
      state = 'inactive'
      mimeType = 'audio/webm'
      ondataavailable: ((event: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      start() {
        this.state = 'recording'
      }
      stop() {
        this.state = 'inactive'
        this.ondataavailable?.({ data: new Blob(['audio ficticio'], { type: this.mimeType }) })
        this.onstop?.()
      }
    },
  )
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  return { track, getUserMedia, stream }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices)
  else Reflect.deleteProperty(navigator, 'mediaDevices')
})

describe('workspace de voz y navegación', () => {
  it('protege el destino diario de enlaces y navegación programática hasta guardar con ACK', async () => {
    const ack = heldResponse()
    const post = vi.fn()
    server.use(
      mock.post(LIST, async ({ request }) => {
        post(await request.json())
        await ack.promise
        return note('Borrador conservado')
      }),
    )
    const { user, dailyRead, dailyWrite } = renderApp()
    await user.type(await voiceText(), 'Borrador conservado')
    await user.click(screen.getByRole('link', { name: 'Notas' }))
    await guard()
    expect(dailyRead).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Volver a voz' }))
    expect(await voiceText()).toHaveValue('Borrador conservado')
    expect(screen.getByTestId('location')).toHaveTextContent(VOICE)
    await user.click(screen.getByRole('button', { name: 'Ir a destino diario' }))
    await guard()
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledExactlyOnceWith({ text: 'Borrador conservado' }),
    )
    expect(dailyRead).not.toHaveBeenCalled()
    expect(dailyWrite).not.toHaveBeenCalled()
    ack.release()
    await waitFor(() => expect(dailyRead).toHaveBeenCalled())
    expect(screen.queryByText(/Hay cambios pendientes en la nota de voz/)).not.toBeInTheDocument()
    expect(dailyWrite).not.toHaveBeenCalled()
  })

  it('atrás y adelante muestran la guardia; un error conserva texto y el descarte libera la ruta', async () => {
    server.use(mock.post(LIST, () => problemResponse(503)))
    const { user, dailyRead } = renderApp('/')
    await user.click(screen.getByRole('button', { name: 'Ir a voz' }))
    await voiceText()
    await user.click(screen.getByRole('button', { name: 'Ir a destino diario' }))
    await waitFor(() => expect(dailyRead).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    await user.type(await voiceText(), 'Pendiente')
    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    await guard()
    await user.click(screen.getByRole('button', { name: 'Adelante' }))
    expect(await voiceText()).toHaveValue('Pendiente')
    await user.click(screen.getByRole('button', { name: 'Adelante' }))
    await guard()
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
    expect(await screen.findByText(/Tu borrador se conserva/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Volver a voz' }))
    expect(await voiceText()).toHaveValue('Pendiente')
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    await guard()
    await user.click(screen.getByRole('button', { name: 'Descartar y continuar' }))
    expect(await screen.findByRole('heading', { name: /Bienvenido/ })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Voz' }))
    expect(await voiceText()).toHaveValue('')
  })

  it('solo advierte en beforeunload con pendientes y limpia el borrador en pagehide', async () => {
    const { user } = renderApp()
    await voiceText()
    expect(unload()).toBe(false)
    await user.type(await voiceText(), 'Texto por limpiar')
    expect(unload()).toBe(true)
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(await voiceText()).toHaveValue('')
    expect(unload()).toBe(false)
  })

  it('ignora la recarga de un conflicto después de descartar al navegar', async () => {
    const reload = heldResponse()
    const get = vi.fn()
    server.use(
      mock.post(LIST, () => note('Texto guardado')),
      mock.put(`${LIST}/${id}`, () => problemResponse(409)),
      mock.get(`${LIST}/${id}`, async () => {
        get()
        await reload.promise
        return HttpResponse.json({
          id,
          text: 'Respuesta tardía del detalle',
          revision: 2,
          createdAt: '2026-11-01T12:00:00Z',
          updatedAt: '2026-11-01T12:01:00Z',
        })
      }),
    )
    const { user, queryClient } = renderApp('/')
    await user.click(screen.getByRole('button', { name: 'Ir a voz' }))
    const back = screen.getByRole('button', { name: 'Atrás' })
    await user.type(await voiceText(), 'Texto guardado')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByText('Nota guardada correctamente.')
    await user.type(await voiceText(), ' con cambios')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(await screen.findByRole('button', { name: 'Recargar nota' }))
    await user.click(await screen.findByRole('button', { name: 'Descartar y recargar' }))
    await waitFor(() => expect(get).toHaveBeenCalledOnce())
    // POP puede ocurrir aunque el diálogo tenga el foco.
    fireEvent.click(back)
    await user.click(await screen.findByRole('button', { name: 'Descartar y continuar' }))
    reload.release()
    await waitFor(() =>
      expect(queryClient.isFetching({ queryKey: voiceQueryKeys.detail(id) })).toBe(0),
    )
    await user.click(screen.getByRole('link', { name: 'Voz' }))
    expect(await voiceText()).toHaveValue('')
  })

  it('cancela permiso al navegar y detiene los tracks que llegan después', async () => {
    const { getUserMedia, stream, track } = installMicrophone()
    const permission = heldResponse()
    getUserMedia.mockImplementationOnce(async () => {
      await permission.promise
      return stream
    })
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Grabar' }))
    expect(await screen.findByText('Esperando permiso del micrófono')).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    await guard()
    await user.click(screen.getByRole('button', { name: 'Volver a voz' }))
    permission.release()
    await waitFor(() => expect(track.stop).toHaveBeenCalledOnce())
    expect(screen.queryByText('Grabando')).not.toBeInTheDocument()
    expect(getUserMedia).toHaveBeenCalledOnce()
  })

  it('detiene captura al ocultar la pestaña y solo transcribe por acción explícita', async () => {
    const { track } = installMicrophone()
    const post = vi.fn()
    server.use(
      mock.post(TRANSCRIPTION, () => {
        post()
        return HttpResponse.json({ text: 'Transcripción explícita', language: 'es' })
      }),
    )
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Grabar' }))
    expect(await screen.findByText('Grabando')).toBeVisible()
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    await screen.findByRole('button', { name: 'Transcribir' })
    hidden.mockRestore()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(post).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Transcribir' }))
    await waitFor(async () => expect(await voiceText()).toHaveValue('Transcripción explícita'))
    expect(post).toHaveBeenCalledOnce()
  })

  it('descarta audio que excedió 600 s durante la suspensión y recupera el editor', async () => {
    const { track, getUserMedia } = installMicrophone()
    const post = vi.fn()
    const saved = vi.fn()
    server.use(
      mock.post(TRANSCRIPTION, () => {
        post()
        return HttpResponse.json({ text: 'No debe transcribirse', language: 'es' })
      }),
      mock.post(LIST, async ({ request }) => {
        saved(await request.json())
        return note('Texto manual tras el aviso')
      }),
    )
    const now = vi.spyOn(performance, 'now')
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Grabar' }))
    expect(await screen.findByText('Grabando')).toBeVisible()
    // El reloj avanza durante la suspensión aunque el timer no se ejecute.
    now.mockReturnValue(performance.now() + 601_000)
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    await waitFor(() => expect(track.stop).toHaveBeenCalledOnce())
    hidden.mockRestore()
    expect(screen.queryByRole('button', { name: 'Transcribir' })).not.toBeInTheDocument()
    expect(await screen.findByText(/Se excedió la duración máxima/)).toBeVisible()
    expect(unload()).toBe(false)
    expect(post).not.toHaveBeenCalled()

    // El mismo workspace vuelve a grabar por gesto y guarda texto manual con ACK.
    await user.click(screen.getByRole('button', { name: 'Nueva nota' }))
    expect(screen.queryByText(/Se excedió la duración máxima/)).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Grabar' }))
    expect(await screen.findByText('Grabando')).toBeVisible()
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    await user.click(screen.getByRole('button', { name: 'Cancelar grabación' }))
    expect(track.stop).toHaveBeenCalledTimes(2)
    await user.type(await voiceText(), 'Texto manual tras el aviso')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Nota guardada correctamente.')).toBeVisible()
    expect(saved).toHaveBeenCalledExactlyOnceWith({ text: 'Texto manual tras el aviso' })
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    {
      variante: 'aviso de audio excedido',
      aviso: /Se excedió la duración máxima/,
      provocar: async (
        user: ReturnType<typeof renderApp>['user'],
        mic: ReturnType<typeof installMicrophone>,
      ) => {
        const now = vi.spyOn(performance, 'now')
        await user.click(await screen.findByRole('button', { name: 'Grabar' }))
        expect(await screen.findByText('Grabando')).toBeVisible()
        now.mockReturnValue(performance.now() + 601_000)
        const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
        fireEvent(document, new Event('visibilitychange'))
        await waitFor(() => expect(mic.track.stop).toHaveBeenCalledOnce())
        hidden.mockRestore()
      },
    },
    {
      variante: 'permiso denegado',
      aviso: /No se pudo transcribir el audio/,
      provocar: async (
        user: ReturnType<typeof renderApp>['user'],
        mic: ReturnType<typeof installMicrophone>,
      ) => {
        mic.getUserMedia.mockRejectedValueOnce(new DOMException('Denegado', 'NotAllowedError'))
        await user.click(await screen.findByRole('button', { name: 'Grabar' }))
        await waitFor(() => expect(mic.getUserMedia).toHaveBeenCalledOnce())
      },
    },
  ])(
    'tras $variante abre una nota existente, la edita y la guarda con ACK',
    async ({ aviso, provocar }) => {
      const mic = installMicrophone()
      const post = vi.fn()
      const updated = vi.fn()
      server.use(
        mock.get(`${LIST}/${id}`, () =>
          HttpResponse.json({
            id,
            text: 'Extracto existente',
            revision: 1,
            createdAt: '2026-11-01T12:00:00Z',
            updatedAt: '2026-11-01T12:00:00Z',
          }),
        ),
        mock.put(`${LIST}/${id}`, async ({ request }) => {
          updated(await request.json())
          return HttpResponse.json({
            id,
            text: 'Extracto existente editado',
            revision: 2,
            createdAt: '2026-11-01T12:00:00Z',
            updatedAt: '2026-11-01T12:05:00Z',
          })
        }),
        mock.post(TRANSCRIPTION, () => {
          post()
          return HttpResponse.json({ text: 'No debe transcribirse', language: 'es' })
        }),
      )
      const { user } = renderApp(VOICE, [
        {
          id,
          excerpt: 'Extracto existente',
          revision: 1,
          createdAt: '2026-11-01T12:00:00Z',
          updatedAt: '2026-11-01T12:00:00Z',
        },
      ])
      await provocar(user, mic)
      expect(await screen.findByText(aviso)).toBeVisible()

      // Abrir otra nota cambia de documento: el aviso terminado no bloquea el guardado.
      await user.click(await screen.findByText('Extracto existente'))
      const text = await voiceText()
      await waitFor(() => expect(text).toHaveValue('Extracto existente'))
      expect(screen.queryByText(aviso)).not.toBeInTheDocument()
      await user.type(text, ' editado')
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(await screen.findByText('Nota guardada correctamente.')).toBeVisible()
      expect(updated).toHaveBeenCalledExactlyOnceWith({
        text: 'Extracto existente editado',
        expectedRevision: 1,
      })
      expect(post).not.toHaveBeenCalled()
    },
  )

  it('aborta la transcripción al salir, permite volver sin enviar y descarta audio explícitamente', async () => {
    const { track, getUserMedia } = installMicrophone()
    const response = heldResponse()
    const received = vi.fn()
    const interceptedFetch = globalThis.fetch
    // Retener la entrega al cliente después de que MSW consuma la petición multipart.
    // La respuesta puede llegar incluso con la señal abortada.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const result = await interceptedFetch(input, init)
      if (input === TRANSCRIPTION) {
        received()
        await response.promise
      }
      return result
    })
    server.use(
      mock.post(TRANSCRIPTION, () => {
        return HttpResponse.json({ text: 'Respuesta tardía', language: 'es' })
      }),
    )
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Grabar' }))
    await user.click(await screen.findByRole('button', { name: 'Detener y transcribir' }))
    const getSignal = () =>
      fetchSpy.mock.calls.find(([path]) => path === TRANSCRIPTION)?.[1]?.signal
    await waitFor(() => expect(received).toHaveBeenCalledOnce())
    expect(getSignal()?.aborted).toBe(false)
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    await guard()
    await waitFor(() => expect(getSignal()?.aborted).toBe(true))
    expect(screen.getByRole('button', { name: 'Guardar y continuar' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Volver a voz' }))
    expect(await screen.findByRole('button', { name: 'Transcribir' })).toBeEnabled()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(getUserMedia).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    await user.click(await screen.findByRole('button', { name: 'Descartar y continuar' }))
    response.release()
    await user.click(screen.getByRole('link', { name: 'Voz' }))
    expect(await voiceText()).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Transcribir' })).not.toBeInTheDocument()
  })
})

describe('workspace de voz y sesión', () => {
  it('un logout fallido conserva texto y uno exitoso elimina el borrador', async () => {
    const { user } = renderApp()
    server.use(mock.post(LOGOUT_PATH, () => problemResponse(503), { once: true }))
    await user.type(await voiceText(), 'Texto privado')
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('No se pudo confirmar el cierre de sesión')).toBeVisible()
    expect(await voiceText()).toHaveValue('Texto privado')
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await screen.findByRole('link', { name: 'Continuar con Google' })
    await user.click(screen.getByRole('link', { name: 'Voz' }))
    expect(await voiceText()).toHaveValue('')
    expect(unload()).toBe(false)
  })

  it('al iniciar un logout en vuelo apaga el micrófono aunque luego falle', async () => {
    const { track, getUserMedia } = installMicrophone()
    const response = heldResponse()
    const { user } = renderApp()
    server.use(
      mock.post(LOGOUT_PATH, async () => {
        await response.promise
        return problemResponse(503)
      }),
    )
    await user.click(await screen.findByRole('button', { name: 'Grabar' }))
    expect(await screen.findByText('Grabando')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(track.stop).toHaveBeenCalledOnce())
    expect(screen.queryByText('Grabando')).not.toBeInTheDocument()
    response.release()
    await screen.findByText('No se pudo confirmar el cierre de sesión')
    expect(getUserMedia).toHaveBeenCalledOnce()
    expect(unload()).toBe(false)
  })

  it('un 401 vigente elimina texto y guardia sin autosave ni diálogo', async () => {
    const { user, auth } = renderApp()
    await user.type(await voiceText(), 'Texto de una sesión vencida')
    auth.expireSession()
    server.use(mock.post(LIST, () => problemResponse(401)))
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar y continuar' }))
    await screen.findByText('La sesión terminó. Volvé a ingresar.')
    expect(await screen.findByRole('heading', { name: /Bienvenido/ })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Voz' }))
    expect(await voiceText()).toHaveValue('')
  })

  it('un 401 tardío de A no vence la sesión de B ni toca su borrador', async () => {
    const held = heldResponse()
    const post = vi.fn()
    server.use(
      mock.post(LIST, async () => {
        post()
        await held.promise
        return problemResponse(401)
      }),
    )
    const { user, auth, queryClient } = renderApp()
    await user.type(await voiceText(), 'Texto de A')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(post).toHaveBeenCalledOnce())
    const [oldMutation] = queryClient.getMutationCache().getAll()
    expect(oldMutation.state.status).toBe('pending')
    auth.login(
      buildAuthUser({ id: '01900000-0000-7000-8000-000000000002', displayName: 'Persona B' }),
    )
    await act(() => queryClient.invalidateQueries({ queryKey: authQueryKeys.session }))
    expect(await screen.findByText('Persona B')).toBeVisible()
    expect(await voiceText()).toHaveValue('')
    await user.type(await voiceText(), 'Texto de B')
    held.release()
    await waitFor(() => expect(oldMutation.state.status).toBe('error'))
    expect(screen.queryByText('La sesión terminó. Volvé a ingresar.')).not.toBeInTheDocument()
    expect(await voiceText()).toHaveValue('Texto de B')
  })

  it('un logout confirmado tarde para A no borra ni redirige a B', async () => {
    const response = heldResponse()
    const post = vi.fn()
    const { user, auth, queryClient } = renderApp()
    server.use(
      mock.post(LOGOUT_PATH, async () => {
        post()
        await response.promise
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await user.type(await voiceText(), 'Borrador de A')
    const logout = screen.getByRole('button', { name: 'Cerrar sesión' })
    await waitFor(() => expect(logout).toBeEnabled())
    await user.click(logout)
    await waitFor(() => expect(post).toHaveBeenCalledOnce())
    const [oldLogout] = queryClient.getMutationCache().getAll()
    auth.login(
      buildAuthUser({ id: '01900000-0000-7000-8000-000000000002', displayName: 'Persona B' }),
    )
    await act(() => queryClient.invalidateQueries({ queryKey: authQueryKeys.session }))
    expect(await screen.findByText('Persona B')).toBeVisible()
    expect(await voiceText()).toHaveValue('')
    await user.type(await voiceText(), 'Borrador de B')
    response.release()
    await waitFor(() => expect(oldLogout.state.status).toBe('success'))
    expect(screen.getByTestId('location')).toHaveTextContent(VOICE)
    expect(await voiceText()).toHaveValue('Borrador de B')
    expect(screen.getByText('Persona B')).toBeVisible()
  })
})
