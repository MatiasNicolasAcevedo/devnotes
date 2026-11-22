import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, type ChangeEvent } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { useSession } from '../../features/auth/sessionContext'
import { useDailyDraftContext } from '../../features/daily/DailyDraftProvider'
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
import { useFreeNotesContext } from '../free-notes/freeNotesContext'
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

  const rememberDate = useFreeNotesContext()?.rememberDate
  useEffect(() => rememberDate?.(space, activeDate), [rememberDate, space, activeDate])

  // Refs para evitar closures stale en callbacks
  const navigateToDateRef = useRef(navigateToDate)
  const navigatingRef = useRef(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const narrow = useIsNarrow()
  useEffect(() => {
    navigateToDateRef.current = navigateToDate
  }, [navigateToDate])

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
      <Button
        component={RouterLink}
        to={href(`/free-notes?from=${targetDate}`)}
        size="small"
        sx={{ flexShrink: 0 }}
      >
        Libres
      </Button>
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

  const copyNote = <CopyButton aria-label="Copiar nota" text={notePlainText} iconOnly />

  const toolbarEnd = (
    <>
      <SaveStatusIndicator status={status} isDirty={isDirty} />
      {!narrow && copyNote}
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
    <Stack spacing={1} sx={{ flexGrow: 1 }}>
      <Typography component="h1" sx={visuallyHidden}>
        Notas diarias
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minHeight: 220,
          height: 'var(--daily-editor-height, 220px)',
        }}
      >
        <DailyEditor
          initialContent={content ?? emptyDocument()}
          onChange={handleEditorChange}
          readOnly={ctx.navigationLocked || ctx.isLoading || ctx.copyTargetNeedsReload}
          toolbarStart={toolbarStart}
          toolbarEnd={toolbarEnd}
          narrowTools={
            <CopyButton aria-label="Copiar nota" text={notePlainText}>
              Copiar nota
            </CopyButton>
          }
          confirmedCopyContent={ctx.confirmedCopy?.note.content}
          fillHeight
        >
          <CopyPreviousNote />
        </DailyEditor>
      </Paper>
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
