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
import Stack from '@mui/material/Stack'
import { Link as RouterLink } from 'react-router'
import { formatDateLocal } from './dateUtils'
import type { UseSaveDailyVersionReturn } from './useSaveDailyVersion'

/**
 * Botón y estados de guardar versión manual.
 * Recibe el resultado del hook `useSaveDailyVersion` y la fecha activa para formatear el diálogo.
 */
export function SaveDailyVersion({
  save,
  date,
}: {
  save: UseSaveDailyVersionReturn
  date: string
}) {
  const { phase, error, handleClick, handleConfirm, handleCancel, handleRetry, showConfirmDialog, confirmDate } =
    save

  const formattedDate = confirmDate ? formatDateLocal(confirmDate) : formatDateLocal(date)

  const buttonDisabled =
    save.isLocked ||
    phase === 'success' ||
    phase === 'error' ||
    phase === 'conflict' ||
    phase === 'unknown'

  let buttonLabel: React.ReactNode
  if (phase === 'saving') {
    buttonLabel = (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <CircularProgress size={16} aria-hidden />
        <span>Guardando versión…</span>
      </Stack>
    )
  } else {
    buttonLabel = 'Guardar versión'
  }

  return (
    <>
      <Stack spacing={1} sx={{ width: '100%' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          disabled={buttonDisabled}
          aria-label="Guardar versión"
        >
          {buttonLabel}
        </Button>

        {phase === 'success' && (
          <Alert severity="success" role="alert">
            Versión guardada correctamente.
          </Alert>
        )}

        {phase === 'conflict' && (
          <Alert severity="warning" role="alert">
            <AlertTitle>Conflicto de revisión</AlertTitle>
            La revisión del trabajo ha cambiado. Recarga la página y vuelve a intentarlo.
          </Alert>
        )}

        {phase === 'error' && error && (
          <Alert severity="error" role="alert">
            Error al guardar la versión.{' '}
            <Link component="button" onClick={handleRetry}>
              Reintentar
            </Link>
          </Alert>
        )}

        {phase === 'unknown' && (
          <Alert severity="warning" role="alert">
            <AlertTitle>Resultado desconocido</AlertTitle>
            No se pudo confirmar si la versión se guardó. Consulta el{' '}
            <Link component={RouterLink} to="/history">
              historial de versiones
            </Link>{' '}
            antes de repetir la acción.
            <Box sx={{ mt: 1 }}>
              <Link component="button" onClick={handleRetry}>
                Reintentar
              </Link>
            </Box>
          </Alert>
        )}
      </Stack>

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
