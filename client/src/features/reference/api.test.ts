import { HttpResponse, http as mock } from 'msw'
import { describe, expect, it } from 'vitest'
import { UnexpectedResponseError } from '../../services/http'
import { referenceItem } from '../../test/msw/referenceBackend'
import { server } from '../../test/msw/server'
import {
  REFERENCE_PATH,
  deleteReferenceItem,
  fetchReferenceItem,
  fetchReferenceItems,
  referenceInputSchema,
  saveReferenceItem,
  searchReferenceItems,
} from './api'
import type { Space } from '../spaces/space'

describe('reference API', () => {
  it('validates shared trim and exact limits, permits duplicates and requires description string', () => {
    expect(
      referenceInputSchema.parse({ title: ' \u00a0x\ufeff ', description: ' texto ' }),
    ).toEqual({ title: 'x', description: 'texto' })
    expect(
      referenceInputSchema.safeParse({ title: 'x'.repeat(120), description: 'x'.repeat(2000) })
        .success,
    ).toBe(true)
    for (const input of [
      { title: ' ', description: '' },
      { title: 'x'.repeat(121), description: '' },
      { title: 'x', description: 'x'.repeat(2001) },
      { title: 'x' },
      { title: 'x', description: null },
      { title: 'x', description: '', owner: 'injected' },
    ])
      expect(referenceInputSchema.safeParse(input).success).toBe(false)
  })
  it('uses five exact operations and schemas without retaining unknown owner attributes', async () => {
    const seen: Array<{ method: string; body: unknown }> = []
    const item = referenceItem()
    const spaces: string[] = []
    const track = (request: Request) =>
      spaces.push(...new URL(request.url).searchParams.getAll('space'))
    server.events.on('request:start', ({ request }) => track(request))
    server.use(
      mock.get(REFERENCE_PATH, () =>
        HttpResponse.json({ content: [item], page: 1, size: 20, totalElements: 21, totalPages: 2 }),
      ),
      mock.get(`${REFERENCE_PATH}/${item.id}`, () =>
        HttpResponse.json({ ...item, owner: 'discarded' }),
      ),
      mock.post(REFERENCE_PATH, async ({ request }) => {
        seen.push({ method: request.method, body: await request.json() })
        return HttpResponse.json(item, { status: 201 })
      }),
      mock.put(`${REFERENCE_PATH}/${item.id}`, async ({ request }) => {
        seen.push({ method: request.method, body: await request.json() })
        return HttpResponse.json(item)
      }),
      mock.delete(`${REFERENCE_PATH}/${item.id}`, ({ request }) => {
        seen.push({ method: request.method, body: null })
        return new HttpResponse(null, { status: 204 })
      }),
    )
    expect((await fetchReferenceItems('work', 1)).totalElements).toBe(21)
    expect(await fetchReferenceItem('work', item.id)).toEqual(item)
    await saveReferenceItem('work', { title: ' título ', description: ' ' })
    await saveReferenceItem('work', { title: ' título ', description: '' }, item.id)
    await deleteReferenceItem('work', item.id)
    expect(seen).toEqual([
      { method: 'POST', body: { title: 'título', description: '' } },
      { method: 'PUT', body: { title: 'título', description: '' } },
      { method: 'DELETE', body: null },
    ])
    // Cada operación lleva exactamente un space: listado, detalle, alta, edición y borrado.
    expect(spaces).toEqual(['work', 'work', 'work', 'work', 'work'])
    server.events.removeAllListeners('request:start')
  })
  it('search and every operation carry the captured space; an unknown space never reaches the network', async () => {
    const urls: URL[] = []
    const item = referenceItem()
    const page = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
    server.use(
      mock.get(REFERENCE_PATH, ({ request }) => {
        urls.push(new URL(request.url))
        return HttpResponse.json(page)
      }),
      mock.delete(`${REFERENCE_PATH}/${item.id}`, ({ request }) => {
        urls.push(new URL(request.url))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await searchReferenceItems('personal', ' ruta ', 0, 20)
    await deleteReferenceItem('personal', item.id)
    expect(urls.map((url) => url.searchParams.getAll('space'))).toEqual([
      ['personal'],
      ['personal'],
    ])
    expect(urls[0].searchParams.get('q')).toBe('ruta')
    const bogus: Space = JSON.parse('"Work"')
    expect(() => searchReferenceItems(bogus, 'x', 0)).toThrow('Espacio no válido')
    expect(() => saveReferenceItem(bogus, { title: 'x', description: '' })).toThrow(
      'Espacio no válido',
    )
    expect(urls).toHaveLength(2)
  })
  it('rejects invalid response identifiers, dates, pagination and bounds', async () => {
    const item = referenceItem()
    for (const invalid of [
      { ...item, id: 'bad' },
      { ...item, title: ' invalid ' },
      { ...item, description: 'x'.repeat(2001) },
      { ...item, createdAt: 'today' },
    ]) {
      server.use(mock.get(`${REFERENCE_PATH}/${item.id}`, () => HttpResponse.json(invalid)))
      await expect(fetchReferenceItem('work', item.id)).rejects.toBeInstanceOf(
        UnexpectedResponseError,
      )
    }
    for (const invalid of [
      { content: [], page: -1, size: 20, totalElements: 0, totalPages: 0 },
      { content: [], page: 0, size: 101, totalElements: 0, totalPages: 0 },
      { content: [], page: 0, size: 20, totalElements: 5, totalPages: 0 },
      { content: [item, item], page: 0, size: 1, totalElements: 2, totalPages: 2 },
    ]) {
      server.use(mock.get(REFERENCE_PATH, () => HttpResponse.json(invalid)))
      await expect(fetchReferenceItems('work', 0)).rejects.toBeInstanceOf(UnexpectedResponseError)
    }
  })
})
