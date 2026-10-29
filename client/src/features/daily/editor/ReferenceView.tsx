import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useReferenceItem } from '../../reference/useReferenceItems'
import { useSession } from '../../auth/sessionContext'

/**
 * Vista React del átomo reference.
 * Muestra @Título mientras carga, Cargando referencia durante consulta,
 * Referencia no disponible ante 404, y No se pudo cargar ante error.
 */
export function ReferenceView({ node, editor }: ReactNodeViewProps<HTMLElement>) {
  const id = (node.attrs as { id: string }).id
  const { user } = useSession()
  const ownerId = user?.id ?? ''

  const { data, isLoading, isError, isFetching } = useReferenceItem(ownerId, id)

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
        component="span"
        className="reference-atom"
        sx={{
          color: unavailable ? 'text.secondary' : 'primary.main',
          cursor: editor.isEditable ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          whiteSpace: 'nowrap',
        }}
        data-reference-id={id}
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
    </NodeViewWrapper>
  )
}
