import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import { searchReferenceItems, type ReferenceItem } from '../../reference/api'
import { ApiError } from '../../../services/http'

interface ReferencePickerProps {
  /** Posición del @ en el editor (desde el inicio del paragraph). */
  anchorPosition: { from: number; to: number }
  /** Texto después del @ (consulta). */
  query: string
  /** Seleccionar una referencia inserta el átomo y cierra el picker. */
  onSelect: (item: ReferenceItem) => void
  /** Cerrar sin seleccionar (conservar @ como texto). */
  onClose: () => void
}

const ITEM_HEIGHT = 48
const MAX_QUERY_LENGTH = 120
const DEBOUNCE_MS = 250
const PAGE_SIZE = 20

/**
 * Muestra resultados de búsqueda de referencias tras @.
 * Soporta teclado (flechas, Enter, Escape) y mouse/táctil.
 */
export function ReferencePicker({ query, onSelect, onClose }: ReferencePickerProps) {
  const [items, setItems] = useState<ReferenceItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [page, setPage] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const queryRef = useRef(query)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const executeSearch = useCallback(async (searchQuery: string, searchPage: number) => {
    if (!mountedRef.current) return
    const trimmed = searchQuery.trim()

    // Cancelar búsqueda anterior
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!trimmed) {
      setItems([])
      setHasMore(false)
      setError(null)
      return
    }

    if (trimmed.length > MAX_QUERY_LENGTH) {
      setError('La consulta es demasiado larga (máximo 120 caracteres).')
      setItems([])
      setHasMore(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await searchReferenceItems(trimmed, searchPage, PAGE_SIZE, {
        signal: controller.signal,
        sessionIsCurrent: () => true,
      })
      if (!mountedRef.current || controller.signal.aborted) return
      // Solo actualizar si la consulta no cambió
      if (queryRef.current === searchQuery) {
        setItems(searchPage === 0 ? result.content : (prev) => [...prev, ...result.content])
        setHasMore(result.page < result.totalPages - 1)
      }
    } catch (err: unknown) {
      if (!mountedRef.current || controller.signal.aborted) return
      if (err instanceof ApiError && err.status === 400) {
        setError('Consulta inválida.')
      } else {
        setError('No se pudo buscar. Volvé a intentarlo.')
      }
      setItems([])
      setHasMore(false)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queryRef.current = query
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      setPage((p) => (queryRef.current === query ? 0 : p))
      executeSearch(query, 0)
    }, DEBOUNCE_MS)
  }, [query, executeSearch])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    executeSearch(query, nextPage)
  }, [page, query, executeSearch])

  const handleSelect = useCallback(
    (item: ReferenceItem) => {
      if (abortRef.current) abortRef.current.abort()
      onSelect(item)
    },
    [onSelect],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (items[selectedIndex]) handleSelect(items[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [items, selectedIndex, handleSelect, onClose],
  )

  return (
    <Paper
      elevation={2}
      data-reference-picker
      sx={{
        position: 'absolute',
        zIndex: 2000,
        width: 300,
        maxHeight: ITEM_HEIGHT * 5 + 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}
    >
      {isLoading && items.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Buscando...
          </Typography>
        </Box>
      ) : error ? (
        <Box sx={{ p: 1.5 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
          <Button size="small" onClick={() => executeSearch(query, 0)} sx={{ mt: 0.5 }}>
            Reintentar
          </Button>
        </Box>
      ) : items.length === 0 && !isLoading ? (
        <Box sx={{ p: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Sin resultados
          </Typography>
        </Box>
      ) : (
        <>
          {items.map((item, index) => (
            <ListItemButton
              key={item.id}
              selected={index === selectedIndex}
              onClick={() => handleSelect(item)}
              onKeyDown={handleKeyDown}
              sx={{ pl: 2, pr: 1, height: ITEM_HEIGHT }}
            >
              <ListItemText
                primary={item.title}
                secondary={item.description || '(Sin descripción)'}
              />
            </ListItemButton>
          ))}
          {hasMore && !isLoading && (
            <Box sx={{ p: 0.5 }}>
              <Button size="small" fullWidth onClick={loadMore}>
                Más resultados
              </Button>
            </Box>
          )}
        </>
      )}
    </Paper>
  )
}
