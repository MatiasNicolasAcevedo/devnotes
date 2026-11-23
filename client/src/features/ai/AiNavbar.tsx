import { Box, IconButton, Link } from '@mui/material'
import { Link as RouterLink, useMatch } from 'react-router'
import { useSpaceHref } from '../spaces/spaceContext'
import { AI_ACCENT, useAi } from './aiContext'

export function AiNavbar() {
  const ai = useAi()
  const href = useSpaceHref()
  const active = useMatch('/ai')
  if (!ai?.options) return null

  const focus = { '&:focus-visible': { outline: `2px solid ${AI_ACCENT}`, outlineOffset: -2 } }
  return (
    <Box
      sx={{
        display: 'flex',
        flexShrink: 0,
        border: 1,
        borderColor: 'rgba(206,179,255,.48)',
        borderRadius: 1.25,
        color: AI_ACCENT,
        '@keyframes aiStarFocus': {
          from: { filter: `drop-shadow(0 0 4px ${AI_ACCENT})` },
          to: { filter: 'none' },
        },
        '@media (prefers-reduced-motion: no-preference)': {
          '&:focus-within [data-ai-star], &:has([aria-expanded="true"]) [data-ai-star]': {
            animation: 'aiStarFocus 160ms ease-out',
          },
        },
      }}
    >
      <Link
        component={RouterLink}
        to={href('/ai')}
        aria-current={active ? 'page' : undefined}
        underline="none"
        color="inherit"
        sx={{
          minHeight: 'var(--shell-control-size, 44px)',
          minWidth: 49,
          display: 'inline-flex',
          gap: 0.5,
          alignItems: 'center',
          justifyContent: 'center',
          px: 0.5,
          borderRadius: '5px 0 0 5px',
          fontSize: 'var(--shell-label-size, .875rem)',
          bgcolor: active ? 'rgba(206,179,255,.15)' : undefined,
          ...focus,
        }}
      >
        <span aria-hidden="true" data-ai-star="">
          ✦
        </span>{' '}
        IA
      </Link>
      <IconButton
        aria-label="Elegir proveedor y modelo"
        aria-expanded={Boolean(ai.anchor)}
        aria-haspopup="dialog"
        onClick={(event) => ai.open(event.currentTarget)}
        sx={{
          width: 'var(--shell-control-size, 44px)',
          height: 'var(--shell-control-size, 44px)',
          fontSize: 'var(--shell-label-size, 1.5rem)',
          color: 'inherit',
          borderRadius: '0 5px 5px 0',
          borderLeft: 1,
          borderColor: 'rgba(206,179,255,.28)',
          ...focus,
        }}
      >
        <span aria-hidden="true">▾</span>
      </IconButton>
    </Box>
  )
}
