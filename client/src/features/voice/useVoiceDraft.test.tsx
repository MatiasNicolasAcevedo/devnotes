import { http as mock, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/msw/server'
import type { VoiceNoteDetail } from './api'
import { useVoiceDraft } from './useVoiceDraft'

const NOTE_PATH = '/api/v1/voice-notes/:id'
const ID_1 = '01900000-0000-7000-8000-000000000001'
const ID_2 = '01900000-0000-7000-8000-000000000002'

function note(id: string, text: string, revision = 1): VoiceNoteDetail {
  return {
    id,
    text,
    revision,
    createdAt: '2026-11-01T12:00:00.000000Z',
    updatedAt: '2026-11-01T12:00:00.000000Z',
  }
}

function hold(): { promise: Promise<void>; release: () => void } {
  let release: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function renderDraft() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return renderHook(() => useVoiceDraft(), { wrapper: Wrapper })
}

/*
 * Una respuesta de guardado/borrado que llega cuando el borrador ya pasó a otro documento
 * (reset o carga de otra nota) no debe escribir id/revisión/estado sobre ese documento.
 */
describe('useVoiceDraft · respuestas tardías', () => {
  it('un ACK de PUT tras reset() no vuelve a vincular la nota anterior', async () => {
    const put = hold()
    server.use(
      mock.put(NOTE_PATH, async () => {
        await put.promise
        return HttpResponse.json(note(ID_1, 'Texto 1 editado', 2))
      }),
    )
    const { result } = renderDraft()
    act(() => result.current.loadNote(note(ID_1, 'Texto 1')))
    act(() => result.current.setText('Texto 1 editado'))

    let saving: Promise<string> = Promise.resolve('')
    act(() => {
      saving = result.current.save()
    })
    act(() => result.current.reset())
    put.release()
    await act(async () => {
      await saving
    })

    expect(result.current.state.noteId).toBeNull()
    expect(result.current.state.revision).toBeNull()
    expect(result.current.state.text).toBe('')
    expect(result.current.state.documentState).toBe('new')
  })

  it('un 204 de DELETE tras cargar otra nota no vacía esa nota', async () => {
    const del = hold()
    server.use(
      mock.delete(NOTE_PATH, async () => {
        await del.promise
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { result } = renderDraft()
    act(() => result.current.loadNote(note(ID_1, 'Texto 1')))

    let deleting: Promise<string> = Promise.resolve('')
    act(() => {
      deleting = result.current.deleteNote()
    })
    act(() => result.current.loadNote(note(ID_2, 'Texto 2'), { force: true }))
    del.release()
    await act(async () => {
      await deleting
    })

    expect(result.current.state.noteId).toBe(ID_2)
    expect(result.current.state.text).toBe('Texto 2')
    expect(result.current.state.documentState).toBe('clean')
  })
})

describe('useVoiceDraft · transcripción', () => {
  it('una transcripción no reemplaza el texto de una nota guardada', async () => {
    server.use(
      mock.post('/api/v1/voice/transcriptions', () =>
        HttpResponse.json({ text: 'transcrito', language: 'es' }),
      ),
    )
    const { result } = renderDraft()
    act(() => result.current.loadNote(note(ID_1, 'Texto 1')))
    act(() =>
      result.current.setCaptureState('idle', {
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        durationSeconds: 1,
        sizeBytes: 5,
        generation: 0,
      }),
    )

    act(() => result.current.transcribe())
    await waitFor(() => expect(result.current.transcribeMutation.isSuccess).toBe(true))

    expect(result.current.state.text).toBe('Texto 1')
    expect(result.current.state.noteId).toBe(ID_1)
    expect(result.current.state.documentState).toBe('clean')
    expect(result.current.state.captureResult).toBeNull()
  })
})
