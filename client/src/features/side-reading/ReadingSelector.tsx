import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useId, useState } from 'react'
import { formatDateLocal } from '../daily/dateUtils'
import { useDailyVersionListQuery } from '../daily/useDailyVersionQuery'
import { useFreeNoteList } from '../free-notes/useFreeNoteQueries'
import { useFreeNotesScope } from '../free-notes/useFreeNotesScope'
import type { ReadingSource } from './sideReadingContext'

export function ReadingSelector({
  excludeFreeId,
  onSelect,
  onClose,
}: {
  excludeFreeId?: string
  onSelect: (source: ReadingSource) => void
  onClose: () => void
}) {
  const title = useId()
  const scope = useFreeNotesScope()
  const [, owner, space] = scope.key
  const [page, setPage] = useState(0)
  const daily = useDailyVersionListQuery(owner, space, page, scope.isCurrent)
  const free = useFreeNoteList(scope, true)
  const freeRows = free.data?.pages.flatMap((result) => result.items) ?? []
  const freeNotes = [...new Map(freeRows.map((row) => [row.id, row])).values()].filter(
    (row) => row.id !== excludeFreeId,
  )

  return (
    <Dialog
      open
      disableRestoreFocus
      onClose={onClose}
      aria-labelledby={title}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={title}>Elegir una consulta</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <section aria-label="Versiones guardadas">
            <Typography component="h3" variant="subtitle1">
              Versiones guardadas
            </Typography>
            {daily.isPending && <Typography role="status">Cargando versiones…</Typography>}
            {daily.isError && (
              <Alert
                severity="error"
                action={<Button onClick={() => void daily.refetch()}>Reintentar</Button>}
              >
                No se pudieron cargar las versiones.
              </Alert>
            )}
            {daily.isSuccess && (
              <>
                {daily.data.content.length === 0 ? (
                  <Typography color="text.secondary">No hay versiones guardadas.</Typography>
                ) : (
                  <List disablePadding>
                    {daily.data.content.map(({ date }) => (
                      <ListItem disableGutters disablePadding key={date}>
                        <Button
                          fullWidth
                          sx={{ justifyContent: 'flex-start' }}
                          onClick={() => onSelect({ kind: 'daily', date })}
                        >
                          Versión del {formatDateLocal(date)}
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                )}
                {daily.data.totalPages > 1 && (
                  <Stack direction="row" sx={{ alignItems: 'center' }}>
                    <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
                      Anterior
                    </Button>
                    <Typography variant="caption">
                      Página {page + 1} de {daily.data.totalPages}
                    </Typography>
                    <Button
                      disabled={page + 1 >= daily.data.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Siguiente
                    </Button>
                  </Stack>
                )}
              </>
            )}
          </section>
          <section aria-label="Notas libres">
            <Typography component="h3" variant="subtitle1">
              Notas libres
            </Typography>
            {free.isPending && <Typography role="status">Cargando notas libres…</Typography>}
            {free.isError && (
              <Alert
                severity="error"
                action={<Button onClick={() => void free.refetch()}>Reintentar</Button>}
              >
                No se pudieron cargar las notas libres.
              </Alert>
            )}
            {free.isSuccess && freeNotes.length === 0 && (
              <Typography color="text.secondary">No hay otras notas libres.</Typography>
            )}
            <List disablePadding>
              {freeNotes.map(({ id, title }) => (
                <ListItem disableGutters disablePadding key={id}>
                  <Button
                    fullWidth
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      overflowWrap: 'anywhere',
                    }}
                    onClick={() => onSelect({ kind: 'free', id, title })}
                  >
                    {title}
                  </Button>
                </ListItem>
              ))}
            </List>
            {free.hasNextPage && (
              <Button disabled={free.isFetchingNextPage} onClick={() => void free.fetchNextPage()}>
                Cargar más notas libres
              </Button>
            )}
          </section>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  )
}
