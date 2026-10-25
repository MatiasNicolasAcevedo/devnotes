import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { useSession } from '../../features/auth/sessionContext'
import { DailyEditor } from '../../features/daily/editor/DailyEditor'
import { useDailyVersionListQuery, useDailyVersionDetailQuery } from './useDailyVersionQuery'

/** Formatea una fecha ISO YYYY-MM-DD como dd/MM/yyyy (local). */
function formatDateLocal(isoDate: string): string {
  const parts = isoDate.split('-')
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  return `${day}/${month}/${year}`
}

/** Formata un timestamp ISO como dd/MM/yyyy HH:mm (local). */
function formatSavedAt(isoString: string): string {
  try {
    const d = new Date(isoString)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return isoString
  }
}

// ——— Fallbacks sin sesión ———

function HistoryLoginRequired() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Historial de versiones
      </Typography>
      <Alert severity="info">Inicia sesión para acceder a tu historial.</Alert>
    </Stack>
  )
}

// ——— Vista de detalle readonly ———

function HistoryDetailInner({ date, owner, sessionIsCurrent }: { date: string; owner: string; sessionIsCurrent?: () => boolean }) {
  const query = useDailyVersionDetailQuery(owner, date, sessionIsCurrent)

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" component="h1">
          Versión del {formatDateLocal(date)}
        </Typography>
        <Link component={RouterLink} to="/history">
          Volver al historial
        </Link>
      </Stack>

      {query.isLoading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} aria-hidden />
          <Typography>Cargando versión…</Typography>
        </Stack>
      ) : query.isError ? (
        <Alert severity="error" role="alert">
          <AlertTitle>Error al cargar la versión</AlertTitle>
          No se pudo obtener la versión guardada.{' '}
          <Link component="button" onClick={() => query.refetch()}>
            Reintentar
          </Link>
        </Alert>
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Guardada: {formatSavedAt(query.data!.savedAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revisión: {query.data!.sourceRevision}
            </Typography>
          </Stack>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <DailyEditor
              initialContent={query.data!.content}
              readOnly={true}
              aria-label="Versión de solo lectura"
            />
          </Paper>
          <Box>
            <Link component={RouterLink} to={`/notes/${date}`}>
              Volver a mi nota del {formatDateLocal(date)}
            </Link>
          </Box>
        </>
      )}
    </Stack>
  )
}

// ——— Vista de lista paginada ———

function HistoryListInner({ owner, sessionIsCurrent }: { owner: string; sessionIsCurrent?: () => boolean }) {
  const [listPage, setListPage] = useState(0)

  const query = useDailyVersionListQuery(owner, listPage, sessionIsCurrent)

  return (
    <Stack spacing={3}>
      <Typography variant="h5" component="h1">
        Historial de versiones
      </Typography>

      {query.isLoading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} aria-hidden />
          <Typography>Cargando historial…</Typography>
        </Stack>
      ) : query.isError ? (
        <Alert severity="error" role="alert">
          <AlertTitle>Error al cargar el historial</AlertTitle>
          No se pudieron obtener las versiones guardadas.{' '}
          <Link component="button" onClick={() => query.refetch()}>
            Reintentar
          </Link>
        </Alert>
      ) : query.data!.content.length === 0 ? (
        <Alert severity="info">
          Aún no tenés versiones guardadas. Guardá una versión desde tu nota para verla aquí.
        </Alert>
      ) : (
        <>
          <List dense>
            {query.data!.content.map((item) => (
              <ListItem key={item.date} disablePadding>
                <ListItemButton component={RouterLink} to={`/history/${item.date}`}>
                  <ListItemText
                    primary={formatDateLocal(item.date)}
                    secondary={`Guardada: ${formatSavedAt(item.savedAt)} · Revisión ${item.sourceRevision}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {/* Paginación simple */}
          {query.data!.totalPages > 1 && (
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
              {listPage > 0 && (
                <Button size="small" onClick={() => setListPage(listPage - 1)}>
                  Anterior
                </Button>
              )}
              <Typography variant="caption">
                Página {listPage + 1} de {query.data!.totalPages}
              </Typography>
              {listPage < query.data!.totalPages - 1 && (
                <Button size="small" onClick={() => setListPage(listPage + 1)}>
                  Siguiente
                </Button>
              )}
            </Stack>
          )}
        </>
      )}
    </Stack>
  )
}

// ——— Página principal ———

export function DailyHistoryPage() {
  const { date: paramDate } = useParams<{ date?: string }>()
  const { user } = useSession()

  // Sin sesión: login required
  if (!user) {
    return <HistoryLoginRequired />
  }

  // Si hay fecha en la URL, mostrar detalle; si no, lista
  if (paramDate) {
    return <HistoryDetailInner date={paramDate} owner={user.id} sessionIsCurrent={() => true} />
  }

  return <HistoryListInner owner={user.id} sessionIsCurrent={() => true} />
}
