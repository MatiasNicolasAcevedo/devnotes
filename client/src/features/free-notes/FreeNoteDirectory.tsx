import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../services/http'

import { deleteFreeNote, fetchFreeNotes, type FreeNoteItem } from './api'
import { useFreeNotesContext, useFreeNotesLinks } from './freeNotesContext'
import { useFreeNotesScope } from './useFreeNotesScope'

const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })

export function FreeNoteDirectory() {
  const scope = useFreeNotesScope()
  const { href, noteHref, fromDate } = useFreeNotesLinks()
  const rememberedDate = useFreeNotesContext()?.diaryDates[scope.space]
  const date = fromDate ?? rememberedDate
  const query = useInfiniteQuery({
    queryKey: [...scope.key, 'list'],
    queryFn: ({ pageParam, signal }) =>
      fetchFreeNotes(scope.space, pageParam, { signal, sessionIsCurrent: scope.isCurrent }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next ?? undefined,
  })
  const rows = query.data?.pages.flatMap((page) => page.items) ?? []
  const [deleted, setDeleted] = useState<ReadonlySet<string>>(new Set())
  const items = [...new Map(rows.map((item) => [item.id, item])).values()].filter(
    (item) => !deleted.has(item.id),
  )
  const [selected, setSelected] = useState<FreeNoteItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const dialogId = useId()
  const newButton = useRef<HTMLAnchorElement>(null)
  const rowLinks = useRef(new Map<string, HTMLAnchorElement>())
  const focusAfterDelete = useRef<string | null>(null)

  const remove = async () => {
    if (!selected || deleting) return
    setDeleting(true)
    setError('')
    try {
      await scope.mutate((options) => deleteFreeNote(scope.space, selected, options))
      if (!scope.isCurrent()) return
      const index = items.findIndex((item) => item.id === selected.id)
      focusAfterDelete.current = items[index + 1]?.id ?? ''
      setDeleted((previous) => new Set(previous).add(selected.id))
      setSelected(null)
      scope.invalidate(selected.id, true)
    } catch (error) {
      if (!scope.isCurrent()) return
      setSelected(null)
      setError(
        error instanceof ApiError && error.status === 409
          ? 'La nota cambió. Revisá la lista actualizada antes de borrar.'
          : 'No se pudo borrar la nota libre.',
      )
      void query.refetch()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button component={Link} to={href(date ? `/notes/${date}` : '/notes')}>
          Diario
        </Button>
        <Typography component="h1" variant="h6" sx={{ flexGrow: 1 }}>
          Libres
        </Typography>
        <Button
          ref={newButton}
          component={Link}
          to={noteHref('/free-notes/new')}
          variant="contained"
        >
          Nueva nota
        </Button>
      </Stack>
      {query.isPending && <CircularProgress size={24} aria-label="Cargando notas libres" />}
      {query.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void query.refetch()}>Reintentar</Button>}
        >
          No se pudo cargar la lista.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {query.isSuccess && items.length === 0 && (
        <Typography color="text.secondary">Todavía no hay notas libres</Typography>
      )}
      {items.length > 0 && (
        <Paper variant="outlined">
          <List disablePadding aria-label="Notas libres">
            {items.map((item, index) => (
              <ListItem
                key={item.id}
                disablePadding
                divider={index < items.length - 1}
                sx={{ display: 'flex', pr: 1, gap: 0.5 }}
              >
                <ListItemButton
                  component={Link}
                  ref={(link) => {
                    if (link) rowLinks.current.set(item.id, link)
                    else rowLinks.current.delete(item.id)
                  }}
                  to={noteHref(`/free-notes/${item.id}`)}
                  sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={dateFormat.format(new Date(item.updatedAt))}
                  />
                </ListItemButton>
                <Button
                  color="error"
                  aria-label={`Borrar ${item.title}`}
                  disabled={!scope.canWrite}
                  onClick={() => setSelected(item)}
                  sx={{ flexShrink: 0, minHeight: 44 }}
                >
                  Borrar
                </Button>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      {query.hasNextPage && (
        <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Cargar más
        </Button>
      )}
      <Dialog
        open={selected !== null}
        aria-labelledby={dialogId}
        onClose={deleting ? undefined : () => setSelected(null)}
        slotProps={{
          transition: {
            onExited: () => {
              const target = focusAfterDelete.current
              if (target !== null) (rowLinks.current.get(target) ?? newButton.current)?.focus()
              focusAfterDelete.current = null
            },
          },
        }}
      >
        <DialogTitle id={dialogId}>¿Borrar la nota libre?</DialogTitle>
        <DialogContent sx={{ overflowWrap: 'anywhere' }}>{selected?.title}</DialogContent>
        <DialogActions>
          <Button autoFocus disabled={deleting} onClick={() => setSelected(null)}>
            Cancelar
          </Button>
          <Button
            color="error"
            disabled={deleting || !scope.canWrite}
            onClick={() => void remove()}
          >
            Borrar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
