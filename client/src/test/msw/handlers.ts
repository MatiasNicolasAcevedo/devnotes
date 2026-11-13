import { http, HttpResponse } from 'msw'

/** Respuestas por defecto (camino feliz). Cada test sobrescribe con `server.use(...)` lo que necesite. */
export const handlers = [
  http.get('/actuator/health/readiness', () => HttpResponse.json({ status: 'UP' })),
  // Como el interruptor del servidor viene apagado: ninguna cuenta ve la ventana diaria salvo que el test la habilite.
  http.get('/api/v1/service-activity/capabilities', () =>
    HttpResponse.json({ available: false }, { headers: { 'Cache-Control': 'no-store' } }),
  ),
]
