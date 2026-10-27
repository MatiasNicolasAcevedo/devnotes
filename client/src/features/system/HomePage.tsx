import projectIdentity from '../../project-identity.json'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'
import { SystemInfoPanel } from './SystemInfoPanel'

export function HomePage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1">
          Bienvenido a {projectIdentity.name}
        </Typography>
        <Typography color="text.secondary">
          Base para tu próxima aplicación, con identidad, sesión y una API de referencia.
        </Typography>
      </Stack>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6" component="h2">
              Estado del servidor
            </Typography>
            <SystemInfoPanel />
          </Stack>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6" component="h2">
              Notas diarias
            </Typography>
            <Typography>Editá y recuperá una nota privada por día.</Typography>
            <Link component={RouterLink} to="/notes">
              Ir a Notas
            </Link>
          </Stack>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6" component="h2">
              Historial de versiones
            </Typography>
            <Typography>Consultá las copias de seguridad de tus notas.</Typography>
            <Link component={RouterLink} to="/history">
              Ir al Historial
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
