import { useCallback, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Button from '@mui/material/Button'
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
 * Si hay cambios sin guardar, pide resolver antes de cambiar.
 */
export function VoicePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null)
  const [showDirtyDialog, setShowDirtyDialog] = useState(false)
  const composerRef = useRef<{ isDirty: boolean; save: () => void; reset: () => void } | null>(null)

  // Cargar detalle de la nota seleccionada
  const { data: selectedDetail } = useVoiceNote(selectedId ?? '')

  const handleSelect = useCallback(
    (item: VoiceNoteListItem) => {
      if (item.id === selectedId) return

      // B-2: verificar si hay cambios sin guardar antes de cambiar
      const isDirty = composerRef.current?.isDirty ?? false
      if (isDirty) {
        setPendingSelectId(item.id)
        setShowDirtyDialog(true)
        return
      }
      setSelectedId(item.id)
    },
    [selectedId],
  )

  const handleDirtySaveAndContinue = useCallback(() => {
    setShowDirtyDialog(false)
    composerRef.current?.save()
    // Esperar a que el guardado complete y el estado vuelva a clean
    // antes de cambiar la selección (se hace en un efecto del composer)
  }, [])

  const handleDirtyDiscardAndContinue = useCallback(() => {
    setShowDirtyDialog(false)
    composerRef.current?.reset()
    if (pendingSelectId != null) {
      setSelectedId(pendingSelectId)
      setPendingSelectId(null)
    }
  }, [pendingSelectId])

  const handleDirtyCancel = useCallback(() => {
    setShowDirtyDialog(false)
    setPendingSelectId(null)
  }, [])

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
          <VoiceComposer
            ref={
              composerRef as React.RefObject<{
                isDirty: boolean
                save: () => void
                reset: () => void
              }>
            }
            selectedDetail={selectedDetail}
          />
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

      {/* Diálogo de dirty al cambiar de nota */}
      <Dialog open={showDirtyDialog} onClose={handleDirtyCancel}>
        <DialogTitle>Cambios sin guardar</DialogTitle>
        <DialogContent>
          <DialogContentText>Tenés cambios sin guardar. ¿Qué querés hacer?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDirtyCancel}>Cancelar</Button>
          <Button onClick={handleDirtySaveAndContinue}>Guardar y continuar</Button>
          <Button onClick={handleDirtyDiscardAndContinue}>Descartar y continuar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
