import { useCallback, useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import type { VoiceNoteListItem } from './api'
import { useVoiceNote } from './useVoiceNotes'
import { VoiceComposer } from './VoiceComposer'
import { VoiceLibrary } from './VoiceLibrary'

/**
 * Pantalla de voz: ruta /voice.
 *
 * S-105: una columna a375 px; lista/editor adyacentes si caben a1280 px.
 * VoiceLibrary (lista paginada) + VoiceComposer (editor con captura).
 * Al seleccionar una nota, se carga el detalle y se muestra en el composer.
 */
export function VoicePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Cargar detalle de la nota seleccionada
  const { data: selectedDetail } = useVoiceNote(selectedId ?? '')

  const handleSelect = useCallback(
    (item: VoiceNoteListItem) => {
      if (item.id === selectedId) return
      setSelectedId(item.id)
    },
    [selectedId],
  )

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 2 } }}>
      <Typography component="h1" variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Notas de voz
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, lg: 3 },
          width: '100%',
        }}
      >
        {/* Editor — arriba en mobile, derecha en desktop */}
        <Box
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', lg: 600 },
            order: { xs: 1, lg: 1 },
            flex: { lg: '0 0 auto' },
          }}
        >
          <VoiceComposer selectedDetail={selectedDetail} />
        </Box>

        {/* Lista de notas — abajo en mobile, izquierda en desktop */}
        <Box
          sx={{
            width: '100%',
            order: { xs: 2, lg: 0 },
            flex: { lg: 1 },
            '& .MuiList-root': {
              maxHeight: { lg: 'calc(100vh - 200px)' },
              overflow: 'auto',
            },
          }}
        >
          <VoiceLibrary onSelect={handleSelect} selectedId={selectedId} />
        </Box>
      </Box>
    </Container>
  )
}
