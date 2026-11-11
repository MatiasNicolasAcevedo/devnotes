import projectIdentity from '../project-identity.json'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useRef, type ReactNode, type RefObject } from 'react'
import { Link as RouterLink, matchPath, useLocation } from 'react-router'
import { SessionAlerts } from '../features/auth/SessionAlerts'
import { SessionControls } from '../features/auth/SessionControls'
import { useSession } from '../features/auth/sessionContext'
import { DailyDraftWorkspace } from '../features/daily/DailyDraftNavigation'
import { ServerStatus } from '../features/system/ServerStatus'
import { VoiceDraftNavigation } from '../features/voice/VoiceDraftNavigation'
import { VoiceDraftProvider } from '../features/voice/VoiceDraftProvider'
import { BookmarkIcon, DatabaseIcon, HistoryIcon, MicIcon, NoteIcon } from '../shared/ui/icons'
import { useIsNarrow } from '../shared/ui/useIsNarrow'
import { AMBER } from './theme'

/**
 * Estructura común: barra superior con la sesión y contenido. Las rutas se remontan al cambiar la identidad, así que
 * el estado local de una pantalla nunca pasa de un usuario a otro.
 */
export function AppShell() {
  const { user, status } = useSession()
  const { pathname } = useLocation()
  const owner = user?.id ?? ''
  const voiceActive = status !== 'loading' && matchPath('/voice', pathname) != null
  const navigationRoot = useRef<HTMLDivElement>(null)
  return (
    <AppShellContent navigationRoot={navigationRoot}>
      <VoiceDraftProvider key={owner} owner={owner} active={voiceActive}>
        <VoiceDraftNavigation>
          {(outletOverride, bypassDailyLinks) => (
            <DailyDraftWorkspace
              owner={owner}
              outletOverride={outletOverride}
              bypassLinkFlush={bypassDailyLinks}
              navigationRoot={navigationRoot}
            >
              {(outlet) => outlet}
            </DailyDraftWorkspace>
          )}
        </VoiceDraftNavigation>
      </VoiceDraftProvider>
    </AppShellContent>
  )
}

const TABS = [
  { label: 'Voz', to: '/voice', Icon: MicIcon },
  { label: 'Notas', to: '/notes', Icon: NoteIcon },
  { label: 'Referencia', to: '/reference', Icon: BookmarkIcon },
  { label: 'Historial', to: '/history', Icon: HistoryIcon },
  { label: 'Datos', to: '/data', Icon: DatabaseIcon },
] as const

/** Pestaña de la barra: texto en ancho; icono con nombre accesible y tooltip en angosto. Sigue siendo un `Link`. */
function NavTab({ label, to, Icon }: (typeof TABS)[number]) {
  const { pathname } = useLocation()
  const narrow = useIsNarrow()
  // `end: false` cubre las rutas con fecha: /notes/:date y /history/:date.
  const active = matchPath({ path: to, end: false }, pathname) != null

  const link = (
    <Link
      component={RouterLink}
      to={to}
      underline="none"
      color="inherit"
      aria-current={active ? 'page' : undefined}
      aria-label={narrow ? label : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        px: narrow ? 0.75 : 1,
        py: 0.5,
        borderRadius: '6px',
        fontSize: '0.9375rem',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        '&:hover': { color: AMBER },
        '&[aria-current="page"]': { color: AMBER, bgcolor: alpha(AMBER, 0.16) },
        '&:focus-visible': { outline: `2px solid ${AMBER}`, outlineOffset: 2 },
      }}
    >
      {narrow ? <Icon /> : label}
    </Link>
  )

  return narrow ? <Tooltip title={label}>{link}</Tooltip> : link
}

function AppShellContent({
  navigationRoot,
  children,
}: {
  navigationRoot: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const { status } = useSession()
  const narrow = useIsNarrow()

  return (
    <Box ref={navigationRoot} sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        {/* Una sola fila de 48 px como máximo, sin salto de línea en 375 px ni en 1280 px. */}
        <Toolbar
          variant="dense"
          disableGutters
          sx={{
            gap: narrow ? 0.5 : 1.5,
            flexWrap: 'nowrap',
            minHeight: 48,
            maxHeight: 48,
            px: narrow ? 1 : 2,
          }}
        >
          {narrow ? null : (
            <Link
              component={RouterLink}
              to="/notes"
              color="inherit"
              underline="none"
              variant="h6"
              sx={{ fontWeight: 600, flexShrink: 0 }}
            >
              {projectIdentity.name}
            </Link>
          )}
          <Stack
            component="nav"
            aria-label="Navegación principal"
            direction="row"
            spacing={narrow ? 0.25 : 0.5}
            sx={{ flexWrap: 'nowrap', alignItems: 'center', minWidth: 0 }}
          >
            {TABS.map((tab) => (
              <NavTab key={tab.to} {...tab} />
            ))}
          </Stack>
          <Box sx={{ flexGrow: 1, minWidth: 0 }} />
          <ServerStatus />
          <SessionControls />
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 1, sm: 1.5 } }}>
        <Stack spacing={1}>
          <SessionAlerts />
          {status === 'loading' ? (
            <Stack direction="row" spacing={1.5} role="status" sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} aria-hidden />
              <Typography>Verificando sesión…</Typography>
            </Stack>
          ) : (
            children
          )}
        </Stack>
      </Container>
    </Box>
  )
}
