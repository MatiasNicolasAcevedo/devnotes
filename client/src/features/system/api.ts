import { z } from 'zod'
import { http } from '../../services/http'

/** Contrato de `GET /actuator/health/readiness`: solo `UP` sin detalle cuenta como servidor disponible. */
const readinessSchema = z.strictObject({ status: z.literal('UP') })

export const systemQueryKeys = {
  readiness: ['system', 'readiness'] as const,
}

export function fetchReadiness(signal?: AbortSignal) {
  const deadline = AbortSignal.timeout(5000)
  return http.request('/actuator/health/readiness', readinessSchema, {
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  })
}
