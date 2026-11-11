import { useState, useCallback, useMemo } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Pagination from '@mui/material/Pagination'
import Typography from '@mui/material/Typography'
import type { VoiceNoteListItem } from './api'
import { useVoiceNote, useVoiceNotes } from './useVoiceNotes'

const DEFAULT_PAGE_SIZE = 20
const EXCERPT_CODE_POINTS = 120

/**
 * Formatea la fecha/hora de creación en español local.
 * Ej: "9 nov 2026, 17:30"
 */
function formatCreatedAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface VoiceLibraryProps {
  /** Se invoca al seleccionar una nota de la lista. */
  onSelect: (item: VoiceNoteListItem) => void
  /** ID de la nota actualmente seleccionada (para resaltar). */
  selectedId: string | null
  /** Deshabilita la selección (p. ej. con un guardado o borrado en vuelo). */
  disabled?: boolean
}

/**
 * Lista paginada de notas de voz propias.
 *
 * S-105: 20 por página, fecha/hora local, excerpt escapado, orden fijo createdAt DESC.
 * Estados: cargando, vacío, error, lista con paginación.
 */
export function VoiceLibrary({ onSelect, selectedId, disabled = false }: VoiceLibraryProps) {
  const [page, setPage] = useState(0)

  const { data, isLoading, isError, error } = useVoiceNotes({
    page,
    size: DEFAULT_PAGE_SIZE,
  })

  const items: VoiceNoteListItem[] = useMemo(() => data?.content ?? [], [data])
  const totalPages = data?.totalPages ?? 0
  // S-105 §8: si se vacía una página posterior (p. ej. tras borrar su última nota), retroceder.
  const pageEmptied = page > 0 && data != null && data.content.length === 0
  // Ajuste de estado durante el render (patrón de React para estado derivado de props/datos).
  if (pageEmptied) setPage(Math.max(0, Math.min(page - 1, totalPages - 1)))

  const handleSelect = useCallback(
    (item: VoiceNoteListItem) => {
      onSelect(item)
    },
    [onSelect],
  )

  const handlePageChange = useCallback((_e: React.ChangeEvent<unknown>, value: number) => {
    setPage(value - 1) // Pagination es 1-based
  }, [])

  if (isLoading || pageEmptied) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label="Cargando notas" />
      </Box>
    )
  }

  if (isError) {
    return (
      <AlertBox
        title="No se pudo cargar la lista"
        description={error instanceof Error ? error.message : 'Error desconocido.'}
      />
    )
  }

  if (items.length === 0) {
    return <EmptyState />
  }

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <List dense disablePadding>
        {items.map((item) => (
          <ListItem key={item.id} disablePadding divider>
            <ListItemButton
              selected={item.id === selectedId}
              disabled={disabled}
              onClick={() => handleSelect(item)}
              sx={{
                py: 1.5,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  '&:hover': { bgcolor: 'action.selectedHover' },
                },
              }}
            >
              <ListItemText
                disableTypography
                sx={{ minWidth: 0 }}
                primary={
                  <Typography component="span" variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    {formatCreatedAt(item.createdAt)}
                  </Typography>
                }
                secondary={<VoiceExcerpt key={item.revision} item={item} />}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page + 1} // Pagination es 1-based
            onChange={handlePageChange}
            size="small"
            color="primary"
          />
        </Box>
      )}
    </Box>
  )
}

function VoiceExcerpt({ item }: { item: VoiceNoteListItem }) {
  // El servidor cuenta puntos de código. En el límite, solo el detalle confirma el texto completo.
  const mayBeTruncated = [...item.excerpt].length >= EXCERPT_CODE_POINTS
  const { data: detail } = useVoiceNote(mayBeTruncated ? item.id : '', item.revision)
  const fullText = detail?.revision === item.revision ? detail.text : undefined

  return (
    <Typography
      component="span"
      title={mayBeTruncated ? fullText : item.excerpt}
      sx={{
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        color: 'text.secondary',
      }}
    >
      {item.excerpt}
    </Typography>
  )
}

function AlertBox({ title, description }: { title: string; description: string }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography color="error" variant="body2">
        {title}
      </Typography>
      <Typography color="text.secondary" variant="caption">
        {description}
      </Typography>
    </Box>
  )
}

function EmptyState() {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography color="text.secondary" variant="body2">
        No hay notas de voz todavía.
      </Typography>
      <Typography color="text.secondary" variant="caption" sx={{ mt: 1 }}>
        Grabá o escribí una nota para comenzar.
      </Typography>
    </Box>
  )
}
