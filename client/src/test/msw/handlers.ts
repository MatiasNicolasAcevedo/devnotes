import { http, HttpResponse } from 'msw'

/** Respuestas por defecto (camino feliz). Cada test sobrescribe con `server.use(...)` lo que necesite. */
export const handlers = [
  http.get('/actuator/health/readiness', () => HttpResponse.json({ status: 'UP' })),
]
