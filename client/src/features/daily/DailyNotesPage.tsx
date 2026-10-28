import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
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
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { useSession } from '../../features/auth/sessionContext'
import { useDailyDraftContext } from '../../features/daily/DailyDraftProvider'
import { listDailyNotes, type DailyNoteListItem } from '../../features/daily/api'
import { DailyEditor } from '../../features/daily/editor/DailyEditor'
import { documentToPlainText, emptyDocument } from '../../features/daily/editor/dailyDocument'
import type { DailyContent } from '../../features/daily/editor/dailyDocument'
import { SaveDailyVersion } from '../../features/daily/SaveDailyVersion'
import { CopyButton } from '../../shared/ui/CopyButton'
import { useSaveDailyVersion } from '../../features/daily/useSaveDailyVersion'
import { isValidIsoDate } from './dateUtils'

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
  const navigate = useNavigate()
  const { status: sessionStatus, user: sessionUser } = useSession()

  // Hook del provider — siempre disponible aquí porque solo se monta dentro de DailyDraftProvider
  const ctx = useDailyDraftContext()
  const { isDirty, status, error, content, retry, navigateToDate, activeDate } = ctx

  // Estado de la lista paginada (listLoading inicia true para cargar al montar sin setState en efecto)
  const [notesList, setNotesList] = useState<DailyNoteListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<Error | null>(null)
  const [listPage, setListPage] = useState(0)
  const [listTotalPages, setListTotalPages] = useState(1)

  // Refs para evitar closures stale en callbacks
  const navigateToDateRef = useRef(navigateToDate)
  const navigatingRef = useRef(false)
  useEffect(() => {
    navigateToDateRef.current = navigateToDate
  }, [navigateToDate])

  // Cargar lista de notas
  const loadList = useCallback(async (page: number) => {
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

  // Cargar lista al montar (llamada directa para evitar setState síncrono en efecto)
  useEffect(() => {
    listDailyNotes(0)
      .then((result) => {
        setNotesList(result.content)
        setListTotalPages(result.totalPages)
        setListPage(result.page)
        setListError(null)
      })
      .catch((err) => {
        setListError(err instanceof Error ? err : new Error('Error al cargar notas'))
      })
      .finally(() => {
        setListLoading(false)
      })
  }, [])

  // Navegar a otra fecha, con flush si hay dirty
  const handleNavigateToDate = useCallback(
    async (newDate: string) => {
      if (navigatingRef.current || ctx.navigationLocked || newDate === activeDate) return
      navigatingRef.current = true
      try {
        await navigateToDateRef.current(newDate)
        await navigate(`/notes/${newDate}`)
      } catch {
        // Error visible desde el coordinador; conservar fecha y borrador.
      } finally {
        navigatingRef.current = false
      }
    },
    [activeDate, ctx.navigationLocked, navigate],
  )

  // Editor onChange → envía al provider
  const handleEditorChange = useCallback(
    (newContent: DailyContent) => {
      ctx.edit(newContent)
    },
    [ctx],
  )

  // Hook de guardar versión manual — debe estar antes de cualquier early return
  const saveVersion = useSaveDailyVersion({
    owner: sessionUser?.id ?? '',
    date: activeDate,
    note: { flush: ctx.flush, revision: ctx.revision, getRevision: ctx.getRevision },
    sessionIsCurrent: () => sessionStatus === 'authenticated',
    onLockChange: ctx.setNavigationLocked,
  })

  // Sin sesión no debería llegar aquí, pero por seguridad
  if (sessionStatus !== 'authenticated') {
    return <DailyNotesLoginRequired />
  }

  const targetDate = activeDate

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

  const notePlainText = content ? documentToPlainText(content) : ''

  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="h5" component="h1">
          Notas diarias
        </Typography>
        <TextField
          label="Fecha"
          type="date"
          size="small"
          value={targetDate}
          disabled={saveVersion.isLocked}
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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', ml: 'auto' }}>
          <CopyButton aria-label="Copiar nota" text={notePlainText}>
            Copiar nota
          </CopyButton>
          {saveIndicator}
        </Stack>
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
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <DailyEditor
          initialContent={content ?? emptyDocument()}
          onChange={handleEditorChange}
          readOnly={saveVersion.isLocked || ctx.isLoading}
        />
      </Paper>

      {/* Guardar versión manual */}
      {!ctx.isLoading && <SaveDailyVersion save={saveVersion} date={targetDate} />}

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
  return <DailyNotesInner />
}
