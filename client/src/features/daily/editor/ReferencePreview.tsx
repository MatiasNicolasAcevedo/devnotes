import SvgIcon from '@mui/material/SvgIcon'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Paper, Popper, Typography } from '@mui/material'
import { useReferenceItem } from '../../reference/useReferenceItems'
import { useSpaceScope } from '../../spaces/spaceContext'

/** Icono X para cerrar, usando SvgIcon nativo (sin @mui/icons-material). */
const CloseSvg = (
  <SvgIcon fontSize="small" aria-hidden="true">
    <path d="M19 6.41l-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59 5.59-5.59Z" />
  </SvgIcon>
)

export interface ReferencePreviewHandle {
  /** Props que el anchor debe aplicar para activar la vista previa. */
  anchorProps: {
    onMouseEnter: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
  }
}

interface ReferencePreviewInnerProps {
  /** UUID de la referencia a previsualizar. */
  id: string
  /** Elemento disparador (átomo de referencia). */
  anchorRef: React.RefObject<HTMLElement | null>
  /** Callback para recibir los anchorProps. */
  onAnchorProps: (props: ReferencePreviewHandle['anchorProps']) => void
}

/**
 * Vista previa accesible de una referencia.
 *
 * Se activa con hover (mouse), foco + Enter/Espacio (teclado), y toque (táctil).
 * Se cierra con Escape, botón Cerrar, o clic fuera. Al cerrar con teclado,
 * el foco vuelve al disparador. No se cierra al mover el foco al contenido.
 * Descripción vacía se indica explícitamente.
 */
// eslint-disable-next-line react-refresh/only-export-components -- componente interno, no se usa directamente
function ReferencePreviewInner({ id, anchorRef, onAnchorProps }: ReferencePreviewInnerProps) {
  // `@` se resuelve solo en el espacio de la nota: un ID de otro espacio queda «no disponible».
  const { owner: ownerId, space } = useSpaceScope()

  const { data, isLoading, isError, isFetching, refetch } = useReferenceItem(ownerId, space, id)

  const [open, setOpen] = useState(false)
  const [triggerMethod, setTriggerMethod] = useState<'hover' | 'keyboard' | 'touch'>('hover')
  const popperRef = useRef<HTMLDivElement | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unavailable = isError || !data
  const loading = isLoading || isFetching

  const handleClose = useCallback(() => {
    setOpen(false)
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const handleOpen = useCallback((method: 'hover' | 'keyboard' | 'touch') => {
    setTriggerMethod(method)
    setOpen(true)
  }, [])

  // Hover: abrir con pequeño delay para permitir mover puntero al contenido
  const handleAnchorMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      handleOpen('hover')
    }, 300)
  }, [handleOpen])

  const handlePopperMouseLeave = useCallback(() => {
    if (triggerMethod === 'hover') {
      handleClose()
    }
  }, [triggerMethod, handleClose])

  // Teclado: Enter/Espacio abren
  const handleAnchorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (open) {
          handleClose()
        } else {
          handleOpen('keyboard')
        }
      }
    },
    [open, handleOpen, handleClose],
  )

  // Táctil: toque abre
  const handleAnchorTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handleOpen('touch')
    },
    [handleOpen],
  )

  const anchorProps: ReferencePreviewHandle['anchorProps'] = useMemo(
    () => ({
      onMouseEnter: handleAnchorMouseEnter,
      onKeyDown: handleAnchorKeyDown,
      onTouchStart: handleAnchorTouchStart,
    }),
    [handleAnchorMouseEnter, handleAnchorKeyDown, handleAnchorTouchStart],
  )

  // Notificar al padre los anchorProps
  useEffect(() => {
    onAnchorProps(anchorProps)
  }, [anchorProps, onAnchorProps])

  // Escape cierra y devuelve foco al disparador
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        if (anchorRef.current) {
          anchorRef.current.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose, anchorRef])

  // Clic fuera cierra
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      const anchor = anchorRef.current
      const popper = popperRef.current
      if (
        anchor &&
        popper &&
        !anchor.contains(e.target as Node) &&
        !popper.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClose, anchorRef])

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  return (
    <Popper
      open={open}
      // eslint-disable-next-line react-hooks/refs -- Popper requiere anchorEl en cada render
      anchorEl={anchorRef.current}
      placement="bottom-start"
      modifiers={[
        {
          name: 'offset',
          options: { offset: [0, 4] },
        },
      ]}
      onMouseLeave={handlePopperMouseLeave}
    >
      <Paper
        ref={popperRef}
        elevation={3}
        sx={{
          width: 280,
          maxWidth: '100%',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" component="div" sx={{ flex: 1, pr: 1 }}>
            {data?.title ?? 'Referencia'}
          </Typography>
          <Button
            size="small"
            onClick={handleClose}
            sx={{ p: 0.5, flexShrink: 0 }}
            aria-label="Cerrar vista previa"
          >
            {CloseSvg}
          </Button>
        </Box>

        {loading && !data ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Cargando referencia
            </Typography>
          </Box>
        ) : unavailable ? (
          <Typography variant="body2" color="text.secondary">
            Referencia no disponible
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {data?.description || '(Sin descripción)'}
          </Typography>
        )}

        {isError && !loading && (
          <Button size="small" onClick={() => refetch()} sx={{ alignSelf: 'flex-start' }}>
            Reintentar
          </Button>
        )}
      </Paper>
    </Popper>
  )
}

/**
 * Hook que devuelve los anchorProps y el JSX del preview.
 * Permite a ReferenceView aplicar los handlers al átomo y renderizar el popper.
 */
export function useReferencePreview(
  id: string,
  anchorRef: React.RefObject<HTMLElement | null>,
): { anchorProps: ReferencePreviewHandle['anchorProps']; preview: React.ReactElement } {
  const [anchorProps, setAnchorProps] = useState<ReferencePreviewHandle['anchorProps']>({
    onMouseEnter: () => {},
    onKeyDown: () => {},
    onTouchStart: () => {},
  })

  const preview = (
    <ReferencePreviewInner id={id} anchorRef={anchorRef} onAnchorProps={setAnchorProps} />
  )

  return { anchorProps, preview }
}
