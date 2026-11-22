import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Typography from '@mui/material/Typography'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { useCopyToClipboard } from '../../shared/ui/useCopyToClipboard'
import {
  deleteImageText,
  fetchImageText,
  fetchImageTexts,
  type ImageTextCursor,
  type ImageTextItem,
} from './imageTextsApi'
import { ocrActionSx } from './styles'
import { useImageTextScope, type ImageTextScope } from './useImageTextScope'

const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' })

export function ImageTextLibrary({ scope }: { scope: ImageTextScope }) {
  const { key, client, isCurrent, mutate, invalidateList } = useImageTextScope(scope)
  const headingId = useId()
  const dialogId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const deletionPending = useRef(false)
  const focusAfterDelete = useRef<string[] | null>(null)
  const [opened, setOpened] = useState<string | null>(null)
  const [target, setTarget] = useState<ImageTextItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)

  const list = useInfiniteQuery({
    queryKey: [...key, 'list'],
    initialPageParam: null as ImageTextCursor | null,
    queryFn: ({ signal, pageParam }) =>
      fetchImageTexts(scope.space, pageParam, { signal, sessionIsCurrent: isCurrent }),
    getNextPageParam: (last) => last.next,
    retry: false,
  })
  const items = list.data?.pages.flatMap((page) => page.items) ?? []
  const rowId = (id: string) => `${headingId}-${id}`

  function dismissDelete() {
    if (deletionPending.current) return
    setTarget(null)
    setDeleteFailed(false)
  }

  async function confirmDelete() {
    if (!target || !scope.csrfReady || deletionPending.current || !isCurrent()) return
    deletionPending.current = true
    setDeleting(true)
    setDeleteFailed(false)
    const index = items.findIndex(({ id }) => id === target.id)
    try {
      await mutate((options) => deleteImageText(scope.space, target.id, options))
      if (isCurrent())
        client.removeQueries({ queryKey: [...key, 'detail', target.id], exact: true })
      await invalidateList()
      if (!isCurrent()) return
      focusAfterDelete.current = [
        ...items.slice(index + 1),
        ...items.slice(0, index).reverse(),
      ].map(({ id }) => rowId(id))
      setTarget(null)
    } catch {
      if (isCurrent()) setDeleteFailed(true)
    } finally {
      deletionPending.current = false
      if (isCurrent()) setDeleting(false)
    }
  }

  function restoreAfterDelete() {
    const candidates = focusAfterDelete.current
    focusAfterDelete.current = null
    if (!candidates) return
    const candidate = candidates.map((id) => document.getElementById(id)).find(Boolean)
    const destination = candidate ?? heading.current
    destination?.focus()
  }

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ width: '100%', minWidth: 0 }}>
      <Typography
        id={headingId}
        ref={heading}
        tabIndex={-1}
        variant="subtitle1"
        component="h2"
        sx={{ fontWeight: 600 }}
      >
        Textos guardados
      </Typography>
      {list.isPending && <Typography role="status">Cargando textos guardados…</Typography>}
      {list.isError && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              onClick={() =>
                void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch())
              }
            >
              Reintentar
            </Button>
          }
        >
          No se pudieron cargar los textos guardados.
        </Alert>
      )}
      {list.isSuccess && items.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          Todavía no hay textos guardados en este espacio.
        </Typography>
      )}
      {items.length > 0 && (
        <List disablePadding>
          {items.map((item) => (
            <ListItem key={item.id} disableGutters divider>
              <ListItemButton
                component="button"
                id={rowId(item.id)}
                aria-label={`Abrir ${item.excerpt}`}
                onClick={() => setOpened(item.id)}
                sx={{ ...ocrActionSx, display: 'block', minWidth: 0, textAlign: 'left' }}
              >
                <Typography component="time" dateTime={item.createdAt} variant="caption">
                  {dateFormat.format(new Date(item.createdAt))}
                </Typography>
                <Typography
                  component="span"
                  noWrap
                  color="text.secondary"
                  variant="body2"
                  sx={{ display: 'block', fontFamily: 'monospace' }}
                >
                  {item.excerpt}
                </Typography>
              </ListItemButton>
              <Button
                sx={{ ...ocrActionSx, flexShrink: 0 }}
                aria-label={`Borrar ${item.excerpt}`}
                color="error"
                disabled={!scope.csrfReady}
                onClick={() => setTarget(item)}
              >
                Borrar
              </Button>
            </ListItem>
          ))}
        </List>
      )}
      {list.hasNextPage && !list.isFetchNextPageError && (
        <Button
          sx={ocrActionSx}
          disabled={list.isFetching}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}
      {opened && <SavedTextDialog scope={scope} id={opened} onClose={() => setOpened(null)} />}
      <Dialog
        open={target !== null}
        aria-labelledby={dialogId}
        onClose={dismissDelete}
        slotProps={{ transition: { onExited: restoreAfterDelete } }}
      >
        <DialogTitle id={dialogId}>Borrar texto guardado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Querés borrar este texto? Esta acción no se puede deshacer.
          </DialogContentText>
          {deleteFailed && (
            <Alert severity="error" sx={{ mt: 2 }}>
              No se pudo borrar el texto. Volvé a intentarlo.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button autoFocus sx={ocrActionSx} disabled={deleting} onClick={dismissDelete}>
            Cancelar
          </Button>
          <Button
            sx={ocrActionSx}
            disabled={deleting || !scope.csrfReady}
            color="error"
            variant="contained"
            onClick={() => void confirmDelete()}
          >
            {deleting ? 'Borrando…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function SavedTextDialog({
  scope,
  id,
  onClose,
}: {
  scope: ImageTextScope
  id: string
  onClose: () => void
}) {
  const label = useId()
  const { key, isCurrent } = useImageTextScope(scope)
  const { copy } = useCopyToClipboard()
  const [copied, setCopied] = useState<boolean | null>(null)
  const detail = useQuery({
    queryKey: [...key, 'detail', id],
    queryFn: ({ signal }) =>
      fetchImageText(scope.space, id, { signal, sessionIsCurrent: isCurrent }),
    retry: false,
  })

  async function copySaved(text: string) {
    const outcome = await copy(text)
    if (isCurrent()) setCopied(outcome.success)
  }

  return (
    <Dialog open aria-labelledby={label} onClose={onClose} fullWidth>
      <DialogTitle id={label}>Texto guardado</DialogTitle>
      <DialogContent dividers>
        {detail.isPending && <Typography role="status">Cargando texto…</Typography>}
        {detail.isError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => void detail.refetch()}>
                Reintentar
              </Button>
            }
          >
            No se pudo abrir el texto guardado.
          </Alert>
        )}
        {detail.isSuccess && (
          <Box
            component="pre"
            sx={{
              m: 0,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              fontFamily: '"Roboto Mono", monospace',
            }}
          >
            {detail.data.text}
          </Box>
        )}
        {copied === true && <Typography role="status">Texto copiado</Typography>}
        {copied === false && (
          <Alert severity="error">Seleccioná y copiá el texto manualmente.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button autoFocus sx={ocrActionSx} onClick={onClose}>
          Cerrar
        </Button>
        {detail.isSuccess && (
          <Button sx={ocrActionSx} onClick={() => void copySaved(detail.data.text)}>
            Copiar texto guardado
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
