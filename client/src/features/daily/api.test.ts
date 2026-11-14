import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError, UnexpectedResponseError } from '../../services/http'
import { problemResponse } from '../../test/factories'
import { server } from '../../test/msw/server'
import {
  dailyNoteDetailSchema,
  dailyNotePageSchema,
  dailyNoteKeys,
  getDailyNote,
  listDailyNotes,
  saveDailyNote,
  saveDailyNoteRequestSchema,
} from './api'
import { emptyDocument } from './editor/dailyDocument'
import type { Space } from '../spaces/space'

const DETAIL_PATH = '/api/v1/daily-notes/2024-01-15'
const LIST_PATH = '/api/v1/daily-notes'

function buildDetail(overrides = {}) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    date: '2024-01-15',
    content: emptyDocument(),
    revision: 1,
    updatedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  }
}

function buildPage(overrides = {}) {
  return {
    content: [{ date: '2024-01-15', updatedAt: '2024-01-15T10:00:00Z', revision: 1 }],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  }
}

describe('dailyNoteKeys', () => {
  it('incluye identidad y espacio en todas las keys para aislar cuentas y espacios', () => {
    const keys = dailyNoteKeys('owner-a', 'work')
    expect(keys.all).toEqual(['daily', 'owner-a', 'work'])
    expect(keys.detail('2024-01-01')).toEqual(['daily', 'owner-a', 'work', 'detail', '2024-01-01'])
    expect(keys.list()).toEqual(['daily', 'owner-a', 'work', 'list'])
    expect(keys.list(2)).toEqual(['daily', 'owner-a', 'work', 'list', 2])
  })

  it('keys de distintas identidades son independientes', () => {
    const a = dailyNoteKeys('owner-a', 'work')
    const b = dailyNoteKeys('owner-b', 'work')
    expect(a.detail('2024-01-01')).not.toEqual(b.detail('2024-01-01'))
    expect(a.list()).not.toEqual(b.list())
  })

  it('la misma fecha en Trabajo y Personal son keys distintas y ninguna es prefijo de la otra', () => {
    const work = dailyNoteKeys('owner-a', 'work')
    const personal = dailyNoteKeys('owner-a', 'personal')
    expect(work.detail('2024-01-01')).not.toEqual(personal.detail('2024-01-01'))
    expect(personal.detail('2024-01-01').slice(0, work.all.length)).not.toEqual(work.all)
  })
})

describe('espacio en el transporte diario', () => {
  function captureUrls() {
    const urls: URL[] = []
    server.use(
      mock.get(DETAIL_PATH, ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json(buildDetail())
      }),
      mock.get(LIST_PATH, ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json(buildPage())
      }),
      mock.put(DETAIL_PATH, ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json(buildDetail({ revision: 2 }))
      }),
    )
    return urls
  }

  it('GET, lista y PUT envían exactamente un space con el espacio capturado', async () => {
    const urls = captureUrls()
    await getDailyNote('personal', '2024-01-15')
    await listDailyNotes('personal', 1)
    await saveDailyNote('personal', '2024-01-15', emptyDocument(), 1)
    expect(urls).toHaveLength(3)
    for (const url of urls) expect(url.searchParams.getAll('space')).toEqual(['personal'])
    expect(urls[1].searchParams.get('page')).toBe('1')
  })

  it('un espacio fuera del enum se rechaza antes de llegar a la red', async () => {
    const urls = captureUrls()
    // Valor sin tipo, como llegaría de una URL o de almacenamiento no confiable.
    const bogus: Space = JSON.parse('"all"')
    await expect(getDailyNote(bogus, '2024-01-15')).rejects.toThrow('Espacio no válido')
    await expect(saveDailyNote(bogus, '2024-01-15', emptyDocument(), 1)).rejects.toThrow(
      'Espacio no válido',
    )
    expect(urls).toHaveLength(0)
  })
})

describe('getDailyNote', () => {
  it('obtiene el detalle validado por fecha', async () => {
    const detail = buildDetail({ revision: 3 })
    server.use(mock.get(DETAIL_PATH, () => HttpResponse.json(detail)))

    const result = await getDailyNote('work', '2024-01-15')

    expect(result).toEqual(detail)
    expect(result.revision).toBe(3)
  })

  it('distingue 404 (ausencia explícita) de otros errores', async () => {
    server.use(mock.get(DETAIL_PATH, () => problemResponse(404, { title: 'Not Found' })))

    const error = await getDailyNote('work', '2024-01-15').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
  })

  it('no convierte 403 en vacío', async () => {
    server.use(mock.get(DETAIL_PATH, () => problemResponse(403, { title: 'Forbidden' })))

    const error = await getDailyNote('work', '2024-01-15').catch((e: unknown) => e)

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

    await expect(getDailyNote('work', '2024-01-15')).rejects.toBeInstanceOf(UnexpectedResponseError)
  })

  it('rechaza fecha inválida en la ruta', async () => {
    server.use(mock.get('/api/v1/daily-notes/2024-13-01', () => problemResponse(400)))

    await expect(getDailyNote('work', '2024-13-01')).rejects.toBeInstanceOf(ApiError)
  })

  it('propaga NetworkError sin convertir', async () => {
    server.use(mock.get(DETAIL_PATH, () => HttpResponse.error()))

    await expect(getDailyNote('work', '2024-01-15')).rejects.toBeInstanceOf(NetworkError)
  })

  it('propaga sessionIsCurrent al cliente HTTP (guarda de 401)', async () => {
    // sessionIsCurrent solo afecta si se publica el evento de sesión en http.ts
    // El hook useDailyNoteQuery usa enabled para evitar la query si la sesión expiró
    // Aquí verificamos que el parámetro llega al http.request sin errores
    server.use(mock.get(DETAIL_PATH, () => HttpResponse.json(buildDetail())))

    const result = await getDailyNote('work', '2024-01-15', undefined, () => false)
    expect(result.date).toBe('2024-01-15')
  })

  it('cancela lectura con AbortSignal', async () => {
    const controller = new AbortController()
    controller.abort()

    const error = await getDailyNote('work', '2024-01-15', controller.signal).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(Error)
    expect((error as DOMException).name).toBe('AbortError')
  })
})

describe('listDailyNotes', () => {
  it('lista notas paginadas sin parámetro', async () => {
    const page = buildPage()
    server.use(mock.get(LIST_PATH, () => HttpResponse.json(page)))

    const result = await listDailyNotes('work')

    expect(result).toEqual(page)
    expect(result.content).toHaveLength(1)
  })

  it('lista con página específica', async () => {
    let capturedPath = ''
    server.use(
      mock.get(LIST_PATH, ({ request }) => {
        capturedPath = new URL(request.url).searchParams.get('page') ?? ''
        return HttpResponse.json(buildPage({ page: 1, content: [] }))
      }),
    )

    await listDailyNotes('work', 1)

    expect(capturedPath).toBe('1')
  })

  it('rechaza respuesta paginada con campos extra', async () => {
    server.use(
      mock.get(LIST_PATH, () =>
        HttpResponse.json({
          ...buildPage(),
          extra: 'no permitido',
        }),
      ),
    )

    await expect(listDailyNotes('work')).rejects.toBeInstanceOf(UnexpectedResponseError)
  })
})

describe('saveDailyNote', () => {
  it('guarda con PUT, CSRF y revisión exacta', async () => {
    // Simular cookie CSRF para que http.ts envíe el header
    document.cookie = 'XSRF-TOKEN=csrf-test-token'

    let capturedBody: unknown = null
    server.use(
      mock.put(DETAIL_PATH, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(buildDetail({ revision: 2 }))
      }),
    )

    const result = await saveDailyNote('work', '2024-01-15', emptyDocument(), 1)

    expect(result.revision).toBe(2)
    expect(capturedBody).toEqual({
      content: emptyDocument(),
      expectedRevision: 1,
    })
    // owner no se envía al backend
    expect(capturedBody).not.toHaveProperty('owner')
  })

  it('rechaza DTO con campos desconocidos', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token'

    await expect(
      saveDailyNote('work', '2024-01-15', { ...emptyDocument(), extra: 'bad' }, 1),
    ).rejects.toThrow('Solicitud inválida')
  })

  it('rechaza revisión no segura (fracción)', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token'

    await expect(saveDailyNote('work', '2024-01-15', emptyDocument(), 1.5)).rejects.toThrow(
      'Solicitud inválida',
    )
  })

  it('rechaza revisión negativa', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token'

    await expect(saveDailyNote('work', '2024-01-15', emptyDocument(), -1)).rejects.toThrow(
      'Solicitud inválida',
    )
  })

  it('propaga 409 sin éxito ni reenvío automático', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token'
    let callCount = 0
    server.use(
      mock.put(DETAIL_PATH, () => {
        callCount++
        return problemResponse(409, { title: 'Conflict' })
      }),
    )

    const error = await saveDailyNote('work', '2024-01-15', emptyDocument(), 1).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(409)
    expect(callCount).toBe(1) // sin reenvío
  })

  it('propaga 400 sin éxito', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token'
    server.use(mock.put(DETAIL_PATH, () => problemResponse(400, { title: 'Bad Request' })))

    const error = await saveDailyNote('work', '2024-01-15', emptyDocument(), 1).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
  })

  it('propaga 401 sin éxito', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token'
    server.use(mock.put(DETAIL_PATH, () => problemResponse(401, { title: 'Unauthorized' })))

    const error = await saveDailyNote('work', '2024-01-15', emptyDocument(), 1).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
  })

  it('propaga 403 sin éxito ni reenvío', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token'
    let callCount = 0
    server.use(
      mock.put(DETAIL_PATH, () => {
        callCount++
        return problemResponse(403, { title: 'Forbidden' })
      }),
    )

    const error = await saveDailyNote('work', '2024-01-15', emptyDocument(), 1).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(403)
    expect(callCount).toBe(1)
  })

  it('propaga 500 (red) sin éxito', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token'
    server.use(
      mock.put(DETAIL_PATH, () => problemResponse(500, { title: 'Internal Server Error' })),
    )

    const error = await saveDailyNote('work', '2024-01-15', emptyDocument(), 1).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(500)
  })
})

describe('saveDailyNoteRequestSchema', () => {
  it('acepta body válido con revisión 0 (creación)', () => {
    const result = saveDailyNoteRequestSchema.safeParse({
      content: emptyDocument(),
      expectedRevision: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza campos extra en el body', () => {
    const result = saveDailyNoteRequestSchema.safeParse({
      content: emptyDocument(),
      expectedRevision: 1,
      owner: 'no permitido',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza revisión como string', () => {
    const result = saveDailyNoteRequestSchema.safeParse({
      content: emptyDocument(),
      expectedRevision: '1',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza revisión booleana', () => {
    const result = saveDailyNoteRequestSchema.safeParse({
      content: emptyDocument(),
      expectedRevision: true,
    })
    expect(result.success).toBe(false)
  })
})

describe('dailyNoteDetailSchema', () => {
  it('rechaza campos extra en el detalle', () => {
    const result = dailyNoteDetailSchema.safeParse({
      ...buildDetail(),
      extra: 'no permitido',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza revisión fraccionaria en respuesta', () => {
    const result = dailyNoteDetailSchema.safeParse({
      ...buildDetail(),
      revision: 1.5,
    })
    expect(result.success).toBe(false)
  })
})

describe('dailyNotePageSchema', () => {
  it('rechaza campos extra en la página', () => {
    const result = dailyNotePageSchema.safeParse({
      ...buildPage(),
      extra: 'no permitido',
    })
    expect(result.success).toBe(false)
  })
})
