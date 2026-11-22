import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSession } from '../auth/sessionContext'
import { useOptionalActiveSpace } from '../spaces/spaceContext'
import { ApiError } from '../../services/http'
import type { FreeNote } from './api'
import { FreeNoteDirectory } from './FreeNoteDirectory'
import { FreeNoteEditor } from './FreeNoteEditor'
import { useFreeNotesLinks } from './freeNotesContext'
import { useFreeNotesScope } from './useFreeNotesScope'
import { freeNoteDetailKey, useFreeNoteDetail } from './useFreeNoteQueries'

export function FreeNotesPage() {
  const { user } = useSession()
  const space = useOptionalActiveSpace()
  const { id } = useParams()
  if (!user) return <Alert severity="info">Inicia sesión para acceder a tus notas libres.</Alert>
  if (!space) return null
  if (!id) return <FreeNoteDirectory key={`${user.id}/${space}`} />
  if (id === 'new') return <FreeNoteEditor key={`${user.id}/${space}/new`} />
  return <ExistingNote key={`${user.id}/${space}/${id}`} id={id} />
}

function ExistingNote({ id }: { id: string }) {
  const scope = useFreeNotesScope()
  const { noteHref } = useFreeNotesLinks()
  const client = useQueryClient()
  const queryKey = freeNoteDetailKey(scope.key, id)
  const query = useFreeNoteDetail(scope, id)
  const [initialNote, setInitialNote] = useState<FreeNote>()
  // After a save, wait for the invalidated detail to refresh before opening a new editor.
  // Once opened, background requests must not replace the editor's draft or revision.
  if (!initialNote && query.data && !client.getQueryState(queryKey)?.isInvalidated) {
    setInitialNote(query.data)
  }
  if (initialNote) {
    return (
      <FreeNoteEditor
        note={initialNote}
        reload={async () => (await query.refetch({ throwOnError: true })).data}
      />
    )
  }
  if (query.isPending || query.isFetching)
    return <CircularProgress size={24} aria-label="Cargando nota libre" />
  const missing = query.error instanceof ApiError && query.error.status === 404
  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Button component={Link} to={noteHref('/free-notes')}>
        Libres
      </Button>
      <Alert severity="error">
        {missing ? 'La nota libre no está disponible.' : 'No se pudo abrir la nota libre.'}
        {!missing && <Button onClick={() => void query.refetch()}>Reintentar</Button>}
      </Alert>
    </Stack>
  )
}
