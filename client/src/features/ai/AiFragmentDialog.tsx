import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '../../services/http'
import { getDailyNote, listDailyNotes } from '../daily/api'
import { fetchFreeNote, fetchFreeNotes } from '../free-notes/api'
import { fetchReferenceItem } from '../reference/api'
import { useSpaceScope } from '../spaces/spaceContext'
import { countPoints, MAX_POINTS, type Excerpt } from './api'

interface DocumentNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  content?: DocumentNode[]
}

async function project(
  node: DocumentNode,
  label: (id: string) => Promise<string>,
): Promise<string[]> {
  if (node.type === 'separator') return ['']
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'codeBlock') {
    const parts = await Promise.all(
      (node.content ?? []).map(async (inline) =>
        inline.type === 'reference' && typeof inline.attrs?.id === 'string'
          ? label(inline.attrs.id)
          : (inline.text ?? ''),
      ),
    )
    return [parts.join('')]
  }
  return (await Promise.all((node.content ?? []).map((child) => project(child, label)))).flat()
}

type NotePage = { entries: { id: string; label: string }[]; next: string | null }

export function AiFragmentDialog({
  close,
  attach,
}: {
  close: () => void
  attach: (value: Excerpt) => void
}) {
  const { owner, space } = useSpaceScope()
  const [source, setSource] = useState<Excerpt['source']>('daily')
  const [id, setId] = useState('')
  const [range, setRange] = useState({ from: 0, to: 0 })
  const notes = useInfiniteQuery({
    queryKey: ['ai', owner, space, 'fragment-list', source],
    initialPageParam: null as string | null,
    async queryFn({ pageParam, signal }): Promise<NotePage> {
      if (source === 'daily') {
        const page = Number(pageParam ?? 0)
        const result = await listDailyNotes(space, page, signal)
        return {
          entries: result.content.map((note) => ({ id: note.date, label: note.date })),
          next: page + 1 < result.totalPages ? String(page + 1) : null,
        }
      }
      const result = await fetchFreeNotes(space, pageParam, { signal })
      return {
        entries: result.items.map((note) => ({ id: note.id, label: note.title })),
        next: result.next,
      }
    },
    getNextPageParam: (page) => page.next ?? undefined,
    retry: false,
    gcTime: 0,
  })
  const note = useQuery({
    queryKey: ['ai', owner, space, 'fragment-note', source, id],
    enabled: Boolean(id),
    async queryFn({ signal }) {
      if (source === 'free') {
        const result = await fetchFreeNote(space, id, { signal })
        const lines = await project(result.document, () => Promise.resolve(''))
        return { revision: result.revision, text: lines.join('\n') }
      }
      const result = await getDailyNote(space, id, signal)
      const labels = new Map<string, Promise<string>>()
      const getLabel = (id: string) => {
        const cached = labels.get(id)
        if (cached) return cached
        const request = fetchReferenceItem(space, id, { signal }).then(
          (reference) => '@' + reference.title,
          (error: unknown) => {
            if (error instanceof ApiError && error.status === 404) return 'Referencia no disponible'
            throw error
          },
        )
        labels.set(id, request)
        return request
      }
      const lines = await project(result.content, getLabel)
      return { revision: result.revision, text: lines.join('\n') }
    },
    retry: false,
    gcTime: 0,
  })
  const selection = note.data?.text.slice(range.from, range.to) ?? ''
  function select() {
    if (note.data && selection.trim())
      attach({
        source,
        id,
        revision: note.data.revision,
        start: countPoints(note.data.text.slice(0, range.from)),
        text: selection,
      })
  }

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={close} aria-labelledby="ai-fragment-title">
      <DialogTitle id="ai-fragment-title">Añadir fragmento</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            id="ai-fragment-source"
            label="Origen"
            select
            value={source}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            onChange={(event) => {
              setSource(event.target.value === 'free' ? 'free' : 'daily')
              setId('')
              setRange({ from: 0, to: 0 })
            }}
          >
            <option value="daily">Diario</option>
            <option value="free">Libres</option>
          </TextField>
          <TextField
            id="ai-fragment-note"
            label="Nota guardada"
            select
            value={id}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            onChange={(event) => {
              setId(event.target.value)
              setRange({ from: 0, to: 0 })
            }}
          >
            <option value="">Elegí una nota</option>
            {notes.data?.pages.flatMap((page) =>
              page.entries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              )),
            )}
          </TextField>
          {notes.hasNextPage && (
            <Button loading={notes.isFetchingNextPage} onClick={() => void notes.fetchNextPage()}>
              Cargar más notas
            </Button>
          )}
          {notes.isPending && <Typography role="status">Cargando notas…</Typography>}
          {notes.data && !notes.data.pages[0]?.entries.length && (
            <Typography>No hay notas guardadas.</Typography>
          )}
          {(notes.isError || note.isError) && (
            <Alert severity="error">No se pudo leer la nota guardada.</Alert>
          )}
          {id && note.isPending && <Typography role="status">Abriendo nota…</Typography>}
          {note.data && (
            <TextField
              label="Texto guardado"
              value={note.data.text}
              multiline
              minRows={4}
              maxRows={10}
              helperText="Seleccioná el texto que querés compartir."
              slotProps={{ input: { readOnly: true } }}
              onSelect={(event) => {
                const field = event.target
                if (field instanceof HTMLTextAreaElement)
                  setRange({ from: field.selectionStart, to: field.selectionEnd })
              }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cerrar</Button>
        <Button
          disabled={!selection.trim() || countPoints(selection) > MAX_POINTS}
          onClick={select}
        >
          Añadir la selección
        </Button>
      </DialogActions>
    </Dialog>
  )
}
