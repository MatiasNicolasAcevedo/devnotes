import { http as mock, HttpResponse } from 'msw'
import {
  REFERENCE_PATH,
  referenceInputSchema,
  type ReferenceItem,
} from '../../features/reference/api'
import { problemResponse } from '../factories'
import { server } from './server'
import { type installAuthBackend } from './authBackend'
import { readSpaceParam, type Space } from '../../features/spaces/space'

/** Igual que el servidor: sin `space` es Trabajo; vacío, desconocido o repetido es 400. */
function requestSpace(request: Request): Space | null {
  const param = readSpaceParam(new URL(request.url).search)
  if (param.kind === 'missing') return 'work'
  return param.kind === 'valid' ? param.space : null
}

export function referenceItem(overrides: Partial<ReferenceItem> = {}): ReferenceItem {
  return {
    id: '01900000-0000-7000-8000-000000000101',
    title: 'Elemento ficticio',
    description: 'Texto plano',
    createdAt: '2026-10-18T12:00:00Z',
    updatedAt: '2026-10-18T12:00:00Z',
    ...overrides,
  }
}

/**
 * Component-only API fixture; real browser tests use PostgreSQL/OIDC. Filtra por dueño y espacio: un ID de otro
 * espacio da el mismo 404 que uno ajeno.
 */
export function installReferenceBackend(
  auth: ReturnType<typeof installAuthBackend>,
  initial: Array<{ owner: string; item: ReferenceItem; space?: Space }> = [],
) {
  const rows = new Map(
    initial.map(({ owner, item, space = 'work' }) => [item.id, { owner, item, space }]),
  )
  const calls = {
    list: new Map<string, number>(),
    get: 0,
    save: 0,
    remove: 0,
    spaces: [] as Array<string | null>,
  }
  const owns = (row: { owner: string; space: Space } | undefined, owner: string, space: Space) =>
    row?.owner === owner && row.space === space
  const badSpace = () => problemResponse(400)
  let sequence = 200
  const unauthorized = () => problemResponse(401)
  const missing = () => problemResponse(404, { detail: 'No se encontró el elemento.' })
  server.use(
    mock.get(REFERENCE_PATH, ({ request }) => {
      const owner = auth.state.user?.id
      if (!owner) return unauthorized()
      calls.list.set(owner, (calls.list.get(owner) ?? 0) + 1)
      const space = requestSpace(request)
      calls.spaces.push(space)
      if (!space) return badSpace()
      const params = new URL(request.url).searchParams
      const page = Number(params.get('page') ?? 0),
        size = Number(params.get('size') ?? 20)
      const all = [...rows.values()]
        .filter((row) => row.owner === owner && row.space === space)
        .map((row) => row.item)
        .reverse()
      return HttpResponse.json({
        content: all.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: all.length,
        totalPages: Math.ceil(all.length / size),
      })
    }),
    mock.get(`${REFERENCE_PATH}/:id`, ({ params, request }) => {
      calls.get++
      if (!auth.state.user) return unauthorized()
      const space = requestSpace(request)
      calls.spaces.push(space)
      if (!space) return badSpace()
      const row = rows.get(String(params.id))
      return row && owns(row, auth.state.user.id, space) ? HttpResponse.json(row.item) : missing()
    }),
    mock.post(REFERENCE_PATH, async ({ request }) => {
      calls.save++
      if (!auth.state.user) return unauthorized()
      const space = requestSpace(request)
      calls.spaces.push(space)
      if (!space) return badSpace()
      const parsed = referenceInputSchema.safeParse(await request.json())
      if (!parsed.success) return problemResponse(400)
      const item = referenceItem({
        ...parsed.data,
        id: `01900000-0000-7000-8000-${String(sequence++).padStart(12, '0')}`,
      })
      rows.set(item.id, { owner: auth.state.user.id, item, space })
      return HttpResponse.json(item, { status: 201 })
    }),
    mock.put(`${REFERENCE_PATH}/:id`, async ({ params, request }) => {
      calls.save++
      if (!auth.state.user) return unauthorized()
      const space = requestSpace(request)
      calls.spaces.push(space)
      if (!space) return badSpace()
      const row = rows.get(String(params.id))
      if (!row || !owns(row, auth.state.user.id, space)) return missing()
      const parsed = referenceInputSchema.safeParse(await request.json())
      if (!parsed.success) return problemResponse(400)
      row.item = { ...row.item, ...parsed.data, updatedAt: '2026-10-18T12:01:00Z' }
      return HttpResponse.json(row.item)
    }),
    mock.delete(`${REFERENCE_PATH}/:id`, ({ params, request }) => {
      calls.remove++
      if (!auth.state.user) return unauthorized()
      const space = requestSpace(request)
      calls.spaces.push(space)
      if (!space) return badSpace()
      const row = rows.get(String(params.id))
      if (!owns(row, auth.state.user.id, space)) return missing()
      rows.delete(String(params.id))
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return { rows, calls }
}
