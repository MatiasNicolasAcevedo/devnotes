import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { EditorContent, useEditor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { ApiError } from '../../services/http'
import { CopyButton } from '../../shared/ui/CopyButton'
import { DailyEditor } from '../daily/editor/DailyEditor'
import { documentToPlainText } from '../daily/editor/dailyDocument'
import { useDailyVersionDetailQuery } from '../daily/useDailyVersionQuery'
import type { FreeNoteDocument } from '../free-notes/api'
import { freeNoteContentStyles, freeNoteExtensions } from '../free-notes/freeNoteContent'
import { useFreeNoteDetail } from '../free-notes/useFreeNoteQueries'
import { useFreeNotesScope } from '../free-notes/useFreeNotesScope'

function ReadingResult({
  pending,
  error,
  onChange,
  retry,
  children,
}: {
  pending: boolean
  error: Error | null
  onChange: () => void
  retry: () => void
  children: ReactNode
}) {
  if (pending)
    return (
      <Typography role="status" sx={{ p: 1.5 }}>
        Cargando consulta…
      </Typography>
    )
  if (error instanceof ApiError && error.status === 404)
    return (
      <Alert severity="info" action={<Button onClick={onChange}>Elegir otra nota</Button>}>
        La consulta ya no está disponible.
      </Alert>
    )
  if (error)
    return (
      <Alert severity="error" action={<Button onClick={retry}>Reintentar</Button>}>
        No se pudo cargar la consulta.
      </Alert>
    )
  return children
}

export function DailyReading({ date, onChange }: { date: string; onChange: () => void }) {
  const scope = useFreeNotesScope()
  const [, owner, space] = scope.key
  const query = useDailyVersionDetailQuery(owner, space, date, scope.isCurrent)
  const version = query.data
  return (
    <ReadingResult
      pending={query.isPending || (query.isFetching && !query.isFetchedAfterMount)}
      error={query.error}
      retry={() => void query.refetch()}
      onChange={onChange}
    >
      {version && (
        <>
          <DailyEditor
            initialContent={version.content}
            readOnly
            fillHeight
            aria-label="Versión en consulta"
          />
          <Box sx={{ px: 1, pb: 0.5 }}>
            <CopyButton aria-label="Copiar texto" text={() => documentToPlainText(version.content)}>
              Copiar texto
            </CopyButton>
          </Box>
        </>
      )}
    </ReadingResult>
  )
}

function FreeReadingDocument({ document }: { document: FreeNoteDocument }) {
  const editor = useEditor(
    {
      extensions: freeNoteExtensions,
      content: document,
      editable: false,
      editorProps: {
        attributes: { role: 'document', 'aria-label': 'Nota libre en consulta' },
      },
    },
    [document],
  )
  return (
    <>
      <Box
        role="region"
        aria-label="Contenido de consulta"
        tabIndex={0}
        sx={{ ...freeNoteContentStyles, minHeight: 0, overflow: 'auto', flexGrow: 1 }}
      >
        <EditorContent editor={editor} />
      </Box>
      <Box sx={{ px: 1, pb: 0.5 }}>
        <CopyButton
          aria-label="Copiar texto"
          text={() => editor?.getText({ blockSeparator: '\n' }) ?? ''}
        >
          Copiar texto
        </CopyButton>
      </Box>
    </>
  )
}

export function FreeReading({
  id,
  onChange,
  header,
  fallbackTitle,
}: {
  id: string
  onChange: () => void
  header: (title: string) => ReactNode
  fallbackTitle: string
}) {
  const scope = useFreeNotesScope()
  const query = useFreeNoteDetail(scope, id, true)
  const note = query.data
  return (
    <>
      {header(note?.title ?? fallbackTitle)}
      <ReadingResult
        pending={query.isPending || (query.isFetching && !query.isFetchedAfterMount)}
        error={query.error}
        retry={() => void query.refetch()}
        onChange={onChange}
      >
        {note && <FreeReadingDocument document={note.document} />}
      </ReadingResult>
    </>
  )
}
