import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { useSession } from '../../features/auth/sessionContext'
import { DailyDraftProvider, useDailyDraftContext } from '../../features/daily/DailyDraftProvider'
import { listDailyNotes, type DailyNoteListItem } from '../../features/daily/api'
import { DailyEditor } from '../../features/daily/editor/DailyEditor'
import { emptyDocument } from '../../features/daily/editor/dailyDocument'
import type { DailyContent } from '../../features/daily/editor/dailyDocument'
import { isValidIsoDate, todayLocal } from './dateUtils'

// ——— Fallbacks sin provider ———

function DailyNotesInvalidDate({ date }: { date: string }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Notas diarias
      </Typography>
      <Alert severity="error">
        <AlertTitle>Fecha inválida</AlertTitle>
        <Typography>
          <code>{date}</code> no es una fecha válida. Usa el formato AAAA-MM-DD.
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Link component={RouterLink} to="/notes">
            Volver a hoy
          </Link>
        </Box>
      </Alert>
    </Stack>
  )
}

function DailyNotesLoginRequired() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Notas diarias
      </Typography>
      <Alert severity="info">Inicia sesión para acceder a tus notas.</Alert>
    </Stack>
  )
}

// ——— Interior de la página, dentro del provider ———

function DailyNotesInner() {
  const { date: paramDate } = useParams<{ date?: string }>()
  const { status: sessionStatus } = useSession()

  // Hook del provider — siempre disponible aquí porque solo se monta dentro de DailyDraftProvider
  const ctx = useDailyDraftContext()
  const { isDirty, isSaving, status, error, content, retry, navigateToDate, activeDate, discard } =
    ctx

  // Estado de la lista paginada
  const [notesList, setNotesList] = useState<DailyNoteListItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<Error | null>(null)
  const [listPage, setListPage] = useState(0)
  const [listTotalPages, setListTotalPages] = useState(1)

  // Diálogo de descarte
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [pendingDate, setPendingDate] = useState<string | null>(null)

  // Refs para evitar closures stale en callbacks
  const navigateToDateRef = useRef(navigateToDate)
  const discardRef = useRef(discard)
  useEffect(() => {
    navigateToDateRef.current = navigateToDate
  }, [navigateToDate])
  useEffect(() => {
    discardRef.current = discard
  }, [discard])

  // beforeunload: advierte si hay cambios sin guardar o escritura en vuelo
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty || isSaving) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, isSaving])

  // Cargar lista de notas
  const loadList = useCallback(async (page: number) => {
    setListLoading(true)
    setListError(null)
    try {
      const result = await listDailyNotes(page)
      setNotesList(result.content)
      setListTotalPages(result.totalPages)
      setListPage(result.page)
    } catch (err) {
      setListError(err instanceof Error ? err : new Error('Error al cargar notas'))
    } finally {
      setListLoading(false)
    }
  }, [])

  // Navegar a otra fecha, con flush si hay dirty
  const handleNavigateToDate = useCallback(
    async (newDate: string) => {
      if ((isDirty || isSaving) && newDate !== activeDate) {
        setPendingDate(newDate)
        setShowDiscardDialog(true)
        return
      }
      navigateToDateRef.current(newDate)
    },
    [isDirty, isSaving, activeDate],
  )

  const handleConfirmDiscard = useCallback(async () => {
    setShowDiscardDialog(false)
    if (pendingDate) {
      await discardRef.current()
      navigateToDateRef.current(pendingDate)
      setPendingDate(null)
    }
  }, [pendingDate])

  const handleCancelDiscard = useCallback(() => {
    setShowDiscardDialog(false)
    setPendingDate(null)
  }, [])

  // Editor onChange → envía al provider
  const handleEditorChange = useCallback(
    (newContent: DailyContent) => {
      ctx.edit(newContent)
    },
    [ctx],
  )

  // Sin sesión no debería llegar aquí, pero por seguridad
  if (sessionStatus !== 'authenticated') {
    return <DailyNotesLoginRequired />
  }

  const targetDate = paramDate ?? todayLocal()

  // Indicador de guardado
  let saveIndicator: React.ReactNode
  if (status === 'saving') {
    saveIndicator = (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <CircularProgress size={16} aria-hidden />
        <Typography variant="caption">Guardando…</Typography>
      </Stack>
    )
  } else if (status === 'saved') {
    saveIndicator = (
      <Typography variant="caption" color="success.main">
        Guardado
      </Typography>
    )
  } else if (status === 'error') {
    saveIndicator = (
      <Alert severity="error" sx={{ width: 'fit-content' }}>
        Error al guardar.{' '}
        <Link component="button" onClick={retry}>
          Reintentar
        </Link>
      </Alert>
    )
  } else if (status === 'conflict') {
    saveIndicator = (
      <Alert severity="warning">
        <AlertTitle>Conflicto de guardado</AlertTitle>
        Otra sesión modificó esta nota. Recarga para ver el estado actual.
      </Alert>
    )
  } else if (isDirty) {
    saveIndicator = <Typography variant="caption">Sin guardar</Typography>
  } else {
    saveIndicator = null
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="h5" component="h1">
          Notas diarias
        </Typography>
        {saveIndicator}
      </Stack>

      {/* Selector de fecha */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end' }}>
        <TextField
          label="Fecha"
          type="date"
          value={targetDate}
          onChange={(e) => {
            if (isValidIsoDate(e.target.value)) {
              handleNavigateToDate(e.target.value)
            }
          }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 180 }}
        />
        <Link component={RouterLink} to="/notes">
          Hoy
        </Link>
      </Stack>

      {/* Error de query inicial */}
      {error && status === 'error' && (
        <Alert severity="error" role="alert">
          No se pudo cargar la nota.{' '}
          <Link component="button" onClick={retry}>
            Reintentar
          </Link>
        </Alert>
      )}

      {/* Editor */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <DailyEditor initialContent={content ?? emptyDocument()} onChange={handleEditorChange} />
      </Paper>

      {/* Lista de notas existentes */}
      <Stack spacing={1}>
        <Typography variant="h6" component="h2">
          Notas guardadas
        </Typography>
        {listLoading ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CircularProgress size={20} aria-hidden />
            <Typography>Cargando…</Typography>
          </Stack>
        ) : listError ? (
          <Alert severity="error" role="alert">
            No se pudieron cargar las notas.
          </Alert>
        ) : notesList.length === 0 ? (
          <Typography color="text.secondary">Aún no tenés notas guardadas.</Typography>
        ) : (
          <>
            <List dense>
              {notesList.map((item) => (
                <ListItem key={item.date} disablePadding>
                  <ListItemButton
                    component="button"
                    onClick={() => handleNavigateToDate(item.date)}
                    selected={item.date === targetDate}
                  >
                    <ListItemText
                      primary={item.date}
                      secondary={`Modificada: ${item.updatedAt} · Revisión ${item.revision}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            {/* Paginación simple */}
            {listTotalPages > 1 && (
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                {listPage > 0 && (
                  <Button size="small" onClick={() => loadList(listPage - 1)}>
                    Anterior
                  </Button>
                )}
                <Typography variant="caption">
                  Página {listPage + 1} de {listTotalPages}
                </Typography>
                {listPage < listTotalPages - 1 && (
                  <Button size="small" onClick={() => loadList(listPage + 1)}>
                    Siguiente
                  </Button>
                )}
              </Stack>
            )}
          </>
        )}
      </Stack>

      {/* Diálogo de confirmación de descarte */}
      <Dialog open={showDiscardDialog} onClose={handleCancelDiscard}>
        <DialogTitle>Hay cambios sin guardar</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Querés descartar los cambios y navegar a {pendingDate}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDiscard}>Quedarme</Button>
          <Button onClick={handleConfirmDiscard} variant="contained">
            Descartar y continuar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

// ——— Página principal ———

export function DailyNotesPage() {
  const { date: paramDate } = useParams<{ date?: string }>()
  const { user } = useSession()

  // Fecha inválida: sin provider
  if (paramDate !== undefined && !isValidIsoDate(paramDate)) {
    return <DailyNotesInvalidDate date={paramDate} />
  }

  // Sin sesión: sin provider
  if (!user) {
    return <DailyNotesLoginRequired />
  }

  // Autenticado y fecha válida: provider + interior
  const initialDate = paramDate ?? todayLocal()
  return (
    <DailyDraftProvider owner={user.id} initialDate={initialDate} sessionIsCurrent={() => true}>
      <DailyNotesInner />
    </DailyDraftProvider>
  )
}
