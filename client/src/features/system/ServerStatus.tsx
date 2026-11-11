import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useIsNarrow } from '../../shared/ui/useIsNarrow'
import { useReadiness } from './useReadiness'

const STATES = {
  online: { label: 'Online', name: 'Servidor conectado', color: 'success.main' },
  offline: { label: 'Offline', name: 'Servidor sin conexión', color: 'error.main' },
  connecting: { label: 'Conectando', name: 'Conectando con el servidor', color: 'text.disabled' },
} as const

/**
 * Estado del servidor en la barra: el dato proviene siempre de readiness (cada 5 s), nunca del bundle. Un fallo
 * retira el «Online» anterior aunque quede una respuesta previa en cache.
 */
export function ServerStatus() {
  const readiness = useReadiness()
  const narrow = useIsNarrow()
  const state = readiness.isError ? 'offline' : readiness.isPending ? 'connecting' : 'online'
  const { label, name, color } = STATES[state]

  const indicator = (
    <Box
      role="status"
      aria-label={name}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, px: 0.5 }}
    >
      <Box
        aria-hidden
        sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }}
      />
      {narrow ? null : (
        <Typography variant="caption" color="text.secondary" noWrap>
          {label}
        </Typography>
      )}
    </Box>
  )

  return narrow ? <Tooltip title={name}>{indicator}</Tooltip> : indicator
}
