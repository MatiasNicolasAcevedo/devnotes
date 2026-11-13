import { http, HttpResponse } from 'msw'
import {
  MAX_CONSECUTIVE_FAILURES,
  SERVICE_ACTIVITY_CAPABILITIES_PATH,
  SERVICE_ACTIVITY_PATH,
  SERVICE_ACTIVITY_PAUSE_PATH,
  SERVICE_ACTIVITY_START_PATH,
  type ProbeResult,
  type ServiceActivityStatus,
} from '../../features/serviceActivity/api'
import { CSRF_HEADER_NAME } from '../../services/csrf'
import { problemResponse } from '../factories'
import { server } from './server'

const NO_STORE = { 'Cache-Control': 'no-store' }

/** Sesión del backend de auth simulado: el servidor decide la cuenta por la cookie, no por lo que diga la SPA. */
interface AuthState {
  state: { user: { id: string } | null; csrfToken: string | null }
}

/** `mode` de un body exacto `{mode}`; cualquier otra forma no tiene modo. */
function modeOf(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || Object.keys(body).length !== 1) return undefined
  return 'mode' in body ? body.mode : undefined
}

export interface ServiceActivityBackendState {
  /** Única cuenta habilitada por el operador; null = interruptor apagado. */
  allowedOwner: string | null
  /** Fecha de servicio que calcula el servidor en su zona fija. */
  serviceDate: string
  /** Corte exclusivo de la ventana del día (medianoche siguiente en la zona del servicio, ISO UTC). */
  activeUntil: string
  activeDate: string | null
  pausedDate: string | null
  consecutiveFailures: number
  lastResult: ProbeResult
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  nextAttemptAt: string | null
}

export interface RecordedStart {
  body: unknown
  contentType: string | null
  csrf: string | null
}

/**
 * Backend simulado de la ventana diaria con la conducta de serviceactivity/web: capabilities autenticado y unión
 * estricta; estado/start/pause 404 para otra cuenta; start con body exacto `{mode}`; pause sin body; mutaciones con el
 * header CSRF igual al token vigente del backend de auth o 403. `visit` respeta la pausa del día y `resume` la levanta. Datos ficticios.
 */
export function createServiceActivityBackend(
  auth: AuthState,
  initial: Partial<ServiceActivityBackendState> = {},
) {
  const state: ServiceActivityBackendState = {
    allowedOwner: null,
    serviceDate: '2026-11-13',
    activeUntil: '2026-11-14T03:00:00Z',
    activeDate: null,
    pausedDate: null,
    consecutiveFailures: 0,
    lastResult: 'none',
    lastAttemptAt: null,
    lastSuccessAt: null,
    nextAttemptAt: null,
    ...initial,
  }
  const calls = { capabilities: 0, status: 0, pause: 0, starts: [] as RecordedStart[] }
  const gates: Partial<Record<'start' | 'pause' | 'status' | 'capabilities', Promise<void>>> = {}

  const sessionOwner = () => auth.state.user?.id ?? null
  const allowed = () => state.allowedOwner !== null && sessionOwner() === state.allowedOwner
  const active = () =>
    state.activeDate === state.serviceDate && state.pausedDate !== state.serviceDate

  function view(): ServiceActivityStatus {
    const isActive = active()
    return {
      active: isActive,
      activeUntil: isActive ? state.activeUntil : null,
      pausedToday: state.pausedDate === state.serviceDate,
      lastAttemptAt: state.lastAttemptAt,
      lastSuccessAt: state.lastSuccessAt,
      consecutiveFailures: state.consecutiveFailures,
      lastResult: state.lastResult,
      nextAttemptAt:
        isActive && state.consecutiveFailures < MAX_CONSECUTIVE_FAILURES
          ? state.nextAttemptAt
          : null,
    }
  }

  function guard(request: Request, mutation: boolean): Response | null {
    if (sessionOwner() === null) {
      return problemResponse(401, { title: 'Unauthorized', detail: 'Se requiere iniciar sesión.' })
    }
    if (mutation) {
      const header = request.headers.get(CSRF_HEADER_NAME)
      if (auth.state.csrfToken === null || header !== auth.state.csrfToken) {
        return problemResponse(403, {
          title: 'Forbidden',
          detail: 'No tenés permiso para realizar esta operación.',
        })
      }
    }
    if (!allowed()) return problemResponse(404, { detail: 'Recurso no disponible.' })
    return null
  }

  async function wait(kind: keyof typeof gates) {
    const gate = gates[kind]
    if (gate) {
      delete gates[kind]
      await gate
    }
  }

  const handlers = [
    http.get(SERVICE_ACTIVITY_CAPABILITIES_PATH, async () => {
      calls.capabilities += 1
      await wait('capabilities')
      if (sessionOwner() === null) {
        return problemResponse(401, {
          title: 'Unauthorized',
          detail: 'Se requiere iniciar sesión.',
        })
      }
      return HttpResponse.json(
        allowed() ? { available: true, serviceDate: state.serviceDate } : { available: false },
        { headers: NO_STORE },
      )
    }),
    http.get(SERVICE_ACTIVITY_PATH, async ({ request }) => {
      calls.status += 1
      await wait('status')
      return guard(request, false) ?? HttpResponse.json(view(), { headers: NO_STORE })
    }),
    http.post(SERVICE_ACTIVITY_START_PATH, async ({ request }) => {
      const text = await request.text()
      let body: unknown = text
      try {
        body = JSON.parse(text)
      } catch {
        // Se registra tal cual llegó.
      }
      calls.starts.push({
        body,
        contentType: request.headers.get('Content-Type'),
        csrf: request.headers.get(CSRF_HEADER_NAME),
      })
      await wait('start')
      const rejected = guard(request, true)
      if (rejected) return rejected
      const mode = modeOf(body)
      if (mode !== 'visit' && mode !== 'resume') {
        return problemResponse(400, { detail: 'La solicitud tiene datos inválidos.' })
      }
      if (mode === 'resume') {
        state.pausedDate = null
        state.activeDate = state.serviceDate
        state.consecutiveFailures = 0
      } else if (state.pausedDate !== state.serviceDate && !active()) {
        state.activeDate = state.serviceDate
        state.consecutiveFailures = 0
      }
      return HttpResponse.json(view(), { headers: NO_STORE })
    }),
    http.post(SERVICE_ACTIVITY_PAUSE_PATH, async ({ request }) => {
      calls.pause += 1
      const text = await request.text()
      await wait('pause')
      const rejected = guard(request, true)
      if (rejected) return rejected
      if (text !== '')
        return problemResponse(400, { detail: 'La solicitud tiene datos inválidos.' })
      state.pausedDate = state.serviceDate
      state.activeDate = null
      return HttpResponse.json(view(), { headers: NO_STORE })
    }),
  ]

  return {
    handlers,
    calls,
    state,
    /** Modos enviados a start, en orden. */
    modes: () => calls.starts.map((start) => modeOf(start.body) ?? start.body),
    /** Retiene la próxima respuesta de ese endpoint hasta llamar a la función devuelta. */
    hold(kind: keyof typeof gates) {
      let release = () => {}
      gates[kind] = new Promise<void>((resolve) => {
        release = resolve
      })
      return () => release()
    },
  }
}

export function installServiceActivityBackend(
  ...args: Parameters<typeof createServiceActivityBackend>
) {
  const backend = createServiceActivityBackend(...args)
  server.use(...backend.handlers)
  return backend
}
