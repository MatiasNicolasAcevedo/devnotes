import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useRef } from 'react'
import { useReferenceItem } from '../../reference/useReferenceItems'
import { useSpaceScope } from '../../spaces/spaceContext'
import { useReferencePreview } from './ReferencePreview'

/**
 * Vista React del átomo reference.
 * Muestra @Título vigente con vista previa accesible (hover, teclado, tacto).
 * Cargando referencia durante consulta, Referencia no disponible ante 404,
 * y No se pudo cargar ante error de red con reintento.
 */
export function ReferenceView({ node }: ReactNodeViewProps<HTMLElement>) {
  const id = (node.attrs as { id: string }).id
  // `@` se resuelve solo en el espacio de la nota: un ID de otro espacio queda «no disponible».
  const { owner: ownerId, space } = useSpaceScope()

  const { data, isLoading, isError, isFetching } = useReferenceItem(ownerId, space, id)

  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const { anchorProps, preview } = useReferencePreview(id, anchorRef)

  const displayText =
    isLoading || isFetching
      ? 'Cargando referencia'
      : isError
        ? 'Referencia no disponible'
        : data
          ? `@${data.title}`
          : 'Cargando referencia'

  const unavailable = isError || !data
  const loading = isLoading || isFetching

  return (
    <NodeViewWrapper as="span">
      <Box
        ref={anchorRef as React.RefObject<HTMLSpanElement>}
        component="span"
        className="reference-atom"
        sx={{
          color: unavailable ? 'text.secondary' : 'primary.main',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          whiteSpace: 'nowrap',
          textDecoration: 'underline',
          textUnderlineOffset: 2,
        }}
        data-reference-id={id}
        tabIndex={0}
        role="button"
        aria-label={`Ver vista previa de ${data?.title ?? 'referencia'}`}
        {...anchorProps}
      >
        {loading ? (
          <>
            <CircularProgress size={14} />
            <Typography variant="body2" color="text.secondary">
              Cargando referencia
            </Typography>
          </>
        ) : (
          <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
            {displayText}
          </Typography>
        )}
      </Box>
      <NodeViewContent />
      {preview}
    </NodeViewWrapper>
  )
}
