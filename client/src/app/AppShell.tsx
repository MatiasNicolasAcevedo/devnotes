import projectIdentity from '../project-identity.json'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Fragment } from 'react'
import { Link as RouterLink } from 'react-router'
import { SessionAlerts } from '../features/auth/SessionAlerts'
import { SessionControls } from '../features/auth/SessionControls'
import { useSession } from '../features/auth/sessionContext'
import { DailyDraftWorkspace } from '../features/daily/DailyDraftNavigation'
import type { ReactNode } from 'react'

/**
 * Estructura común: barra superior con la sesión y contenido. Las rutas se remontan al cambiar la identidad, así que
 * el estado local de una pantalla nunca pasa de un usuario a otro.
 */
export function AppShell() {
  const { user } = useSession()
  return (
    <DailyDraftWorkspace owner={user?.id ?? ''}>
      {(outlet) => <AppShellContent outlet={outlet} />}
    </DailyDraftWorkspace>
  )
}

function AppShellContent({ outlet }: { outlet: ReactNode }) {
  const { status, user } = useSession()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
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
          <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <SessionControls />
          </Box>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Stack component="nav" aria-label="Navegación principal" direction="row" spacing={2}>
            <Link component={RouterLink} to="/">
              Inicio
            </Link>
            <Link component={RouterLink} to="/notes">
              Notas
            </Link>
            <Link component={RouterLink} to="/history">
              Historial
            </Link>
            <Link component={RouterLink} to="/reference">
              Referencia
            </Link>
          </Stack>
          <SessionAlerts />
          {status === 'loading' ? (
            <Stack direction="row" spacing={1.5} role="status" sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} aria-hidden />
              <Typography>Verificando sesión…</Typography>
            </Stack>
          ) : (
            <Fragment key={user?.id ?? 'visitor'}>{outlet}</Fragment>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
