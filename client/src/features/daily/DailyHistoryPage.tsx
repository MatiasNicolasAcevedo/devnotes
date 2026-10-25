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
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { useSession } from '../../features/auth/sessionContext'
import { DailyEditor } from '../../features/daily/editor/DailyEditor'
import { listDailyVersions, getDailyVersion, type DailyVersionListItem, type DailyVersionDetail } from './versionApi'

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

function HistoryDetailInner({ date }: { date: string }) {
  const [detail, setDetail] = useState<DailyVersionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Cargar detalle al montar (llamada directa para evitar setState síncrono en efecto)
  useEffect(() => {
    let cancelled = false
    getDailyVersion(date)
      .then((result) => {
        if (!cancelled) {
          setDetail(result)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Error al cargar la versión'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date])

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

      {loading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} aria-hidden />
          <Typography>Cargando versión…</Typography>
        </Stack>
      ) : error ? (
        <Alert severity="error" role="alert">
          <AlertTitle>Error al cargar la versión</AlertTitle>
          No se pudo obtener la versión guardada.{' '}
          <Link component="button" onClick={() => window.location.reload()}>
            Reintentar
          </Link>
        </Alert>
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Guardada: {formatSavedAt(detail!.savedAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revisión: {detail!.sourceRevision}
            </Typography>
          </Stack>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <DailyEditor
              initialContent={detail!.content}
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

function HistoryListInner() {
  const [versionsList, setVersionsList] = useState<DailyVersionListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<Error | null>(null)
  const [listPage, setListPage] = useState(0)
  const [listTotalPages, setListTotalPages] = useState(1)

  const loadList = useCallback(async (page: number) => {
    setListError(null)
    try {
      const result = await listDailyVersions(page)
      setVersionsList(result.content)
      setListTotalPages(result.totalPages)
      setListPage(result.page)
    } catch (err) {
      setListError(err instanceof Error ? err : new Error('Error al cargar el historial'))
    } finally {
      setListLoading(false)
    }
  }, [])

  // Cargar lista al montar
  useEffect(() => {
    listDailyVersions(0)
      .then((result) => {
        setVersionsList(result.content)
        setListTotalPages(result.totalPages)
        setListPage(result.page)
        setListError(null)
      })
      .catch((err) => {
        setListError(err instanceof Error ? err : new Error('Error al cargar el historial'))
      })
      .finally(() => {
        setListLoading(false)
      })
  }, [])

  return (
    <Stack spacing={3}>
      <Typography variant="h5" component="h1">
        Historial de versiones
      </Typography>

      {listLoading ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} aria-hidden />
          <Typography>Cargando historial…</Typography>
        </Stack>
      ) : listError ? (
        <Alert severity="error" role="alert">
          <AlertTitle>Error al cargar el historial</AlertTitle>
          No se pudieron obtener las versiones guardadas.{' '}
          <Link component="button" onClick={() => loadList(listPage)}>
            Reintentar
          </Link>
        </Alert>
      ) : versionsList.length === 0 ? (
        <Alert severity="info">
          Aún no tenés versiones guardadas. Guardá una versión desde tu nota para verla aquí.
        </Alert>
      ) : (
        <>
          <List dense>
            {versionsList.map((item) => (
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
          {listTotalPages > 1 && (
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
              {listPage > 0 && (
                <Button size="small" onClick={() => loadList(listPage - 1)}>
                  Anterior
                </Button>
              )}
              <Typography variant="caption">
                Página {listPage + 1} de {listTotalPages}
              </Typography>
              {listPage < listTotalPages - 1 && (
                <Button size="small" onClick={() => loadList(listPage + 1)}>
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
    return <HistoryDetailInner date={paramDate} />
  }

  return <HistoryListInner />
}
