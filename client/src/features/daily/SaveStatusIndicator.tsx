import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { CheckIcon, PendingIcon } from '../../shared/ui/icons'
import { useIsNarrow } from '../../shared/ui/useIsNarrow'
import type { SaveStatus } from './useDailyNote'

/**
 * Estado del guardado automático en la barra del editor: icono y texto en ancho, solo icono con nombre accesible en
 * angosto. Error y conflicto no entran en la barra: `DailyNotesPage` los muestra en la fila inferior.
 */
export function SaveStatusIndicator({ status, isDirty }: { status: SaveStatus; isDirty: boolean }) {
  const narrow = useIsNarrow()

  let text: string | null = null
  let color = 'text.secondary'
  if (status === 'saving') text = 'Guardando…'
  else if (status === 'saved') {
    text = 'Guardado'
    color = 'success.main'
  } else if (status === 'unconfirmed') text = 'Sin confirmar'
  else if (status === 'idle' && isDirty) text = 'Sin guardar'

  const label = narrow && text ? { role: 'img', 'aria-label': text, 'aria-hidden': false } : {}
  let icon = null
  if (status === 'saving') {
    icon = <CircularProgress size={16} color="inherit" aria-hidden={!narrow} {...label} />
  } else if (status === 'saved') icon = <CheckIcon {...label} />
  else if (text) icon = <PendingIcon {...label} />

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Estado de guardado"
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, color }}
    >
      {text ? (
        <>
          {icon}
          {narrow ? null : (
            <Typography variant="caption" noWrap>
              {text}
            </Typography>
          )}
        </>
      ) : null}
    </Box>
  )
}
