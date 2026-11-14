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
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Tooltip from '@mui/material/Tooltip'
import { Link as RouterLink } from 'react-router'
import { AMBER } from '../../app/theme'
import { SaveIcon } from '../../shared/ui/icons'
import { formatDateLocal } from './dateUtils'
import type { UseSaveDailyVersionReturn } from './useSaveDailyVersion'
import { useSpaceHref } from '../spaces/spaceContext'

/**
 * Botón de icono (disquete) para guardar una versión manual, con su diálogo de confirmación. Va en la barra del
 * editor; los avisos de resultado se muestran aparte con `SaveDailyVersionNotices`.
 * Recibe el resultado del hook `useSaveDailyVersion` y la fecha activa para formatear el diálogo.
 */
export function SaveDailyVersion({
  save,
  date,
}: {
  save: UseSaveDailyVersionReturn
  date: string
}) {
  const { phase, handleClick, handleConfirm, handleCancel, showConfirmDialog, confirmDate } = save

  const formattedDate = confirmDate ? formatDateLocal(confirmDate) : formatDateLocal(date)

  const buttonDisabled =
    save.isLocked ||
    phase === 'success' ||
    phase === 'error' ||
    phase === 'conflict' ||
    phase === 'unknown'

  return (
    <>
      {/* El span recibe el puntero cuando el botón está deshabilitado, así el tooltip sigue disponible. */}
      <Tooltip title="Guardar versión" describeChild>
        <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}>
          <IconButton
            size="small"
            onClick={handleClick}
            disabled={buttonDisabled}
            aria-label="Guardar versión"
            sx={{ color: AMBER }}
          >
            {phase === 'saving' ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          </IconButton>
        </Box>
      </Tooltip>

      <Dialog open={showConfirmDialog} onClose={handleCancel}>
        <DialogTitle>Reemplazar versión existente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Ya hay una versión guardada del {formattedDate}. ¿Querés reemplazarla con la versión
            actual del trabajo?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} variant="contained">
            Reemplazar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

/** Avisos de «Guardar versión»: éxito, conflicto, error y resultado desconocido. No entran en la barra. */
export function SaveDailyVersionNotices({ save }: { save: UseSaveDailyVersionReturn }) {
  const { phase, error, handleRetry } = save
  const href = useSpaceHref()

  if (phase === 'success') {
    return (
      <Alert severity="success" role="alert">
        Versión guardada correctamente.
      </Alert>
    )
  }

  if (phase === 'conflict') {
    return (
      <Alert severity="warning" role="alert">
        <AlertTitle>Conflicto de revisión</AlertTitle>
        La revisión del trabajo ha cambiado. Recarga la página y vuelve a intentarlo.
      </Alert>
    )
  }

  if (phase === 'error' && error) {
    return (
      <Alert severity="error" role="alert">
        Error al guardar la versión.{' '}
        <Link component="button" onClick={handleRetry}>
          Reintentar
        </Link>
      </Alert>
    )
  }

  if (phase === 'unknown') {
    return (
      <Alert severity="warning" role="alert">
        <AlertTitle>Resultado desconocido</AlertTitle>
        No se pudo confirmar si la versión se guardó. Consulta el{' '}
        <Link component={RouterLink} to={href('/history')}>
          historial de versiones
        </Link>{' '}
        antes de repetir la acción.
        <Box sx={{ mt: 1 }}>
          <Link component="button" onClick={handleRetry}>
            Reintentar
          </Link>
        </Box>
      </Alert>
    )
  }

  return null
}
