import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { problemResponse, validationProblemResponse } from '../test/factories'
import { server } from '../test/msw/server'
import { createCookieCsrfTokenResolver } from './csrf'
import { ApiError, createHttpClient, http, NetworkError, UnexpectedResponseError } from './http'
import { sessionEvents } from './sessionEvents'

const itemSchema = z.object({ id: z.string(), quantity: z.number().int() })
const PATH = '/api/v1/test/items'

describe('createHttpClient', () => {
  it('un 401 tardío de una sesión reemplazada no publica expiración para la identidad nueva', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      mock.post(PATH, async () => {
        await held
        return problemResponse(401)
      }),
    )
    const listener = vi.fn()
    const client = createHttpClient({ onUnauthorized: listener })
    let current = true
    const pending = client
      .requestVoid(PATH, { method: 'POST', sessionIsCurrent: () => current })
      .catch((error: unknown) => error)
    current = false
    release()
    expect(await pending).toMatchObject({ status: 401 })
    expect(listener).not.toHaveBeenCalled()
  })

  it('devuelve el cuerpo validado por el esquema y envía cookies del mismo origen', async () => {
    let seen: Request | undefined
    server.use(
      mock.get(PATH, ({ request }) => {
        seen = request
        return HttpResponse.json({ id: 'a-1', quantity: 3 })
      }),
    )

    const item = await createHttpClient().request(PATH, itemSchema)

    expect(item).toEqual({ id: 'a-1', quantity: 3 })
    expect(seen?.credentials).toBe('same-origin')
    expect(seen?.headers.get('Accept')).toContain('application/problem+json')
  })

  it('serializa el body como JSON', async () => {
    let body: unknown
    let contentType: string | null = null
    server.use(
      mock.post(PATH, async ({ request }) => {
        body = await request.json()
        contentType = request.headers.get('Content-Type')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await createHttpClient().requestVoid(PATH, { method: 'POST', body: { id: 'b-2' } })

    expect(body).toEqual({ id: 'b-2' })
    expect(contentType).toBe('application/json')
  })

  it('envía FormData como multipart con boundary del browser y sin Content-Type manual', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const capturedFetch = vi.fn().mockImplementation(async (_input: unknown, _init: unknown) => {
      // Verifica que no se establece Content-Type manual (el browser lo genera)
      return Promise.resolve(
        new Response(JSON.stringify({ text: 'hola', language: 'es' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    const fd = new FormData()
    fd.append('file', new Blob(['fake-audio'], { type: 'audio/webm' }), 'recording.webm')

    const client = createHttpClient({ fetch: capturedFetch as typeof fetch })
    const result = await client.request(
      PATH,
      z.object({ text: z.string(), language: z.string() }),
      {
        method: 'POST',
        formData: fd,
      },
    )

    expect(result).toEqual({ text: 'hola', language: 'es' })
    // Cuando se envía FormData, el browser establece Content-Type con el boundary
    // En jsdom, FormData como body no establece Content-Type automáticamente,
    // pero el cliente NO debe establecerlo manualmente
    expect(capturedFetch).toHaveBeenCalled()
    const callArgs = capturedFetch.mock.calls[0]
    const init = callArgs[1] as { body?: FormData; headers?: Headers } | undefined
    expect(init?.body).toBe(fd)
    // El header Content-Type NO debe estar en Headers (el browser lo añade al enviar)
    const headers = init?.headers as Headers | undefined
    expect(headers?.has('Content-Type')).toBe(false)
  })

  it('rechaza body y formData simultáneos', async () => {
    server.use(mock.post(PATH, () => new HttpResponse(null, { status: 204 })))

    const fd = new FormData()
    fd.append('file', new Blob(['x']))

    await expect(
      createHttpClient().requestVoid(PATH, { method: 'POST', body: { a: 1 }, formData: fd }),
    ).rejects.toThrow('body y formData son mutuamente excluyentes')
  })

  it('envía CSRF en FormData al mismo origen', async () => {
    let csrfHeader: string | null = null
    const capturedFetch = vi.fn().mockImplementation(async (_input: unknown, init: unknown) => {
      const headers = (init as { headers?: Headers })?.headers as Headers | undefined
      csrfHeader = headers?.get('X-Test-Csrf') ?? null
      return Promise.resolve(
        new Response(JSON.stringify({ text: 'ok', language: 'es' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    const fd = new FormData()
    fd.append('file', new Blob(['x']))

    await createHttpClient({
      csrfToken: () => ({ headerName: 'X-Test-Csrf', token: 'csrf-fd' }),
      fetch: capturedFetch as typeof fetch,
    }).request(PATH, z.object({ text: z.string(), language: z.string() }), {
      method: 'POST',
      formData: fd,
    })

    expect(csrfHeader).toBe('csrf-fd')
  })

  it('aborta FormData sin convertirlo en NetworkError', async () => {
    const controller = new AbortController()
    const capturedFetch = vi.fn().mockImplementation((_input, init) => {
      // Propaga el aborto del signal
      const signal = (init as { signal?: AbortSignal }).signal
      return new Promise<never>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const fd = new FormData()
    fd.append('file', new Blob(['x']))

    const pending = createHttpClient({ fetch: capturedFetch as typeof fetch }).requestVoid(PATH, {
      method: 'POST',
      formData: fd,
      signal: controller.signal,
    })
    controller.abort()

    const error = await pending.catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(NetworkError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })

  it('sessionIsCurrent con FormData: 401 obsoleto no publica expiración', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const capturedFetch = vi.fn().mockImplementation(async () => {
      await held
      return Promise.resolve(
        new Response(JSON.stringify({ type: 'about:blank', title: 'Unauthorized', status: 401 }), {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      )
    })
    const listener = vi.fn()
    const client = createHttpClient({
      onUnauthorized: listener,
      fetch: capturedFetch as typeof fetch,
    })
    let current = true
    const fd = new FormData()
    fd.append('file', new Blob(['x']))
    const pending = client
      .requestVoid(PATH, { method: 'POST', formData: fd, sessionIsCurrent: () => current })
      .catch((error: unknown) => error)
    current = false
    release()
    expect(await pending).toMatchObject({ status: 401 })
    expect(listener).not.toHaveBeenCalled()
  })

  it('convierte un ProblemDetail en ApiError con errores de campo', async () => {
    server.use(
      mock.post(PATH, () =>
        validationProblemResponse([{ field: 'id', message: 'Ingresá un identificador.' }]),
      ),
    )

    const error = await createHttpClient()
      .requestVoid(PATH, { method: 'POST', body: {} })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      message: 'La solicitud tiene datos inválidos.',
      fieldErrors: [{ field: 'id', message: 'Ingresá un identificador.' }],
    })
  })

  it('convierte una respuesta de error no JSON (p. ej. 502 del proxy) en ApiError sin problem', async () => {
    server.use(
      mock.get(
        PATH,
        () =>
          new HttpResponse('<html>Bad Gateway</html>', {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          }),
      ),
    )

    const error = await createHttpClient()
      .request(PATH, itemSchema)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, problem: null, fieldErrors: [] })
  })

  it('convierte una falla de red en NetworkError', async () => {
    server.use(mock.get(PATH, () => HttpResponse.error()))

    await expect(createHttpClient().request(PATH, itemSchema)).rejects.toBeInstanceOf(NetworkError)
  })

  it('acepta respuestas vacías en requestVoid y las rechaza cuando se espera un cuerpo', async () => {
    server.use(mock.delete(PATH, () => new HttpResponse(null, { status: 204 })))
    const client = createHttpClient()

    await expect(client.requestVoid(PATH, { method: 'DELETE' })).resolves.toBeUndefined()
    await expect(client.request(PATH, itemSchema, { method: 'DELETE' })).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    )
  })

  it('rechaza cuerpos fuera de contrato o no JSON con UnexpectedResponseError', async () => {
    const client = createHttpClient()
    server.use(mock.get(PATH, () => HttpResponse.json({ id: 7 })))
    await expect(client.request(PATH, itemSchema)).rejects.toBeInstanceOf(UnexpectedResponseError)

    server.use(mock.get(PATH, () => HttpResponse.text('ok')))
    await expect(client.request(PATH, itemSchema)).rejects.toBeInstanceOf(UnexpectedResponseError)
  })

  it('requestBlob devuelve el binario y las cabeceras, y pide el tipo indicado', async () => {
    let seen: Request | undefined
    server.use(
      mock.get(PATH, ({ request }) => {
        seen = request
        return new HttpResponse('contenido binario', {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="archivo.bin"',
          },
        })
      }),
    )

    const { blob, headers } = await createHttpClient().requestBlob(PATH, 'application/octet-stream')

    expect(await blob.text()).toBe('contenido binario')
    expect(headers.get('Content-Disposition')).toBe('attachment; filename="archivo.bin"')
    expect(seen?.headers.get('Accept')).toBe('application/octet-stream, application/problem+json')
    expect(seen?.credentials).toBe('same-origin')
  })

  it('requestBlob convierte errores en ApiError, publica el 401 y propaga el aborto', async () => {
    server.use(
      mock.get(PATH, () => problemResponse(401, { detail: 'Se requiere iniciar sesión.' })),
    )
    const listener = vi.fn()
    const client = createHttpClient({ onUnauthorized: listener })

    const error = await client
      .requestBlob(PATH, 'application/octet-stream')
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledExactlyOnceWith({ path: PATH, method: 'GET' })

    const controller = new AbortController()
    controller.abort()
    await expect(
      client.requestBlob(PATH, 'application/octet-stream', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('requestBlob trata un cuerpo interrumpido como error de red', async () => {
    const broken = new Response(null, { status: 200 })
    vi.spyOn(broken, 'blob').mockRejectedValue(new TypeError('terminated'))
    const client = createHttpClient({ fetch: () => Promise.resolve(broken) })

    await expect(client.requestBlob(PATH, 'application/octet-stream')).rejects.toBeInstanceOf(
      NetworkError,
    )
  })

  it('propaga el aborto sin convertirlo en error de red', async () => {
    server.use(mock.get(PATH, () => new Promise<never>(() => {})))
    const controller = new AbortController()

    const pending = createHttpClient().request(PATH, itemSchema, { signal: controller.signal })
    controller.abort()

    const error = await pending.catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(NetworkError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })

  it('agrega el header CSRF solo en métodos que cambian estado', async () => {
    const headers: Record<string, string | null> = {}
    server.use(
      mock.get(PATH, ({ request }) => {
        headers.get = request.headers.get('X-Test-Csrf')
        return HttpResponse.json({ id: 'c-3', quantity: 1 })
      }),
      mock.post(PATH, ({ request }) => {
        headers.post = request.headers.get('X-Test-Csrf')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const client = createHttpClient({
      csrfToken: () => ({ headerName: 'X-Test-Csrf', token: 'token-ficticio' }),
    })

    await client.request(PATH, itemSchema)
    await client.requestVoid(PATH, { method: 'POST' })

    expect(headers).toEqual({ get: null, post: 'token-ficticio' })
  })

  it('sin resolver de CSRF no envía header y el 403 llega como ApiError', async () => {
    server.use(
      mock.post(PATH, ({ request }) =>
        request.headers.has('X-Test-Csrf')
          ? new HttpResponse(null, { status: 204 })
          : problemResponse(403, { detail: 'No tenés permiso para realizar esta operación.' }),
      ),
    )

    await expect(createHttpClient().requestVoid(PATH, { method: 'POST' })).rejects.toMatchObject({
      status: 403,
    })
  })
})

describe('transporte CSRF por cookie', () => {
  function recordCsrfHeaders() {
    const seen: Array<[string, string | null]> = []
    const record = ({ request }: { request: Request }) => {
      seen.push([request.method, request.headers.get('X-XSRF-TOKEN')])
      return request.method === 'GET'
        ? HttpResponse.json({ id: 'd-4', quantity: 2 })
        : new HttpResponse(null, { status: 204 })
    }
    server.use(
      mock.get(PATH, record),
      mock.post(PATH, record),
      mock.put(PATH, record),
      mock.patch(PATH, record),
      mock.delete(PATH, record),
    )
    return seen
  }

  it('envía en cada mutación el valor vigente de la cookie y nunca en GET', async () => {
    const seen = recordCsrfHeaders()
    const client = createHttpClient({ csrfToken: createCookieCsrfTokenResolver() })

    document.cookie = 'XSRF-TOKEN=csrf-ficticio-1; Path=/'
    await client.request(PATH, itemSchema)
    await client.requestVoid(PATH, { method: 'POST' })
    document.cookie = 'XSRF-TOKEN=csrf-ficticio-2; Path=/'
    await client.requestVoid(PATH, { method: 'PUT' })
    await client.requestVoid(PATH, { method: 'PATCH' })
    await client.requestVoid(PATH, { method: 'DELETE' })
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
    await client.requestVoid(PATH, { method: 'POST' })

    expect(seen).toEqual([
      ['GET', null],
      ['POST', 'csrf-ficticio-1'],
      ['PUT', 'csrf-ficticio-2'],
      ['PATCH', 'csrf-ficticio-2'],
      ['DELETE', 'csrf-ficticio-2'],
      ['POST', null],
    ])
  })

  it('no entrega el token a otro origen, pero sí a una URL absoluta del mismo origen', async () => {
    const foreign = 'https://otro.example/api/v1/test/items'
    let foreignHeader: string | null = 'sin-request'
    server.use(
      mock.post(foreign, ({ request }) => {
        foreignHeader = request.headers.get('X-XSRF-TOKEN')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const seen = recordCsrfHeaders()
    const resolver = vi.fn(() => ({ headerName: 'X-XSRF-TOKEN', token: 'csrf-ficticio' }))
    const client = createHttpClient({ csrfToken: resolver })

    await client.requestVoid(foreign, { method: 'POST' })
    expect(foreignHeader).toBeNull()
    expect(resolver).not.toHaveBeenCalled()

    await client.requestVoid(`${window.location.origin}${PATH}`, { method: 'POST' })
    expect(seen).toEqual([['POST', 'csrf-ficticio']])
  })
})

describe('401 y canal de sesión', () => {
  it('notifica cada 401 una vez y rechaza con ApiError sin reintentar', async () => {
    let requests = 0
    server.use(
      mock.post(PATH, () => {
        requests += 1
        return problemResponse(401, { detail: 'Se requiere iniciar sesión.' })
      }),
    )
    const onUnauthorized = vi.fn()

    const error = await createHttpClient({ onUnauthorized })
      .requestVoid(PATH, { method: 'POST' })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, message: 'Se requiere iniciar sesión.' })
    expect(requests).toBe(1)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledWith({ path: PATH, method: 'POST' })
  })

  it.each([
    [
      '403',
      () => problemResponse(403, { detail: 'No tenés permiso para realizar esta operación.' }),
    ],
    ['500', () => problemResponse(500)],
    ['502 no JSON', () => new HttpResponse('Bad Gateway', { status: 502 })],
    ['red', () => HttpResponse.error()],
  ])('%s no se presenta como sesión terminada ni se reenvía', async (_, respond) => {
    let requests = 0
    server.use(
      mock.post(PATH, () => {
        requests += 1
        return respond()
      }),
    )
    const onUnauthorized = vi.fn()

    await expect(
      createHttpClient({ onUnauthorized }).requestVoid(PATH, { method: 'POST' }),
    ).rejects.toBeInstanceOf(Error)

    expect(requests).toBe(1)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('la instancia de la app usa la cookie vigente y publica los 401 en sessionEvents', async () => {
    const seen: Array<string | null> = []
    server.use(
      mock.post(PATH, ({ request }) => {
        seen.push(request.headers.get('X-XSRF-TOKEN'))
        return new HttpResponse(null, { status: 204 })
      }),
      mock.get(PATH, () => problemResponse(401, { detail: 'Se requiere iniciar sesión.' })),
    )
    const listener = vi.fn()
    const unsubscribe = sessionEvents.onUnauthorized(listener)

    try {
      document.cookie = 'XSRF-TOKEN=csrf-ficticio-app; Path=/'
      await http.requestVoid(PATH, { method: 'POST' })
      await expect(http.request(PATH, itemSchema)).rejects.toMatchObject({ status: 401 })
    } finally {
      unsubscribe()
    }

    expect(seen).toEqual(['csrf-ficticio-app'])
    expect(listener).toHaveBeenCalledWith({ path: PATH, method: 'GET' })
  })
})
