import projectIdentity from '../project-identity.json'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useRef, type ReactNode, type RefObject } from 'react'
import { Link as RouterLink, matchPath, useLocation } from 'react-router'
import { SessionAlerts } from '../features/auth/SessionAlerts'
import { SessionControls } from '../features/auth/SessionControls'
import { useSession } from '../features/auth/sessionContext'
import { DailyDraftWorkspace } from '../features/daily/DailyDraftNavigation'
import { VoiceDraftNavigation } from '../features/voice/VoiceDraftNavigation'
import { VoiceDraftProvider } from '../features/voice/VoiceDraftProvider'

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

function AppShellContent({
  navigationRoot,
  children,
}: {
  navigationRoot: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const { status } = useSession()

  return (
    <Box ref={navigationRoot} sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1, minHeight: { sm: 56 } }}>
          <Link
            component={RouterLink}
            to="/"
            color="inherit"
            underline="none"
            variant="h6"
            sx={{ fontWeight: 600, flexShrink: 0 }}
          >
            {projectIdentity.name}
          </Link>
          <Stack
            component="nav"
            aria-label="Navegación principal"
            direction="row"
            spacing={2}
            sx={{ flexWrap: 'wrap' }}
          >
            <Link component={RouterLink} to="/" color="inherit">
              Inicio
            </Link>
            <Link component={RouterLink} to="/notes" color="inherit">
              Notas
            </Link>
            <Link component={RouterLink} to="/history" color="inherit">
              Historial
            </Link>
            <Link component={RouterLink} to="/reference" color="inherit">
              Referencia
            </Link>
            <Link component={RouterLink} to="/voice" color="inherit">
              Voz
            </Link>
          </Stack>
          <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <SessionControls />
          </Box>
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
