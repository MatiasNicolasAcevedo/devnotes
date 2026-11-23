import { Typography } from '@mui/material'
import type { ModelStatus } from './aiContext'

const symbols = { success: '✓', error: '⚠', info: '◷' }

export function AiModelStatus({ status }: { status: ModelStatus }) {
  return (
    <Typography component="span" variant="body2">
      <Typography
        component="span"
        variant="inherit"
        sx={{ color: `${status.tone}.light`, fontWeight: 600 }}
      >
        <span aria-hidden="true">{symbols[status.tone]}&nbsp;</span>
        {status.label}
      </Typography>
      {status.reason && ` · ${status.reason}`}
    </Typography>
  )
}
