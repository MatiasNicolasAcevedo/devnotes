import Link from '@mui/material/Link'
import { alpha } from '@mui/material/styles'
import { Link as RouterLink, useMatch } from 'react-router'
import { DEMO_RED } from '../../app/theme'
import { PlayIcon } from '../../shared/ui/icons'
import { useSpaceHref } from '../spaces/spaceContext'

/**
 * Destino Demo de la barra superior, fuera de «Navegación principal». Por debajo de 360 px queda solo el ícono; el
 * nombre accesible es «Demo» en todos los anchos.
 */
export function DemoLink() {
  const href = useSpaceHref()
  const active = useMatch('/demo') != null
  return (
    <Link
      component={RouterLink}
      to={href('/demo')}
      aria-label="Demo"
      aria-current={active ? 'page' : undefined}
      underline="none"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        flexShrink: 0,
        minHeight: 'var(--shell-control-size, 44px)',
        minWidth: 44,
        px: 1,
        border: 1,
        borderColor: alpha(DEMO_RED, 0.48),
        borderRadius: 1.25,
        color: DEMO_RED,
        fontSize: 'var(--shell-label-size, .875rem)',
        lineHeight: 1.25,
        bgcolor: active ? alpha(DEMO_RED, 0.16) : undefined,
        '&:hover': { bgcolor: alpha(DEMO_RED, active ? 0.2 : 0.08) },
        '&:focus-visible': {
          outline: `2px solid ${DEMO_RED}`,
          outlineOffset: 'var(--shell-focus-offset, 2px)',
        },
        '@media (max-width: 359.98px)': { px: 0, '& [data-demo-label]': { display: 'none' } },
      }}
    >
      <PlayIcon />
      <span data-demo-label="">Demo</span>
    </Link>
  )
}
