import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { problemResponse } from '../../test/factories'
import { ApiError, UnexpectedResponseError, createHttpClient } from '../../services/http'
import {
  fetchVoiceCapabilities,
  fetchVoiceNote,
  fetchVoiceNotes,
  createVoiceNote,
  updateVoiceNote,
  deleteVoiceNote,
  voiceCapabilitiesSchema,
  voiceNoteDetailSchema,
  voiceNotePageSchema,
  transcriptionResponseSchema,
  voiceQueryKeys,
} from './api'

const CAPABILITIES_PATH = '/api/v1/voice/capabilities'
const NOTES_PATH = '/api/v1/voice-notes'

function buildCapabilities() {
  return {
    recordingEnabled: false,
    reason: 'disabled',
    maxDurationSeconds: 600,
    maxAudioBytes: 20_971_520,
    maxTextLength: 50_000,
    mimeTypes: ['audio/webm'],
    language: 'es',
  }
}

function buildNoteDetail(overrides = {}) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    text: 'Texto de prueba',
    revision: 1,
    createdAt: '2026-11-01T12:00:00.000000Z',
    updatedAt: '2026-11-01T12:00:00.000000Z',
    ...overrides,
  }
}

function buildNoteListItem(overrides = {}) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    excerpt: 'Texto de prueba',
    revision: 1,
    createdAt: '2026-11-01T12:00:00.000000Z',
    updatedAt: '2026-11-01T12:00:00.000000Z',
    ...overrides,
  }
}

describe('voice schemas', () => {
  it('voiceCapabilitiesSchema acepta respuesta del server', () => {
    const result = voiceCapabilitiesSchema.safeParse(buildCapabilities())
    expect(result.success).toBe(true)
  })

  it('voiceCapabilitiesSchema rechaza reason no nulo ni string', () => {
    const result = voiceCapabilitiesSchema.safeParse({
      ...buildCapabilities(),
      reason: 123,
    })
    expect(result.success).toBe(false)
  })

  it('voiceNoteDetailSchema valida campos obligatorios', () => {
    const result = voiceNoteDetailSchema.safeParse(buildNoteDetail())
    expect(result.success).toBe(true)
  })

  it('voiceNoteDetailSchema rechaza texto ausente', () => {
    const note = buildNoteDetail()
    delete (note as Record<string, unknown>).text
    const result = voiceNoteDetailSchema.safeParse(note)
    expect(result.success).toBe(false)
  })

  it('voiceNotePageSchema valida página vacía', () => {
    const page = {
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    }
    const result = voiceNotePageSchema.safeParse(page)
    expect(result.success).toBe(true)
  })

  it('voiceNotePageSchema rechaza size inválido', () => {
    const page = {
      content: [],
      page: 0,
      size: 0,
      totalElements: 0,
      totalPages: 0,
    }
    const result = voiceNotePageSchema.safeParse(page)
    expect(result.success).toBe(false)
  })

  it('transcriptionResponseSchema valida texto y lenguaje', () => {
    const result = transcriptionResponseSchema.safeParse({ text: 'hola', language: 'es' })
    expect(result.success).toBe(true)
  })

  it('transcriptionResponseSchema rechaza texto ausente', () => {
    const result = transcriptionResponseSchema.safeParse({ language: 'es' })
    expect(result.success).toBe(false)
  })
})

const SCOPE = { owner: 'owner-a', space: 'work' } as const

describe('voiceQueryKeys', () => {
  it('all no incluye prefijo auth', () => {
    expect(voiceQueryKeys.all[0]).not.toBe('auth')
  })

  it('detail incluye identidad, espacio e id en la key', () => {
    const key = voiceQueryKeys.detail(SCOPE, 'note-1')
    expect(key).toEqual(['voice', 'owner-a', 'work', 'detail', 'note-1'])
  })

  it('list con params incluye los parámetros', () => {
    const key = voiceQueryKeys.list(SCOPE, { page: 1, size: 10 })
    expect(key[4]).toEqual({ page: 1, size: 10 })
  })

  it('list sin params usa null', () => {
    const key = voiceQueryKeys.list(SCOPE)
    expect(key[4]).toBeNull()
  })

  it('el contenido de Trabajo y Personal no comparte keys; la capacidad sigue siendo global', () => {
    const personal = { owner: 'owner-a', space: 'personal' } as const
    expect(voiceQueryKeys.detail(SCOPE, 'n')).not.toEqual(voiceQueryKeys.detail(personal, 'n'))
    expect(voiceQueryKeys.lists(personal).slice(0, 3)).not.toEqual(voiceQueryKeys.scope(SCOPE))
    expect(voiceQueryKeys.capabilities).toEqual(['voice', 'capabilities'])
  })
})

describe('fetchVoiceCapabilities', () => {
  it('devuelve capacidades validadas', async () => {
    server.use(mock.get(CAPABILITIES_PATH, () => HttpResponse.json(buildCapabilities())))
    const caps = await fetchVoiceCapabilities()
    expect(caps).toEqual(buildCapabilities())
  })

  it('rechaza detalle inválido con UnexpectedResponseError', async () => {
    server.use(mock.get(CAPABILITIES_PATH, () => HttpResponse.json({ recordingEnabled: 'yes' })))
    await expect(fetchVoiceCapabilities()).rejects.toBeInstanceOf(UnexpectedResponseError)
  })
})

describe('transcribeAudio', () => {
  it('envía FormData con nombre recording.webm', async () => {
    let bodyWasFormData = false
    const capturedFetch = vi.fn().mockImplementation(async (_input, init) => {
      const b = (init as { body?: FormData }).body
      bodyWasFormData = b instanceof FormData
      return Promise.resolve(
        new Response(JSON.stringify({ text: 'transcrito', language: 'es' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    const client = createHttpClient({ fetch: capturedFetch as typeof fetch })
    const fd = new FormData()
    fd.append('file', new Blob(['fake-audio'], { type: 'audio/webm' }), 'recording.webm')

    const result = await client.request(
      '/api/v1/voice/transcriptions',
      transcriptionResponseSchema,
      {
        method: 'POST',
        formData: fd,
      },
    )

    expect(result).toEqual({ text: 'transcrito', language: 'es' })
    expect(bodyWasFormData).toBe(true)
  })

  it('convierte 429 en ApiError', async () => {
    const capturedFetch = vi.fn().mockImplementation(async () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            type: 'about:blank',
            title: 'Too Many Requests',
            status: 429,
            detail: 'Servicio ocupado.',
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    )
    const client = createHttpClient({ fetch: capturedFetch as typeof fetch })
    const fd = new FormData()
    fd.append('file', new Blob(['x'], { type: 'audio/webm' }), 'recording.webm')
    const error = await client
      .request('/api/v1/voice/transcriptions', transcriptionResponseSchema, {
        method: 'POST',
        formData: fd,
      })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 429 })
  })

  it('respeta el aborto del caller', async () => {
    const controller = new AbortController()
    const capturedFetch = vi.fn().mockImplementation((_input, init) => {
      const signal = (init as { signal?: AbortSignal }).signal
      return new Promise<never>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })
    const client = createHttpClient({ fetch: capturedFetch as typeof fetch })
    const fd = new FormData()
    fd.append('file', new Blob(['x'], { type: 'audio/webm' }), 'recording.webm')
    const pending = client.request('/api/v1/voice/transcriptions', transcriptionResponseSchema, {
      method: 'POST',
      formData: fd,
      signal: controller.signal,
    })
    controller.abort()
    const error = await pending.catch((e: unknown) => e)
    expect(error).toMatchObject({ name: 'AbortError' })
  })
})

describe('fetchVoiceNotes', () => {
  it('devuelve página vacía por defecto', async () => {
    server.use(
      mock.get(NOTES_PATH, () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        }),
      ),
    )
    const page = await fetchVoiceNotes('work')
    expect(page).toEqual({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })
  })

  it('pasa parámetros de paginación', async () => {
    let seenPath = ''
    server.use(
      mock.get(NOTES_PATH, ({ request }) => {
        seenPath = request.url
        return HttpResponse.json({
          content: [buildNoteListItem()],
          page: 1,
          size: 10,
          totalElements: 1,
          totalPages: 1,
        })
      }),
    )
    await fetchVoiceNotes('work', { page: 1, size: 10 })
    expect(seenPath).toContain('page=1')
    expect(seenPath).toContain('size=10')
    expect(new URL(seenPath).searchParams.getAll('space')).toEqual(['work'])
  })
})

describe('createVoiceNote', () => {
  it('crea nota con texto y devuelve detalle', async () => {
    const detail = buildNoteDetail()
    server.use(
      mock.post(NOTES_PATH, async ({ request }) => {
        const body = (await request.json()) as { text: string }
        return HttpResponse.json({ ...detail, text: body.text }, { status: 201 })
      }),
    )

    const result = await createVoiceNote('work', 'Nuevo texto')
    expect(result.text).toBe('Nuevo texto')
    expect(result.revision).toBe(1)
  })

  it('rechaza 400 de validación como ApiError', async () => {
    server.use(mock.post(NOTES_PATH, () => problemResponse(400, { detail: 'Solicitud inválida.' })))
    const error = await createVoiceNote('work', '').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400 })
  })
})

describe('fetchVoiceNote', () => {
  it('devuelve detalle por id', async () => {
    const detail = buildNoteDetail()
    server.use(mock.get(`${NOTES_PATH}/:id`, () => HttpResponse.json(detail)))
    const result = await fetchVoiceNote('work', detail.id)
    expect(result).toEqual(detail)
  })

  it('convierte 404 en ApiError', async () => {
    server.use(mock.get(`${NOTES_PATH}/:id`, () => problemResponse(404)))
    const error = await fetchVoiceNote('work', 'no-exists').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404 })
  })
})

describe('updateVoiceNote', () => {
  it('actualiza con CAS y devuelve nueva revisión', async () => {
    server.use(
      mock.put(`${NOTES_PATH}/:id`, async ({ request }) => {
        const body = (await request.json()) as { text: string; expectedRevision: number }
        return HttpResponse.json({
          ...buildNoteDetail({ text: body.text, revision: body.expectedRevision + 1 }),
        })
      }),
    )
    const result = await updateVoiceNote('work', 'note-1', 'Editado', 1)
    expect(result.text).toBe('Editado')
    expect(result.revision).toBe(2)
  })

  it('convierte 409 en ApiError', async () => {
    server.use(
      mock.put(`${NOTES_PATH}/:id`, () =>
        problemResponse(409, { detail: 'Conflicto de revisión.' }),
      ),
    )
    const error = await updateVoiceNote('work', 'note-1', 'Editado', 1).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409 })
  })
})

describe('deleteVoiceNote', () => {
  it('elimina con CAS y espera 204', async () => {
    server.use(mock.delete(`${NOTES_PATH}/:id`, () => new HttpResponse(null, { status: 204 })))
    await expect(deleteVoiceNote('work', 'note-1', 1)).resolves.toBeUndefined()
  })

  it('convierte 404 en ApiError', async () => {
    server.use(mock.delete(`${NOTES_PATH}/:id`, () => problemResponse(404)))
    const error = await deleteVoiceNote('work', 'note-1', 1).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404 })
  })
})
