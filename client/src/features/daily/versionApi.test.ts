import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError, UnexpectedResponseError } from '../../services/http'
import { problemResponse } from '../../test/factories'
import { server } from '../../test/msw/server'
import {
  dailyVersionKeys,
  getDailyVersion,
  listDailyVersions,
} from './versionApi'
import { emptyDocument } from './editor/dailyDocument'

const LIST_PATH = '/api/v1/daily-versions'
const DETAIL_PATH = '/api/v1/daily-versions/2024-01-15'

function buildPage(overrides = {}) {
  return {
    content: [
      { date: '2024-01-15', savedAt: '2024-01-15T10:00:00Z', sourceRevision: 3 },
      { date: '2024-01-10', savedAt: '2024-01-10T08:30:00Z', sourceRevision: 1 },
    ],
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
    ...overrides,
  }
}

function buildDetail(overrides = {}) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    date: '2024-01-15',
    content: emptyDocument(),
    sourceRevision: 3,
    savedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  }
}

describe('dailyVersionKeys', () => {
  it('incluye la identidad en todas las keys para aislar entre cuentas', () => {
    const keys = dailyVersionKeys('owner-a')
    expect(keys.all).toEqual(['daily', 'owner-a', 'versions'])
    expect(keys.detail('2024-01-01')).toEqual(['daily', 'owner-a', 'versions', 'detail', '2024-01-01'])
    expect(keys.list()).toEqual(['daily', 'owner-a', 'versions', 'list'])
    expect(keys.list(2)).toEqual(['daily', 'owner-a', 'versions', 'list', 2])
  })

  it('keys de distintas identidades son independientes', () => {
    const a = dailyVersionKeys('owner-a')
    const b = dailyVersionKeys('owner-b')
    expect(a.detail('2024-01-01')).not.toEqual(b.detail('2024-01-01'))
    expect(a.list()).not.toEqual(b.list())
  })

  it('keys de versiones son distintas a las de notas', () => {
    const v = dailyVersionKeys('owner-a')
    expect(v.all).not.toEqual(['daily', 'owner-a'])
  })
})

describe('listDailyVersions', () => {
  it('obtiene la lista paginada validada', async () => {
    const page = buildPage({ totalElements: 5, totalPages: 1 })
    server.use(mock.get(LIST_PATH, () => HttpResponse.json(page)))

    const result = await listDailyVersions()

    expect(result).toEqual(page)
    expect(result.content.length).toBe(2)
  })

  it('soporta parámetro page', async () => {
    const page = buildPage({ page: 1, content: [] })
    server.use(mock.get(`${LIST_PATH}?page=1`, () => HttpResponse.json(page)))

    const result = await listDailyVersions(1)

    expect(result.page).toBe(1)
    expect(result.content).toEqual([])
  })

  it('distingue 404 de otros errores', async () => {
    server.use(mock.get(LIST_PATH, () => problemResponse(404, { title: 'Not Found' })))

    const error = await listDailyVersions().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
  })

  it('no convierte 403 en vacío', async () => {
    server.use(mock.get(LIST_PATH, () => problemResponse(403, { title: 'Forbidden' })))

    const error = await listDailyVersions().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(403)
  })

  it('rechaza respuesta fuera de contrato (campos extra)', async () => {
    server.use(
      mock.get(LIST_PATH, () =>
        HttpResponse.json({
          ...buildPage(),
          extraField: 'no permitido',
        }),
      ),
    )

    await expect(listDailyVersions()).rejects.toBeInstanceOf(UnexpectedResponseError)
  })

  it('propaga NetworkError sin convertir', async () => {
    server.use(mock.get(LIST_PATH, () => HttpResponse.error()))

    await expect(listDailyVersions()).rejects.toBeInstanceOf(NetworkError)
  })

  it('rechaza sourceRevision no positivo', async () => {
    server.use(
      mock.get(LIST_PATH, () =>
        HttpResponse.json({
          ...buildPage(),
          content: [{ date: '2024-01-15', savedAt: '2024-01-15T10:00:00Z', sourceRevision: 0 }],
        }),
      ),
    )

    await expect(listDailyVersions()).rejects.toBeInstanceOf(UnexpectedResponseError)
  })
})

describe('getDailyVersion', () => {
  it('obtiene el detalle validado por fecha', async () => {
    const detail = buildDetail({ sourceRevision: 5 })
    server.use(mock.get(DETAIL_PATH, () => HttpResponse.json(detail)))

    const result = await getDailyVersion('2024-01-15')

    expect(result).toEqual(detail)
    expect(result.sourceRevision).toBe(5)
  })

  it('distingue 404 (sin versión guardada) de otros errores', async () => {
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    const error = await getDailyVersion('2024-01-15').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
  })

  it('no convierte 403 en vacío', async () => {
    server.use(mock.get(DETAIL_PATH, () => problemResponse(403, { title: 'Forbidden' })))

    const error = await getDailyVersion('2024-01-15').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(403)
  })

  it('rechaza respuesta fuera de contrato (campos extra)', async () => {
    server.use(
      mock.get(DETAIL_PATH, () =>
        HttpResponse.json({
          ...buildDetail(),
          extraField: 'no permitido',
        }),
      ),
    )

    await expect(getDailyVersion('2024-01-15')).rejects.toBeInstanceOf(UnexpectedResponseError)
  })

  it('propaga NetworkError sin convertir', async () => {
    server.use(mock.get(DETAIL_PATH, () => HttpResponse.error()))

    await expect(getDailyVersion('2024-01-15')).rejects.toBeInstanceOf(NetworkError)
  })

  it('valida content contra DailyContentSchema', async () => {
    server.use(
      mock.get(DETAIL_PATH, () =>
        HttpResponse.json({
          ...buildDetail(),
          content: { type: 'doc', content: [] },
        }),
      ),
    )

    await expect(getDailyVersion('2024-01-15')).rejects.toBeInstanceOf(UnexpectedResponseError)
  })
})
