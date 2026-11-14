import { http as mock, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { dailyNoteKeys, getDailyNote, listDailyNotes, saveDailyNote } from '../daily/api'
import { emptyDocument } from '../daily/editor/dailyDocument'
import {
  dailyVersionKeys,
  getDailyVersion,
  listDailyVersions,
  saveDailyVersion,
} from '../daily/versionApi'
import {
  deleteReferenceItem,
  fetchReferenceItem,
  fetchReferenceItems,
  saveReferenceItem,
  searchReferenceItems,
} from '../reference/api'
import { referenceKeys } from '../reference/useReferenceItems'
import {
  createVoiceNote,
  deleteVoiceNote,
  fetchVoiceCapabilities,
  fetchVoiceNote,
  fetchVoiceNotes,
  transcribeAudio,
  updateVoiceNote,
  voiceQueryKeys,
} from '../voice/api'
import {
  isSpaceRoute,
  readSpaceParam,
  searchWithSpace,
  spaceApiPath,
  spaceHref,
  SPACES,
  type Space,
} from './space'
import {
  clearSpacePreference,
  readSpacePreference,
  spacePreferenceKey,
  writeSpacePreference,
} from './spacePreference'

const OWNER = '01900000-0000-7000-8000-000000000001'
const ID = '01900000-0000-7000-8000-000000000101'
const DATE = '2026-11-13'

describe('parámetro space de la URL', () => {
  it('distingue ausente, válido e inválido; repetido, vacío o con mayúsculas es inválido', () => {
    expect(readSpaceParam('')).toEqual({ kind: 'missing' })
    expect(readSpaceParam('?date=x')).toEqual({ kind: 'missing' })
    expect(readSpaceParam('?space=work')).toEqual({ kind: 'valid', space: 'work' })
    expect(readSpaceParam('?q=1&space=personal')).toEqual({ kind: 'valid', space: 'personal' })
    for (const search of [
      '?space=',
      '?space=Work',
      '?space=all',
      '?space=%20work',
      '?space=work&space=work',
      '?space=work&space=personal',
    ])
      expect(readSpaceParam(search), search).toEqual({ kind: 'invalid' })
  })

  it('los enlaces internos llevan un único space y conservan consulta y fragmento', () => {
    expect(searchWithSpace('?origen=a&space=xyz&space=work', 'personal')).toBe(
      '?origen=a&space=personal',
    )
    expect(spaceHref('/notes/2026-11-13', 'work')).toBe('/notes/2026-11-13?space=work')
    expect(spaceHref('/voice?origen=a#editor', 'personal')).toBe(
      '/voice?origen=a&space=personal#editor',
    )
  })

  it('solo las rutas de contenido pertenecen a un espacio; Datos y el ingreso son de la cuenta', () => {
    for (const path of [
      '/notes',
      `/notes/${DATE}`,
      '/history',
      `/history/${DATE}`,
      '/reference',
      '/voice',
    ])
      expect(isSpaceRoute(path), path).toBe(true)
    for (const path of ['/data', '/login', '/', '/otra'])
      expect(isSpaceRoute(path), path).toBe(false)
  })

  it('la ruta de API rechaza cualquier valor fuera del enum antes de construirse', () => {
    expect(spaceApiPath('/api/v1/x', 'work')).toBe('/api/v1/x?space=work')
    expect(spaceApiPath('/api/v1/x?page=1', 'personal')).toBe('/api/v1/x?page=1&space=personal')
    // Valores sin tipo, como llegarían de una URL o de almacenamiento no confiable.
    for (const raw of ['"all"', '""', '"Work"', 'null']) {
      const value: Space = JSON.parse(raw)
      expect(() => spaceApiPath('/api/v1/x', value), raw).toThrow('Espacio no válido')
    }
  })
})

describe('preferencia local de espacio', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('guarda solo el enum bajo la clave de la cuenta y borra solo esa identidad', () => {
    expect(spacePreferenceKey(OWNER)).toBe(`devnotes:last-space:${OWNER}`)
    expect(writeSpacePreference(OWNER, 'personal')).toBe(true)
    writeSpacePreference('otra-cuenta', 'work')
    expect(window.localStorage.getItem(spacePreferenceKey(OWNER))).toBe('personal')
    expect(readSpacePreference(OWNER)).toBe('personal')
    clearSpacePreference(OWNER)
    expect(readSpacePreference(OWNER)).toBeNull()
    expect(readSpacePreference('otra-cuenta')).toBe('work')
  })

  it('un valor guardado inválido cuenta como ausente; sin cuenta no se lee ni se escribe', () => {
    for (const stored of ['admin', 'Work', '', '{"space":"work"}']) {
      window.localStorage.setItem(spacePreferenceKey(OWNER), stored)
      expect(readSpacePreference(OWNER), stored).toBeNull()
    }
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    expect(readSpacePreference('')).toBeNull()
    expect(writeSpacePreference('', 'work')).toBe(false)
    const bogus: Space = JSON.parse('"all"')
    expect(writeSpacePreference(OWNER, bogus)).toBe(false)
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('con el almacenamiento denegado no falla: lee null, informa que no guardó y borra sin error', () => {
    const denied = () => {
      throw new DOMException('denegado', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(denied)
    expect(readSpacePreference(OWNER)).toBeNull()
    expect(writeSpacePreference(OWNER, 'work')).toBe(false)
    expect(() => clearSpacePreference(OWNER)).not.toThrow()
  })
})

describe('keys privadas por identidad y espacio', () => {
  it('ninguna key de contenido de un espacio coincide con la del otro; la capacidad de voz es global', () => {
    const scopes = SPACES.map((space) => ({ owner: OWNER, space }))
    const [work, personal] = scopes.map(({ owner, space }) => [
      dailyNoteKeys(owner, space).detail(DATE),
      dailyNoteKeys(owner, space).list(0),
      dailyVersionKeys(owner, space).detail(DATE),
      dailyVersionKeys(owner, space).list(0),
      referenceKeys.item(owner, space, ID),
      referenceKeys.list(owner, space, 0),
      voiceQueryKeys.detail({ owner, space }, ID),
      voiceQueryKeys.list({ owner, space }),
    ])
    work.forEach((key, index) => {
      expect(key).toContain(OWNER)
      expect(key).toContain('work')
      expect(personal[index]).toContain('personal')
      expect(key).not.toEqual(personal[index])
    })
    expect(voiceQueryKeys.capabilities).not.toContain('work')
    expect(voiceQueryKeys.capabilities).not.toContain(OWNER)
  })
})

describe('cada request persistente lleva el espacio capturado', () => {
  const seen: Array<{ method: string; path: string; spaces: string[] }> = []
  const record = ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    seen.push({
      method: request.method,
      path: url.pathname,
      spaces: url.searchParams.getAll('space'),
    })
  }
  const detail = {
    id: ID,
    date: DATE,
    content: emptyDocument(),
    revision: 1,
    updatedAt: `${DATE}T10:00:00Z`,
  }
  const page = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
  const version = {
    id: ID,
    date: DATE,
    content: emptyDocument(),
    sourceRevision: 1,
    savedAt: `${DATE}T10:00:00Z`,
  }
  const reference = {
    id: ID,
    title: 'Ficticia',
    description: '',
    createdAt: `${DATE}T10:00:00Z`,
    updatedAt: `${DATE}T10:00:00Z`,
  }
  const voiceNote = {
    id: ID,
    text: 'Ficticia',
    revision: 1,
    createdAt: `${DATE}T10:00:00Z`,
    updatedAt: `${DATE}T10:00:00Z`,
  }

  beforeEach(() => {
    seen.length = 0
    server.events.on('request:start', record)
    server.use(
      mock.get('/api/v1/daily-notes', () => HttpResponse.json(page)),
      mock.get('/api/v1/daily-notes/:date', () => HttpResponse.json(detail)),
      mock.put('/api/v1/daily-notes/:date', () => HttpResponse.json(detail)),
      mock.post('/api/v1/daily-notes/:date/version', () => HttpResponse.json(version)),
      mock.get('/api/v1/daily-versions', () => HttpResponse.json(page)),
      mock.get('/api/v1/daily-versions/:date', () => HttpResponse.json(version)),
      mock.get('/api/v1/reference-items', () => HttpResponse.json(page)),
      mock.get('/api/v1/reference-items/:id', () => HttpResponse.json(reference)),
      mock.post('/api/v1/reference-items', () => HttpResponse.json(reference, { status: 201 })),
      mock.put('/api/v1/reference-items/:id', () => HttpResponse.json(reference)),
      mock.delete('/api/v1/reference-items/:id', () => new HttpResponse(null, { status: 204 })),
      mock.get('/api/v1/voice-notes', () => HttpResponse.json(page)),
      mock.get('/api/v1/voice-notes/:id', () => HttpResponse.json(voiceNote)),
      mock.post('/api/v1/voice-notes', () => HttpResponse.json(voiceNote, { status: 201 })),
      mock.put('/api/v1/voice-notes/:id', () => HttpResponse.json(voiceNote)),
      mock.delete('/api/v1/voice-notes/:id', () => new HttpResponse(null, { status: 204 })),
      mock.get('/api/v1/voice/capabilities', () =>
        HttpResponse.json({
          recordingEnabled: true,
          reason: null,
          maxDurationSeconds: 600,
          maxAudioBytes: 1,
          maxTextLength: 1,
          mimeTypes: [],
          language: 'es',
        }),
      ),
      mock.post('/api/v1/voice/transcriptions', () =>
        HttpResponse.json({ text: 'x', language: 'es' }),
      ),
    )
  })

  afterEach(() => {
    server.events.removeListener('request:start', record)
  })

  it.each(SPACES)(
    'las 18 operaciones de notas, versiones, referencias y voz envían space=%s',
    async (space) => {
      await getDailyNote(space, DATE)
      await listDailyNotes(space, 0)
      await saveDailyNote(space, DATE, emptyDocument(), 1)
      await listDailyVersions(space, 0)
      await getDailyVersion(space, DATE)
      await saveDailyVersion(space, DATE, 1)
      await fetchReferenceItems(space, 0)
      await searchReferenceItems(space, 'ficticia', 0)
      await fetchReferenceItem(space, ID)
      await saveReferenceItem(space, { title: 'Ficticia', description: '' })
      await saveReferenceItem(space, { title: 'Ficticia', description: '' }, ID)
      await deleteReferenceItem(space, ID)
      await fetchVoiceNotes(space, { page: 0, size: 20 })
      await fetchVoiceNote(space, ID)
      await createVoiceNote(space, 'Ficticia')
      await updateVoiceNote(space, ID, 'Ficticia', 1)
      await deleteVoiceNote(space, ID, 1)
      await listDailyNotes(space)
      expect(seen).toHaveLength(18)
      for (const request of seen)
        expect(request, `${request.method} ${request.path}`).toMatchObject({ spaces: [space] })
      expect(new Set(seen.map(({ method }) => method))).toEqual(
        new Set(['GET', 'PUT', 'POST', 'DELETE']),
      )
    },
  )

  it('capacidad y transcripción de voz conservan su API global, sin space', async () => {
    await fetchVoiceCapabilities()
    await transcribeAudio(new Blob(['audio ficticio'], { type: 'audio/webm' }))
    expect(seen.map(({ path, spaces }) => [path, spaces])).toEqual([
      ['/api/v1/voice/capabilities', []],
      ['/api/v1/voice/transcriptions', []],
    ])
  })

  it('un espacio inválido nunca llega a la red en ninguna feature', async () => {
    const bogus: Space = JSON.parse('"all"')
    await expect(getDailyNote(bogus, DATE)).rejects.toThrow('Espacio no válido')
    await expect(saveDailyVersion(bogus, DATE, 1)).rejects.toThrow('Espacio no válido')
    expect(() => fetchReferenceItems(bogus, 0)).toThrow('Espacio no válido')
    expect(() => createVoiceNote(bogus, 'x')).toThrow('Espacio no válido')
    expect(() => deleteVoiceNote(bogus, ID, 1)).toThrow('Espacio no válido')
    expect(seen).toEqual([])
  })
})
