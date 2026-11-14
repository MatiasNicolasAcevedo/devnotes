import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { useSession } from '../../features/auth/sessionContext'
import { useDailyDraftContext } from '../../features/daily/DailyDraftProvider'
import { listDailyNotes, type DailyNoteListItem } from '../../features/daily/api'
import { DailyEditor } from '../../features/daily/editor/DailyEditor'
import { documentToPlainText, emptyDocument } from '../../features/daily/editor/dailyDocument'
import type { DailyContent } from '../../features/daily/editor/dailyDocument'
import { SaveDailyVersion, SaveDailyVersionNotices } from '../../features/daily/SaveDailyVersion'
import { SaveStatusIndicator } from '../../features/daily/SaveStatusIndicator'
import { CopyButton } from '../../shared/ui/CopyButton'
import { CalendarIcon, TodayIcon } from '../../shared/ui/icons'
import { useIsNarrow } from '../../shared/ui/useIsNarrow'
import { visuallyHidden } from '../../shared/ui/visuallyHidden'
import { useSaveDailyVersion } from '../../features/daily/useSaveDailyVersion'
import { isValidIsoDate } from './dateUtils'
import { useSpaceHref } from '../spaces/spaceContext'
import { CopyPreviousNote } from './CopyPreviousNote'

// ——— Fallbacks sin provider ———

function DailyNotesInvalidDate({ date }: { date: string }) {
  const href = useSpaceHref()
  return (
    <Stack spacing={2}>
      <Typography component="h1" sx={visuallyHidden}>
        Notas diarias
      </Typography>
      <Alert severity="error">
        <AlertTitle>Fecha inválida</AlertTitle>
        <Typography>
          <code>{date}</code> no es una fecha válida. Usa el formato AAAA-MM-DD.
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Link component={RouterLink} to={href('/notes')}>
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
      <Typography component="h1" sx={visuallyHidden}>
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
  const { isDirty, status, error, content, retry, navigateToDate, activeDate, space } = ctx
  const href = useSpaceHref()

  // Estado de la lista paginada (listLoading inicia true para cargar al montar sin setState en efecto)
  const [notesList, setNotesList] = useState<DailyNoteListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<Error | null>(null)
  const [listPage, setListPage] = useState(0)
  const [listTotalPages, setListTotalPages] = useState(1)

  // Refs para evitar closures stale en callbacks
  const navigateToDateRef = useRef(navigateToDate)
  const navigatingRef = useRef(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const narrow = useIsNarrow()
  useEffect(() => {
    navigateToDateRef.current = navigateToDate
  }, [navigateToDate])

  // Cargar lista de notas
  const loadList = useCallback(
    async (page: number) => {
      setListError(null)
      try {
        const result = await listDailyNotes(space, page)
        setNotesList(result.content)
        setListTotalPages(result.totalPages)
        setListPage(result.page)
      } catch (err) {
        setListError(err instanceof Error ? err : new Error('Error al cargar notas'))
      } finally {
        setListLoading(false)
      }
    },
    [space],
  )

  // Cargar lista al montar (llamada directa para evitar setState síncrono en efecto)
  useEffect(() => {
    listDailyNotes(space, 0)
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
  }, [space])

  // Navegar a otra fecha, con flush si hay dirty
  const handleNavigateToDate = useCallback(
    async (newDate: string) => {
      if (navigatingRef.current || ctx.navigationLocked || newDate === activeDate) return
      navigatingRef.current = true
      try {
        await navigateToDateRef.current(newDate)
        await navigate(href(`/notes/${newDate}`))
      } catch {
        // Error visible desde el coordinador; conservar fecha y borrador.
      } finally {
        navigatingRef.current = false
      }
    },
    [activeDate, ctx.navigationLocked, navigate, href],
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
    space,
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
  const notePlainText = content ? documentToPlainText(content) : ''
  const [, month, day] = targetDate.split('-')
  const shortDate = `${day}/${month}`

  // Abre el selector nativo; si el navegador no lo ofrece o lo rechaza, el foco queda en el input para escribirla.
  const openDatePicker = () => {
    const input = dateInputRef.current
    if (!input) return
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
        return
      }
    } catch {
      // showPicker exige un gesto del usuario y puede lanzar; se cae al foco.
    }
    input.focus()
  }

  const toolbarStart = (
    <>
      <Box
        component="span"
        sx={{
          position: 'relative',
          display: 'inline-flex',
          flexShrink: 0,
          borderRadius: 1,
          '&:focus-within': { outline: '2px solid', outlineColor: 'primary.main' },
        }}
      >
        <Button
          size="small"
          color="inherit"
          startIcon={<CalendarIcon />}
          aria-label={`Cambiar fecha (${shortDate})`}
          disabled={ctx.navigationLocked}
          onClick={openDatePicker}
          sx={{ minWidth: 0 }}
        >
          {shortDate}
        </Button>
        {/* Oculto a la vista pero operable: conserva la etiqueta, el teclado y el selector nativo. */}
        <Box
          component="input"
          ref={dateInputRef}
          type="date"
          aria-label="Fecha"
          value={targetDate}
          disabled={ctx.navigationLocked}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (isValidIsoDate(event.target.value)) {
              void handleNavigateToDate(event.target.value)
            }
          }}
          sx={{ ...visuallyHidden, left: 0, bottom: 0, margin: 0, opacity: 0, colorScheme: 'dark' }}
        />
      </Box>
      {narrow ? (
        <Tooltip title="Ir a hoy">
          <IconButton
            component={RouterLink}
            to={href('/notes')}
            size="small"
            color="primary"
            aria-label="Ir a hoy"
            sx={{ flexShrink: 0 }}
          >
            <TodayIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          component={RouterLink}
          to={href('/notes')}
          size="small"
          sx={{ minWidth: 0, flexShrink: 0 }}
        >
          Hoy
        </Button>
      )}
    </>
  )

  const toolbarEnd = (
    <>
      <SaveStatusIndicator status={status} isDirty={isDirty} />
      <CopyButton aria-label="Copiar nota" text={notePlainText} iconOnly />
      {!ctx.isLoading && (
        <SaveDailyVersion
          save={saveVersion}
          date={targetDate}
          disabled={ctx.isCopyingPrevious || ctx.copyTargetNeedsReload}
        />
      )}
      {/* Los avisos largos no entran en la fila de controles: van en una fila propia justo debajo. */}
      <Box
        className="daily-editor-toolbar-notices"
        sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
      >
        {error && status === 'error' && (
          <Alert severity="error" role="alert">
            No se pudo cargar la nota.{' '}
            <Link component="button" onClick={retry}>
              Reintentar
            </Link>
          </Alert>
        )}
        {status === 'error' && (
          <Alert severity="error">
            Error al guardar.{' '}
            <Link component="button" onClick={retry}>
              Reintentar
            </Link>
          </Alert>
        )}
        {status === 'conflict' && (
          <Alert severity="warning">
            <AlertTitle>Conflicto de guardado</AlertTitle>
            Otra sesión modificó esta nota. Recarga para ver el estado actual.
          </Alert>
        )}
        {!ctx.isLoading && <SaveDailyVersionNotices save={saveVersion} />}
      </Box>
    </>
  )

  return (
    <Stack spacing={1}>
      <Typography component="h1" sx={visuallyHidden}>
        Notas diarias
      </Typography>

      {/* Primera pantalla: alto libre de la ventana después de las barras de navegación y los márgenes. */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: {
            xs: 'max(calc(100dvh - var(--shell-chrome-height, 56px) - 16px), 220px)',
            sm: 'max(calc(100dvh - var(--shell-chrome-height, 56px) - 24px), 220px)',
          },
        }}
      >
        <Paper
          variant="outlined"
          sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          <DailyEditor
            initialContent={content ?? emptyDocument()}
            onChange={handleEditorChange}
            readOnly={ctx.navigationLocked || ctx.isLoading || ctx.copyTargetNeedsReload}
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            beforeContent={<CopyPreviousNote onCopied={() => void loadList(listPage)} />}
            confirmedCopyContent={ctx.confirmedCopy?.note.content}
            fillHeight
          />
        </Paper>
      </Box>

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
                    disabled={ctx.navigationLocked}
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
