import { act, screen, waitFor } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../../app/AppShell'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { installReferenceBackend, referenceItem } from '../../test/msw/referenceBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { clickLogout } from '../../test/session'
import { AuthSessionProvider } from '../auth/AuthSessionProvider'
import { LoginPage } from '../auth/LoginPage'
import { useDailyDraftContext, useOptionalDailyDraftContext } from '../daily/DailyDraftProvider'
import { documentToPlainText, type DailyContent } from '../daily/editor/dailyDocument'
import { setTestDebounce } from '../daily/useDailyNote'
import { useSaveDailyVersion } from '../daily/useSaveDailyVersion'
import { ReferencePage } from '../reference/ReferencePage'
import { VoicePage } from '../voice/VoicePage'
import { readSpaceParam } from './space'
import { useSpaceTransitionLock } from './spaceContext'
import { spacePreferenceKey } from './spacePreference'

const DATE = '2026-11-13'
const USER = buildAuthUser()
const OTHER_ACCOUNT = '01900000-0000-7000-8000-0000000000ff'

function makeContent(text: string): DailyContent {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}

function spaceOf(request: Request) {
  const param = readSpaceParam(new URL(request.url).search)
  return param.kind === 'valid' ? param.space : param.kind
}

function held() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

// ——— Backend simulado por espacio (las pruebas de navegador usan la API real) ———

interface Logged {
  method: string
  path: string
  spaces: string[]
}

/** Toda petición a la API de contenido, con sus `space`. Auth, capacidades, actividad y transcripción son globales. */
const requests: Logged[] = []
const CONTENT = /^\/api\/v1\/(daily-notes|daily-versions|reference-items|voice-notes)(\/|$)/
const logRequest = ({ request }: { request: Request }) => {
  const url = new URL(request.url)
  if (!CONTENT.test(url.pathname)) return
  requests.push({
    method: request.method,
    path: url.pathname,
    spaces: url.searchParams.getAll('space'),
  })
}

function installDailyBackend(initial: Record<string, string> = {}) {
  const notes = new Map(
    Object.entries(initial).map(([key, text]) => [
      key,
      { content: makeContent(text), revision: 1 },
    ]),
  )
  const control = {
    putGate: null as Promise<void> | null,
    putStatus: null as number | null,
    versionGate: null as Promise<void> | null,
    puts: [] as string[],
    versions: [] as string[],
  }
  const detail = (date: string, note: { content: DailyContent; revision: number }) => ({
    id: '01900000-0000-7000-8000-000000000001',
    date,
    content: note.content,
    revision: note.revision,
    updatedAt: `${date}T10:00:00Z`,
  })
  server.use(
    mock.get('/api/v1/daily-notes', () =>
      HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    ),
    mock.get('/api/v1/daily-notes/:date', ({ params, request }) => {
      const note = notes.get(`${spaceOf(request)}:${String(params.date)}`)
      return note ? HttpResponse.json(detail(String(params.date), note)) : problemResponse(404)
    }),
    mock.put('/api/v1/daily-notes/:date', async ({ params, request }) => {
      const space = spaceOf(request)
      control.puts.push(space)
      const body = (await request.json()) as { content: DailyContent; expectedRevision: number }
      if (control.putGate) await control.putGate
      if (control.putStatus) return problemResponse(control.putStatus)
      const key = `${space}:${String(params.date)}`
      const note = { content: body.content, revision: body.expectedRevision + 1 }
      notes.set(key, note)
      return HttpResponse.json(detail(String(params.date), note))
    }),
    mock.get('/api/v1/daily-versions/:date', () => problemResponse(404)),
    mock.post('/api/v1/daily-notes/:date/version', async ({ params, request }) => {
      control.versions.push(spaceOf(request))
      if (control.versionGate) await control.versionGate
      return HttpResponse.json({
        id: '01900000-0000-7000-8000-000000000009',
        date: String(params.date),
        content: makeContent(''),
        sourceRevision: 1,
        savedAt: `${DATE}T11:00:00Z`,
      })
    }),
  )
  return { notes, control }
}

function installVoiceBackend() {
  const control = { postStatus: null as number | null, posts: [] as string[] }
  const listed = (space: string) =>
    space === 'work'
      ? [
          {
            id: '01900000-0000-7000-8000-000000000301',
            excerpt: 'Nota de voz de trabajo',
            revision: 1,
            createdAt: '2026-11-01T12:00:00Z',
            updatedAt: '2026-11-01T12:00:00Z',
          },
        ]
      : []
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
    mock.get('/api/v1/voice-notes', ({ request }) => {
      const content = listed(spaceOf(request))
      return HttpResponse.json({
        content,
        page: 0,
        size: 20,
        totalElements: content.length,
        totalPages: content.length ? 1 : 0,
      })
    }),
    mock.post('/api/v1/voice-notes', async ({ request }) => {
      control.posts.push(spaceOf(request))
      const body = (await request.json()) as { text: string }
      if (control.postStatus) return problemResponse(control.postStatus)
      return HttpResponse.json(
        {
          id: '01900000-0000-7000-8000-000000000399',
          text: body.text,
          revision: 1,
          createdAt: '2026-11-13T12:00:00Z',
          updatedAt: '2026-11-13T12:00:00Z',
        },
        { status: 201 },
      )
    }),
  )
  return control
}

// ——— Aplicación con el shell real y pantallas mínimas ———

function NoteProbe() {
  const ctx = useOptionalDailyDraftContext()
  return ctx ? <NoteEditor /> : <p>Sin borrador</p>
}

function NoteEditor() {
  const ctx = useDailyDraftContext()
  const version = useSaveDailyVersion({
    owner: ctx.owner,
    space: ctx.space,
    date: ctx.activeDate,
    note: ctx,
    onLockChange: ctx.setNavigationLocked,
  })
  const text = documentToPlainText(ctx.content)
  return (
    <>
      <p data-testid="nota">{`${ctx.space}:${ctx.isLoading ? '…' : text}`}</p>
      <textarea
        aria-label="Borrador"
        value={text}
        onChange={(event) => ctx.edit(makeContent(event.target.value))}
      />
      <button onClick={version.handleClick}>Guardar versión</button>
    </>
  )
}

function LockProbe() {
  useSpaceTransitionLock('Hay una importación en curso.')
  return (
    <>
      <h1>Importando</h1>
      <Link to="/reference?space=personal">Enlace a Personal</Link>
    </>
  )
}

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="ubicacion">{location.pathname + location.search}</output>
      <button onClick={() => void navigate(`/notes/${DATE}?space=work`)}>Notas de Trabajo</button>
      <button onClick={() => void navigate(`/notes/${DATE}?space=personal`)}>
        Notas de Personal
      </button>
      <button onClick={() => void navigate('/voice?space=personal')}>Voz de Personal</button>
      <button onClick={() => void navigate('/reference?space=personal')}>
        Referencias de Personal
      </button>
      <button onClick={() => void navigate('/reference')}>Referencias sin espacio</button>
      <button onClick={() => void navigate('/lock')}>Importación</button>
      <button onClick={() => void navigate(-1)}>Atrás</button>
      <button onClick={() => void navigate(1)}>Adelante</button>
    </>
  )
}

function renderApp(route: string, user: ReturnType<typeof buildAuthUser> | null = USER) {
  const auth = installAuthBackend({ user })
  const app = renderWithProviders(
    <AuthSessionProvider>
      <Navigation />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="notes/:date" element={<NoteProbe />} />
          <Route path="voice" element={<VoicePage />} />
          <Route path="reference" element={<ReferencePage />} />
          <Route path="lock" element={<LockProbe />} />
        </Route>
      </Routes>
    </AuthSessionProvider>,
    { route },
  )
  return { ...app, auth }
}

const location = () => screen.getByTestId('ubicacion')
const note = () => screen.findByTestId('nota')

beforeEach(() => {
  requests.length = 0
  server.events.on('request:start', logRequest)
  setTestDebounce(10_000)
})

afterEach(() => {
  server.events.removeListener('request:start', logRequest)
  setTestDebounce(undefined)
  window.localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Toda petición de contenido lleva exactamente un `space` válido. */
function expectEveryRequestScoped() {
  for (const request of requests)
    expect(request, request.path).toMatchObject({
      spaces: [expect.stringMatching(/^(work|personal)$/)],
    })
}

describe('URL, preferencia y sesión', () => {
  it('sin space canonicaliza con la preferencia del dispositivo y, sin ella, con Trabajo', async () => {
    installDailyBackend()
    window.localStorage.setItem(spacePreferenceKey(USER.id), 'personal')
    const first = renderApp(`/notes/${DATE}`)
    expect(await note()).toHaveTextContent('personal:')
    expect(location()).toHaveTextContent(`/notes/${DATE}?space=personal`)
    first.unmount()

    window.localStorage.clear()
    renderApp(`/notes/${DATE}`)
    expect(await note()).toHaveTextContent('work:')
    expect(location()).toHaveTextContent(`/notes/${DATE}?space=work`)
    expectEveryRequestScoped()
    // La preferencia se guarda recién con el cambio completo y solo como enum.
    expect(window.localStorage.getItem(spacePreferenceKey(USER.id))).toBe('work')
    expect(Object.keys(window.localStorage)).toEqual([spacePreferenceKey(USER.id)])
  })

  it.each(['?space=all', '?space=', '?space=Work', '?space=work&space=personal'])(
    'una URL con %s muestra «Espacio no válido» y nunca lee ni escribe',
    async (search) => {
      const { control } = installDailyBackend({ [`work:${DATE}`]: 'Trabajo del día' })
      const { user } = renderApp(`/notes/${DATE}${search}`)
      expect(await screen.findByRole('heading', { name: 'Espacio no válido' })).toBeVisible()
      await act(async () => new Promise((resolve) => setTimeout(resolve, 50)))
      expect(requests).toEqual([])
      expect(control.puts).toEqual([])
      expect(window.localStorage.length).toBe(0)
      await user.click(screen.getByRole('button', { name: 'Abrir Personal' }))
      expect(await note()).toHaveTextContent('personal:')
      expect(location()).toHaveTextContent(`/notes/${DATE}?space=personal`)
      expectEveryRequestScoped()
    },
  )

  it('un visitante ve el ingreso sin leer preferencias ni canonicalizar la URL', async () => {
    window.localStorage.setItem(spacePreferenceKey(OTHER_ACCOUNT), 'personal')
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    renderApp('/voice', null)
    expect(await screen.findByText('Ingresá para usar tus notas de voz.')).toBeVisible()
    expect(location()).toHaveTextContent(/^\/voice$/)
    expect(getItem.mock.calls.filter(([key]) => key.startsWith('devnotes:'))).toEqual([])
  })

  it('una preferencia inválida abre Trabajo y el almacenamiento denegado sigue en memoria', async () => {
    installDailyBackend()
    installReferenceBackend(installAuthBackend({ user: USER }))
    window.localStorage.setItem(spacePreferenceKey(USER.id), 'admin')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denegado', 'SecurityError')
    })
    const { user } = renderApp(`/notes/${DATE}`)
    expect(await note()).toHaveTextContent('work:')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denegado', 'SecurityError')
    })
    await user.click(screen.getByRole('button', { name: 'Notas de Personal' }))
    expect(await note()).toHaveTextContent('personal:')
    // Sin almacenamiento, el espacio confirmado de la pestaña resuelve la URL sin espacio.
    await user.click(screen.getByRole('button', { name: 'Referencias sin espacio' }))
    await waitFor(() => expect(location()).toHaveTextContent('/reference?space=personal'))
    expectEveryRequestScoped()
  })

  it('el evento storage de otra pestaña no cambia el espacio de esta', async () => {
    installDailyBackend()
    renderApp(`/notes/${DATE}?space=work`)
    expect(await note()).toHaveTextContent('work:')
    window.localStorage.setItem(spacePreferenceKey(USER.id), 'personal')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: spacePreferenceKey(USER.id),
          oldValue: 'work',
          newValue: 'personal',
        }),
      )
    })
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(await note()).toHaveTextContent('work:')
    expect(location()).toHaveTextContent(`?space=work`)
    expect(requests.every((request) => request.spaces[0] === 'work')).toBe(true)
  })

  it('cerrar sesión borra solo la preferencia de esa identidad', async () => {
    installDailyBackend()
    window.localStorage.setItem(spacePreferenceKey(OTHER_ACCOUNT), 'work')
    const { user } = renderApp(`/notes/${DATE}?space=personal`)
    expect(await note()).toHaveTextContent('personal:')
    await waitFor(() =>
      expect(window.localStorage.getItem(spacePreferenceKey(USER.id))).toBe('personal'),
    )
    await clickLogout(user)
    await screen.findByRole('link', { name: 'Continuar con Google' })
    expect(window.localStorage.getItem(spacePreferenceKey(USER.id))).toBeNull()
    expect(window.localStorage.getItem(spacePreferenceKey(OTHER_ACCOUNT))).toBe('work')
  })
})

describe('transición del diario', () => {
  it('misma fecha en Trabajo y Personal son documentos independientes; abrir vacío no escribe', async () => {
    const { control } = installDailyBackend({ [`work:${DATE}`]: 'Trabajo del día' })
    const { user } = renderApp(`/notes/${DATE}?space=work`)
    expect(await screen.findByText('work:Trabajo del día')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Notas de Personal' }))
    expect(await screen.findByText('personal:')).toBeVisible()
    expect(screen.queryByText(/Trabajo del día/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(await screen.findByText('work:Trabajo del día')).toBeVisible()
    expect(control.puts).toEqual([])
    expectEveryRequestScoped()
  })

  it('un borrador pendiente se guarda en el origen hasta el ACK antes de abrir el destino', async () => {
    const { control, notes } = installDailyBackend()
    const gate = held()
    control.putGate = gate.promise
    const { user } = renderApp(`/notes/${DATE}?space=work`)
    await note()
    await user.type(screen.getByLabelText('Borrador'), 'Solo trabajo')
    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    await user.click(screen.getByRole('button', { name: 'Notas de Personal' }))
    expect(
      await screen.findByText(/Guardando la nota del .* en Trabajo antes de cambiar a Personal/),
    ).toBeVisible()
    expect(screen.queryByTestId('nota')).not.toBeInTheDocument()
    expect(control.puts).toEqual(['work'])
    gate.release()
    expect(await screen.findByText('personal:')).toBeVisible()
    expect(control.puts).toEqual(['work'])
    expect(documentToPlainText(notes.get(`work:${DATE}`)!.content)).toBe('Solo trabajo')
    expect(notes.has(`personal:${DATE}`)).toBe(false)
    expectEveryRequestScoped()
  })

  it.each([409, 503])(
    'un %s al guardar conserva el borrador y el espacio de origen, sin escribir en el destino',
    async (status) => {
      const { control } = installDailyBackend()
      control.putStatus = status
      const { user } = renderApp(`/notes/${DATE}?space=work`)
      await note()
      await user.type(screen.getByLabelText('Borrador'), 'Pendiente')
      await user.click(screen.getByRole('button', { name: 'Notas de Personal' }))
      expect(await screen.findByText(/No se pudo guardar la nota del .* en Trabajo/)).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      await waitFor(() => expect(control.puts).toEqual(['work', 'work']))
      expect(await screen.findByText(/No se pudo guardar la nota/)).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Volver a Trabajo' }))
      expect(await note()).toHaveTextContent('work:Pendiente')
      expect(location()).toHaveTextContent('?space=work')
      expect(control.puts.every((space) => space === 'work')).toBe(true)
      expect(requests.some((request) => request.spaces[0] === 'personal')).toBe(false)
    },
  )

  it('una versión guardándose bloquea el cambio con explicación hasta su resultado, sin otro POST', async () => {
    const { control } = installDailyBackend({ [`work:${DATE}`]: 'Con versión' })
    const gate = held()
    control.versionGate = gate.promise
    const { user } = renderApp(`/notes/${DATE}?space=work`)
    expect(await screen.findByText('work:Con versión')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Guardar versión' }))
    await waitFor(() => expect(control.versions).toEqual(['work']))
    await user.click(screen.getByRole('button', { name: 'Notas de Personal' }))
    expect(
      await screen.findByText(/Se está guardando una versión .* El cambio a Personal espera/),
    ).toBeVisible()
    gate.release()
    expect(await screen.findByText('personal:')).toBeVisible()
    expect(control.versions).toEqual(['work'])
    expectEveryRequestScoped()
  })
})

describe('transición de voz, referencias y bloqueos', () => {
  it('voz con texto sin guardar: seguir aquí, 409 y descartar mantienen o cambian según la elección', async () => {
    installDailyBackend()
    const voice = installVoiceBackend()
    const { user } = renderApp('/voice?space=work')
    const text = await screen.findByRole('textbox', { name: 'Texto de la nota' })
    expect(await screen.findByText('Nota de voz de trabajo')).toBeVisible()
    await user.type(text, 'Idea de trabajo')
    await user.click(screen.getByRole('button', { name: 'Voz de Personal' }))
    expect(
      await screen.findByText('Hay cambios sin guardar en la nota de voz de Trabajo'),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Seguir aquí' }))
    expect(await screen.findByRole('textbox', { name: 'Texto de la nota' })).toHaveValue(
      'Idea de trabajo',
    )
    expect(location()).toHaveTextContent('/voice?space=work')

    voice.postStatus = 409
    await user.click(screen.getByRole('button', { name: 'Voz de Personal' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar y cambiar' }))
    expect(await screen.findByText(/No se pudieron guardar los cambios/)).toBeVisible()
    expect(voice.posts).toEqual(['work'])

    await user.click(screen.getByRole('button', { name: 'Descartar y cambiar' }))
    expect(await screen.findByRole('textbox', { name: 'Texto de la nota' })).toHaveValue('')
    expect(screen.queryByText('Nota de voz de trabajo')).not.toBeInTheDocument()
    expect(location()).toHaveTextContent('/voice?space=personal')
    expect(voice.posts).toEqual(['work'])
    expectEveryRequestScoped()
  })

  it('guardar y cambiar crea la nota en el origen y abre el destino solo con el ACK', async () => {
    installDailyBackend()
    const voice = installVoiceBackend()
    const { user } = renderApp('/voice?space=work')
    await user.type(await screen.findByRole('textbox', { name: 'Texto de la nota' }), 'Guardar')
    await user.click(screen.getByRole('button', { name: 'Voz de Personal' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar y cambiar' }))
    expect(await screen.findByRole('textbox', { name: 'Texto de la nota' })).toHaveValue('')
    expect(location()).toHaveTextContent('/voice?space=personal')
    expect(voice.posts).toEqual(['work'])
  })

  it('una transcripción en vuelo se cancela al cambiar y su respuesta tardía no llega al destino', async () => {
    installDailyBackend()
    installVoiceBackend()
    const track = Object.assign(new EventTarget(), { stop: vi.fn() })
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
    const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
    })
    const response = held()
    const transcriptions = vi.fn()
    server.use(
      mock.post('/api/v1/voice/transcriptions', async () => {
        transcriptions()
        await response.promise
        return HttpResponse.json({ text: 'Texto dictado en trabajo', language: 'es' })
      }),
    )
    try {
      const { user } = renderApp('/voice?space=work')
      await user.click(await screen.findByRole('button', { name: 'Grabar' }))
      await user.click(await screen.findByRole('button', { name: 'Detener y transcribir' }))
      await waitFor(() => expect(transcriptions).toHaveBeenCalledOnce())
      await user.click(screen.getByRole('button', { name: 'Voz de Personal' }))
      expect(await screen.findByText(/El audio pendiente se perderá si descartás/)).toBeVisible()
      expect(screen.getByRole('button', { name: 'Guardar y cambiar' })).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'Descartar y cambiar' }))
      expect(await screen.findByRole('textbox', { name: 'Texto de la nota' })).toHaveValue('')
      await act(async () => response.release())
      await act(async () => new Promise((resolve) => setTimeout(resolve, 50)))
      expect(screen.getByRole('textbox', { name: 'Texto de la nota' })).toHaveValue('')
      expect(screen.queryByText('Texto dictado en trabajo')).not.toBeInTheDocument()
      expect(transcriptions).toHaveBeenCalledOnce()
    } finally {
      if (original) Object.defineProperty(navigator, 'mediaDevices', original)
      else Reflect.deleteProperty(navigator, 'mediaDevices')
    }
  })

  it('referencias: el cambio limpia la vista, no mezcla listados y una respuesta tardía del origen se descarta', async () => {
    const auth = installAuthBackend({ user: USER })
    installReferenceBackend(auth, [
      { owner: USER.id, item: referenceItem({ title: 'Ref de trabajo' }), space: 'work' },
      {
        owner: USER.id,
        item: referenceItem({ id: '01900000-0000-7000-8000-000000000102', title: 'Ref personal' }),
        space: 'personal',
      },
    ])
    const gate = held()
    let holdWork = true
    server.use(
      mock.get('/api/v1/reference-items', async ({ request }) => {
        if (spaceOf(request) === 'work' && holdWork) {
          holdWork = false
          await gate.promise
        }
        return undefined
      }),
    )
    const { user } = renderApp('/reference?space=work')
    await waitFor(() => expect(requests.some((request) => request.spaces[0] === 'work')).toBe(true))
    await user.click(screen.getByRole('button', { name: 'Referencias de Personal' }))
    expect(await screen.findByText('Ref personal')).toBeVisible()
    await act(async () => gate.release())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(screen.queryByText('Ref de trabajo')).not.toBeInTheDocument()
    expectEveryRequestScoped()
  })

  it('una importación en vuelo impide enlaces a otro espacio y lo explica', async () => {
    installDailyBackend()
    const { user } = renderApp(`/notes/${DATE}?space=work`)
    expect(await note()).toHaveTextContent('work:')
    await user.click(screen.getByRole('button', { name: 'Importación' }))
    expect(await screen.findByRole('heading', { name: 'Importando' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Enlace a Personal' }))
    expect(
      await screen.findByText(/Hay una importación en curso\. No se puede salir de Datos/),
    ).toBeVisible()
    expect(location()).toHaveTextContent(/^\/lock$/)
    expect(requests.some((request) => request.spaces[0] === 'personal')).toBe(false)
  })
})
