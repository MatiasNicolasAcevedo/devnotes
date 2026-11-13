import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ApiError } from '../../services/http'
import { ErrorAlert } from '../../shared/ui/ErrorAlert'
import {
  MAX_CONSECUTIVE_FAILURES,
  SERVICE_ZONE,
  type ProbeResult,
  type ServiceActivityStatus,
} from './api'
import {
  useServiceActivityAction,
  useServiceActivityStatus,
  type WindowAction,
} from './useServiceActivity'

export const PROBE_NOTICE =
  'La sonda intenta evitar la suspensión por inactividad. Render puede reiniciar el servicio'

const RESULT_LABELS: Record<ProbeResult, string> = {
  none: 'Sin intentos todavía',
  up: 'El servidor respondió correctamente',
  timeout: 'Sin respuesta a tiempo',
  http_error: 'Respuesta HTTP con error',
  invalid_response: 'Respuesta inválida',
  unavailable: 'No se pudo conectar',
}

const timeFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: SERVICE_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dateFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: SERVICE_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Hora y fecha en la zona del servicio, independientes de la zona del dispositivo. */
function formatInstant(value: string) {
  const instant = new Date(value)
  return { time: timeFormat.format(instant), date: dateFormat.format(instant) }
}

function at(value: string | null) {
  if (value === null) return 'Nunca'
  const { time, date } = formatInstant(value)
  return `${date} ${time}`
}

type WindowState = 'paused' | 'stopped' | 'active' | 'inactive'

function windowState(status: ServiceActivityStatus): WindowState {
  if (status.pausedToday) return 'paused'
  if (status.active && status.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return 'stopped'
  if (status.active) return 'active'
  return 'inactive'
}

interface ServiceActivityDialogProps {
  owner: string
  open: boolean
  csrfReady: boolean
  onClose: () => void
}

/**
 * Detalle de «Actividad del servidor» en el menú de cuenta. Lee el estado solo al abrir y tras una acción; pausar y
 * reanudar son explícitos. Sus errores quedan aquí: no tocan el indicador de conexión ni el guardado de notas.
 */
export function ServiceActivityDialog({
  owner,
  open,
  csrfReady,
  onClose,
}: ServiceActivityDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="service-activity-title" fullWidth>
      <DialogTitle id="service-activity-title">Actividad del servidor</DialogTitle>
      {open ? (
        <ServiceActivityContent owner={owner} csrfReady={csrfReady} onClose={onClose} />
      ) : null}
    </Dialog>
  )
}

function ServiceActivityContent({
  owner,
  csrfReady,
  onClose,
}: Omit<ServiceActivityDialogProps, 'open'>) {
  const status = useServiceActivityStatus(owner, true)
  const action = useServiceActivityAction(owner)
  const busy = action.isPending || status.isFetching
  const run = (kind: WindowAction) => action.mutate(kind)
  const actionsDisabled = busy || !csrfReady

  const data = status.data
  const unavailable = status.error instanceof ApiError && status.error.status === 404
  const state = data ? windowState(data) : null

  return (
    <>
      <DialogContent>
        <Stack spacing={2}>
          {status.isPending ? (
            <Stack direction="row" spacing={1.5} role="status" sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} aria-hidden />
              <Typography>Consultando la actividad…</Typography>
            </Stack>
          ) : null}
          {unavailable ? (
            <Alert severity="info">La actividad del servidor no está disponible.</Alert>
          ) : status.error && !data ? (
            <ErrorAlert
              error={status.error}
              title="No se pudo consultar la actividad"
              onRetry={() => void status.refetch()}
              retryDisabled={status.isFetching}
            />
          ) : null}
          {data && state ? <StatusDetail status={data} state={state} /> : null}
          {action.error ? <ErrorAlert error={action.error} title="La actividad no cambió" /> : null}
          <Typography variant="body2" color="text.secondary">
            {PROBE_NOTICE}.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            «Online» indica solo la última respuesta del servidor. La sonda no guarda ni sincroniza
            notas.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        {state === 'active' || state === 'stopped' ? (
          <Button onClick={() => run('pause')} disabled={actionsDisabled}>
            Pausar por hoy
          </Button>
        ) : null}
        {state === 'paused' ? (
          <Button onClick={() => run('resume')} disabled={actionsDisabled}>
            Reanudar hoy
          </Button>
        ) : null}
        {state === 'stopped' ? (
          <Button onClick={() => run('resume')} disabled={actionsDisabled}>
            Reintentar la sonda
          </Button>
        ) : null}
        {state === 'inactive' ? (
          <Button onClick={() => run('resume')} disabled={actionsDisabled}>
            Activar hoy
          </Button>
        ) : null}
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </>
  )
}

function StatusDetail({ status, state }: { status: ServiceActivityStatus; state: WindowState }) {
  const until = status.activeUntil ? formatInstant(status.activeUntil) : null
  return (
    <Stack spacing={1}>
      <Typography role="status" aria-live="polite" sx={{ fontWeight: 600 }}>
        {state === 'paused'
          ? 'Pausada por hoy'
          : state === 'stopped'
            ? 'No se pudo comprobar la sonda'
            : state === 'active' && until
              ? `Activo hasta las ${until.time}`
              : 'Inactiva hoy'}
      </Typography>
      {until && state !== 'paused' ? (
        <Typography variant="body2">
          Corte: {until.date} {until.time} (hora de {SERVICE_ZONE})
        </Typography>
      ) : null}
      <Typography variant="body2">Última respuesta: {RESULT_LABELS[status.lastResult]}</Typography>
      <Typography variant="body2">Último intento: {at(status.lastAttemptAt)}</Typography>
      <Typography variant="body2">Última respuesta correcta: {at(status.lastSuccessAt)}</Typography>
      {status.consecutiveFailures > 0 ? (
        <Typography variant="body2">Fallos seguidos: {status.consecutiveFailures}</Typography>
      ) : null}
      {status.nextAttemptAt ? (
        <Typography variant="body2">Próximo intento: {at(status.nextAttemptAt)}</Typography>
      ) : null}
    </Stack>
  )
}
