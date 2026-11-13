import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../../services/csrf'
import { ApiError, UnexpectedResponseError } from '../../services/http'
import { buildAuthUser } from '../../test/factories'
import { server } from '../../test/msw/server'
import { installServiceActivityBackend } from '../../test/msw/serviceActivityBackend'
import { CsrfRenewalRequiredError } from '../auth/api'
import {
  SERVICE_ACTIVITY_CAPABILITIES_PATH,
  SERVICE_ACTIVITY_PATH,
  SERVICE_ACTIVITY_START_PATH,
  capabilitiesSchema,
  fetchCapabilities,
  fetchStatus,
  pauseWindow,
  startWindow,
  statusSchema,
} from './api'

const OWNER = buildAuthUser({ id: '01900000-0000-7000-8000-0000000000aa' })

const STATUS = {
  active: true,
  activeUntil: '2026-11-14T03:00:00Z',
  pausedToday: false,
  lastAttemptAt: '2026-11-13T22:00:00.123456Z',
  lastSuccessAt: null,
  consecutiveFailures: 0,
  lastResult: 'up',
  nextAttemptAt: null,
}

function setCsrfCookie(token: string) {
  document.cookie = `${CSRF_COOKIE_NAME}=${token}; Path=/`
  return token
}

describe('contrato de capabilities', () => {
  it.each([[{ available: false }], [{ available: true, serviceDate: '2026-11-13' }]])(
    'acepta la unión estricta %j',
    (body) => {
      expect(capabilitiesSchema.safeParse(body).success).toBe(true)
    },
  )

  it.each([
    ['available true sin fecha', { available: true }],
    ['available false con fecha', { available: false, serviceDate: '2026-11-13' }],
    ['fecha con hora', { available: true, serviceDate: '2026-11-13T00:00:00Z' }],
    ['fecha inexistente', { available: true, serviceDate: '2026-02-30' }],
    ['campo extra (owner)', { available: true, serviceDate: '2026-11-13', owner: 'x' }],
    ['available como texto', { available: 'true', serviceDate: '2026-11-13' }],
  ])('rechaza %s', (_case, body) => {
    expect(capabilitiesSchema.safeParse(body).success).toBe(false)
  })

  it('una respuesta fuera de contrato no se interpreta como disponible', async () => {
    server.use(
      mock.get(SERVICE_ACTIVITY_CAPABILITIES_PATH, () =>
        HttpResponse.json({ available: true, serviceDate: null }),
      ),
    )
    await expect(fetchCapabilities()).rejects.toBeInstanceOf(UnexpectedResponseError)
  })
})

describe('contrato de estado', () => {
  it('acepta el estado completo con instantes ISO UTC o null', () => {
    expect(statusSchema.safeParse(STATUS).success).toBe(true)
  })

  it.each([
    ['resultado desconocido', { ...STATUS, lastResult: 'ok' }],
    ['campo faltante', { ...STATUS, nextAttemptAt: undefined }],
    ['instante con zona local', { ...STATUS, activeUntil: '2026-11-14T00:00:00-03:00' }],
    ['fallos negativos', { ...STATUS, consecutiveFailures: -1 }],
    ['campo extra', { ...STATUS, ownerId: OWNER.id }],
  ])('rechaza %s', (_case, body) => {
    expect(statusSchema.safeParse(body).success).toBe(false)
  })

  it('404 de otra cuenta llega como ApiError sin datos', async () => {
    const backend = installServiceActivityBackend({ state: { user: OWNER, csrfToken: null } })
    expect(backend.state.allowedOwner).toBeNull()
    const error = await fetchStatus().catch((failure: unknown) => failure)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404 })
  })
})

describe('mutaciones', () => {
  it('start envía exactamente {mode} con JSON y el header CSRF vigente', async () => {
    const csrfToken = setCsrfCookie('csrf-ficticio-1')
    const backend = installServiceActivityBackend(
      { state: { user: OWNER, csrfToken } },
      { allowedOwner: OWNER.id },
    )

    const visit = await startWindow('visit')
    const resume = await startWindow('resume')

    expect(visit.active).toBe(true)
    expect(resume.active).toBe(true)
    expect(backend.calls.starts).toEqual([
      { body: { mode: 'visit' }, contentType: 'application/json', csrf: 'csrf-ficticio-1' },
      { body: { mode: 'resume' }, contentType: 'application/json', csrf: 'csrf-ficticio-1' },
    ])
  })

  it('pause va sin cuerpo y con CSRF', async () => {
    setCsrfCookie('csrf-ficticio-2')
    let seen: { body: string; csrf: string | null } | null = null
    server.use(
      mock.post(`${SERVICE_ACTIVITY_PATH}/pause`, async ({ request }) => {
        seen = { body: await request.text(), csrf: request.headers.get(CSRF_HEADER_NAME) }
        return HttpResponse.json({ ...STATUS, active: false, activeUntil: null, pausedToday: true })
      }),
    )

    const status = await pauseWindow()

    expect(status.pausedToday).toBe(true)
    expect(seen).toEqual({ body: '', csrf: 'csrf-ficticio-2' })
  })

  it('un 403 renueva el token y no reenvía la activación', async () => {
    let starts = 0
    let renewals = 0
    server.use(
      mock.post(SERVICE_ACTIVITY_START_PATH, () => {
        starts += 1
        return HttpResponse.json({ status: 403 }, { status: 403 })
      }),
      mock.get('/api/v1/auth/csrf', () => {
        renewals += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(startWindow('visit')).rejects.toBeInstanceOf(CsrfRenewalRequiredError)
    expect(starts).toBe(1)
    expect(renewals).toBe(1)
  })
})
