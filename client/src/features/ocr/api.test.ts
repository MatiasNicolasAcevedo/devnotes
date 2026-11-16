import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { CSRF_HEADER_NAME } from '../../services/csrf'
import { UnexpectedResponseError } from '../../services/http'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import {
  extractScreenshot,
  getOcrCapabilities,
  MAX_SCREENSHOT_BYTES,
  validateScreenshot,
} from './api'

describe('cliente OCR', () => {
  it('consulta capacidad por espacio y envía solo el archivo por multipart con CSRF', async () => {
    installAuthBackend({ csrfToken: 'csrf-ficticio-ocr' })
    const file = new File(['bytes ficticios'], 'terminal-privada.jpg', { type: 'image/jpeg' })
    const capability = vi.fn()
    const extraction = vi.fn()
    server.use(
      mock.get('/api/v1/ocr/capabilities', ({ request }) => {
        capability(new URL(request.url).search, request.headers.has(CSRF_HEADER_NAME))
        return HttpResponse.json({ available: true })
      }),
      mock.post('/api/v1/ocr/extractions', ({ request }) => {
        extraction(new URL(request.url).search, request.headers.get(CSRF_HEADER_NAME))
        return HttpResponse.json({ text: '  T-055\n/src/api/foo-bar.ts\n' })
      }),
    )

    const { signal } = new AbortController()
    await expect(getOcrCapabilities('personal', signal)).resolves.toEqual({ available: true })
    const fetch = vi.spyOn(globalThis, 'fetch')
    try {
      await expect(extractScreenshot('work', file, signal)).resolves.toEqual({
        text: '  T-055\n/src/api/foo-bar.ts\n',
      })
      const options = fetch.mock.calls[0][1]
      const form = options?.body
      expect(options?.signal).toBe(signal)
      expect(form).toBeInstanceOf(FormData)
      if (!(form instanceof FormData)) throw new Error('Falta el multipart de extracción')
      expect([...form.keys()]).toEqual(['file'])
      expect(form.get('file')).toMatchObject({
        name: 'captura.jpg',
        type: 'image/jpeg',
        size: file.size,
      })
    } finally {
      fetch.mockRestore()
    }
    expect(capability).toHaveBeenCalledExactlyOnceWith('?space=personal', false)
    expect(extraction).toHaveBeenCalledExactlyOnceWith('?space=work', 'csrf-ficticio-ocr')
  })

  it('rechaza respuestas exitosas fuera de contrato', async () => {
    server.use(
      mock.get('/api/v1/ocr/capabilities', () => HttpResponse.json({ available: 'true' })),
      mock.post('/api/v1/ocr/extractions', () => HttpResponse.json({ text: ' \n ' })),
    )
    const { signal } = new AbortController()
    await expect(getOcrCapabilities('work', signal)).rejects.toBeInstanceOf(UnexpectedResponseError)
    await expect(
      extractScreenshot('work', new File(['demo'], 'demo.png', { type: 'image/png' }), signal),
    ).rejects.toBeInstanceOf(UnexpectedResponseError)
  })

  it('acepta el máximo inclusivo y rechaza vacío, exceso y tipo discordante', () => {
    const png = (size: number) =>
      new File([new Uint8Array(size)], 'demo.PNG', { type: 'image/png' })
    expect(validateScreenshot(png(MAX_SCREENSHOT_BYTES))).toBeNull()
    expect(validateScreenshot(png(MAX_SCREENSHOT_BYTES + 1))).toMatch(/hasta 1 MB/)
    expect(validateScreenshot(png(0))).toMatch(/vacía/)
    expect(validateScreenshot(new File(['demo'], 'demo.png', { type: 'image/jpeg' }))).toMatch(
      /PNG o JPG/,
    )
  })
})
