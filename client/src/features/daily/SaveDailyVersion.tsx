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
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../services/http'
import { getDailyVersion, saveDailyVersion, dailyVersionKeys } from './versionApi'
import { formatDateLocal } from './dateUtils'
import type { UseDailyNoteReturn } from './useDailyNote'

// ——— Hook de lógica ———

export type SaveVersionPhase =
  | 'idle'
  | 'checking'
  | 'confirming'
  | 'saving'
  | 'success'
  | 'error'
  | 'conflict'
  | 'unknown'

export interface UseSaveDailyVersionReturn {
  /** true mientras se consulta/confirmación/flush+POST; el editor debe bloquearse. */
  isLocked: boolean
  /** Fase actual de la operación. */
  phase: SaveVersionPhase
  /** Error activo (si phase es error/conflict). */
  error: ApiError | null
  /** Abre el flujo: consulta versión existente y, si no hay, ejecuta directamente. */
  handleClick: () => void
  /** Confirma el reemplazo tras la consulta previa (200). */
  handleConfirm: () => void
  /** Cancela la confirmación; no modifica la copia. */
  handleCancel: () => void
  /** Reintenta desde cero tras error/conflict/unknown. */
  handleRetry: () => void
  /** true si se muestra el diálogo de confirmación. */
  showConfirmDialog: boolean
  /** Fecha formateada para el diálogo de confirmación. */
  confirmDate: string | null
}

/**
 * Hook que coordina la secuencia de guardar versión manual (S-104 v2).
 *
 * 1. Click → consultar versión propia (200/404/error).
 * 2. 200 → diálogo de confirmación; 404 → ejecutar directamente; error → bloquear.
 * 3. Al confirmar → flush({ force }) + POST con revisión confirmada.
 * 4. Invalidar queries de identidad iniciadora.
 */
export function useSaveDailyVersion({
  owner,
  date,
  note,
  sessionIsCurrent,
}: {
  owner: string
  date: string
  note: Pick<UseDailyNoteReturn, 'flush' | 'revision'>
  sessionIsCurrent?: () => boolean
}): UseSaveDailyVersionReturn {
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<SaveVersionPhase>('idle')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmDate, setConfirmDate] = useState<string | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const isLocked = phase === 'checking' || phase === 'confirming' || phase === 'saving'

  // ——— Consultar versión existente ———
  const checkExisting = useCallback(async () => {
    setPhase('checking')
    setError(null)
    try {
      await getDailyVersion(date, undefined, sessionIsCurrent)
      setConfirmDate(date)
      setPhase('confirming')
      setShowConfirmDialog(true)
    } catch (err) {
      const apiErr = err as ApiError | null
      if (apiErr && apiErr.status === 404) {
        setConfirmDate(null)
        setPhase('idle')
        executeSave()
      } else {
        setError(apiErr ?? null)
        setPhase('error')
      }
    }
  }, [date, sessionIsCurrent])

  // ——— Ejecutar flush + POST ———
  const executeSave = useCallback(async () => {
    setPhase('saving')
    setError(null)

    try {
      await note.flush({ force: true })
      await saveDailyVersion(owner, date, note.revision)

      const keys = dailyVersionKeys(owner)
      await queryClient.invalidateQueries({ queryKey: keys.detail(date) })
      await queryClient.invalidateQueries({ queryKey: keys.list() })

      if (sessionIsCurrent && !sessionIsCurrent()) {
        setPhase('unknown')
        return
      }

      setPhase('success')
    } catch (err) {
      const apiErr = err as ApiError | null
      if (apiErr && apiErr.status === 409) {
        setError(apiErr)
        setPhase('conflict')
        return
      }
      if (apiErr && apiErr.status === 403) {
        setError(apiErr)
        setPhase('error')
        return
      }
      if (apiErr) {
        setError(apiErr)
      }
      setPhase('unknown')
    }
  }, [owner, date, note, queryClient, sessionIsCurrent])

  const handleClick = useCallback(() => {
    if (isLocked) return
    checkExisting()
  }, [isLocked, checkExisting])

  const handleConfirm = useCallback(() => {
    setShowConfirmDialog(false)
    executeSave()
  }, [executeSave])

  const handleCancel = useCallback(() => {
    setShowConfirmDialog(false)
    setPhase('idle')
    setError(null)
  }, [])

  const handleRetry = useCallback(() => {
    setError(null)
    setPhase('idle')
  }, [])

  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(() => {
        setPhase('idle')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [phase])

  return {
    isLocked,
    phase,
    error,
    handleClick,
    handleConfirm,
    handleCancel,
    handleRetry,
    showConfirmDialog,
    confirmDate,
  }
}

// ——— Componente UI (presentacional) ———

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
