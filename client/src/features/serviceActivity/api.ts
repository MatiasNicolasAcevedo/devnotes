import { z } from 'zod'
import { http } from '../../services/http'
import { withCsrfRenewal } from '../auth/api'

/**
 * Ventana diaria de actividad del servidor (S-111). Solo la cuenta habilitada por el operador la ve; el servidor
 * decide la fecha de servicio y el corte, nunca el reloj del dispositivo. Ninguna petición envía URL, intervalo,
 * fecha ni plazo.
 */
export const SERVICE_ACTIVITY_PATH = '/api/v1/service-activity'
export const SERVICE_ACTIVITY_CAPABILITIES_PATH = `${SERVICE_ACTIVITY_PATH}/capabilities`
export const SERVICE_ACTIVITY_START_PATH = `${SERVICE_ACTIVITY_PATH}/start`
export const SERVICE_ACTIVITY_PAUSE_PATH = `${SERVICE_ACTIVITY_PATH}/pause`

/** Zona fija del servicio: el corte y las horas del detalle se muestran en ella, no en la zona del dispositivo. */
export const SERVICE_ZONE = 'America/Argentina/Buenos_Aires'

/** Unión estricta de `GET capabilities`: `serviceDate` llega solo con `available: true`. */
export const capabilitiesSchema = z.discriminatedUnion('available', [
  z.strictObject({ available: z.literal(false) }),
  z.strictObject({ available: z.literal(true), serviceDate: z.iso.date() }),
])

export type ServiceActivityCapabilities = z.infer<typeof capabilitiesSchema>

export const probeResults = [
  'none',
  'up',
  'timeout',
  'http_error',
  'invalid_response',
  'unavailable',
] as const

export type ProbeResult = (typeof probeResults)[number]

const instant = z.iso.datetime().nullable()

/** Estado de la ventana: todos los campos llegan siempre; los instantes son ISO UTC o null. */
export const statusSchema = z.strictObject({
  active: z.boolean(),
  activeUntil: instant,
  pausedToday: z.boolean(),
  lastAttemptAt: instant,
  lastSuccessAt: instant,
  consecutiveFailures: z.number().int().nonnegative(),
  lastResult: z.enum(probeResults),
  nextAttemptAt: instant,
})

export type ServiceActivityStatus = z.infer<typeof statusSchema>

/** Mismo límite que el servidor: con tres fallos seguidos la secuencia se detiene hasta un reintento explícito. */
export const MAX_CONSECUTIVE_FAILURES = 3

export type StartMode = 'visit' | 'resume'

/**
 * Datos privados de la cuenta: fuera del prefijo `auth`, así el cierre de sesión o el cambio de identidad los
 * descarta. El id del dueño en la key separa identidades aunque convivan en la cache un instante.
 */
export const serviceActivityQueryKeys = {
  all: ['serviceActivity'] as const,
  capabilities: (owner: string) => ['serviceActivity', owner, 'capabilities'] as const,
  status: (owner: string) => ['serviceActivity', owner, 'status'] as const,
}

interface ScopedRequest {
  signal?: AbortSignal
  /** Un 401 de una identidad anterior no debe dar por terminada la sesión vigente. */
  sessionIsCurrent?: () => boolean
}

export function fetchCapabilities({ signal, sessionIsCurrent }: ScopedRequest = {}) {
  return http.request(SERVICE_ACTIVITY_CAPABILITIES_PATH, capabilitiesSchema, {
    signal,
    sessionIsCurrent,
  })
}

export function fetchStatus({ signal, sessionIsCurrent }: ScopedRequest = {}) {
  return http.request(SERVICE_ACTIVITY_PATH, statusSchema, { signal, sessionIsCurrent })
}

/** `visit` es la activación automática del día y respeta la pausa; `resume` solo sale de una acción explícita. */
export function startWindow(mode: StartMode, { sessionIsCurrent }: ScopedRequest = {}) {
  return withCsrfRenewal(() =>
    http.request(SERVICE_ACTIVITY_START_PATH, statusSchema, {
      method: 'POST',
      body: { mode },
      sessionIsCurrent,
    }),
  )
}

/** Pausa el día de servicio; el POST va sin cuerpo. */
export function pauseWindow({ sessionIsCurrent }: ScopedRequest = {}) {
  return withCsrfRenewal(() =>
    http.request(SERVICE_ACTIVITY_PAUSE_PATH, statusSchema, { method: 'POST', sessionIsCurrent }),
  )
}
