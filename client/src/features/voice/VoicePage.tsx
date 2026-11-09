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
import { VoiceComposer, type VoiceComposerHandle } from './VoiceComposer'
import { VoiceLibrary } from './VoiceLibrary'

/** Destino pendiente mientras se resuelve el diálogo de cambios sin guardar. */
type PendingTarget = { kind: 'note'; id: string } | { kind: 'new' }

/**
 * Pantalla de voz: ruta /voice.
 *
 * S-105: una columna a375 px; lista/editor adyacentes si caben a1280 px.
 * VoiceLibrary (lista paginada) + VoiceComposer (editor con captura).
 * Al seleccionar una nota (o pulsar Nueva nota) con cambios sin guardar, pide resolver antes:
 * «Guardar y continuar» solo continúa tras el ACK del servidor; 409/error se quedan en la nota actual.
 */
export function VoicePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingTarget | null>(null)
  const [savingBeforeContinue, setSavingBeforeContinue] = useState(false)
  // Guardado/borrado en vuelo en el composer: no se cambia de documento hasta su respuesta.
  const [composerBusy, setComposerBusy] = useState(false)
  const composerRef = useRef<VoiceComposerHandle>(null)

  // Cargar detalle de la nota seleccionada
  const { data: selectedDetail } = useVoiceNote(selectedId ?? '')

  const goTo = useCallback((target: PendingTarget) => {
    if (target.kind === 'note') {
      setSelectedId(target.id)
    } else {
      composerRef.current?.reset()
      setSelectedId(null)
    }
  }, [])

  const request = useCallback(
    (target: PendingTarget) => {
      if (composerRef.current?.isBusy) return
      if (composerRef.current?.isDirty) {
        setPending(target)
        return
      }
      goTo(target)
    },
    [goTo],
  )

  const handleSelect = useCallback(
    (item: VoiceNoteListItem) => {
      if (item.id === selectedId) return
      request({ kind: 'note', id: item.id })
    },
    [request, selectedId],
  )

  const handleNewNote = useCallback(() => request({ kind: 'new' }), [request])

  const handleDirtySaveAndContinue = useCallback(async () => {
    const target = pending
    const composer = composerRef.current
    if (target == null || composer == null) return
    setSavingBeforeContinue(true)
    const outcome = await composer.save()
    setSavingBeforeContinue(false)
    setPending(null)
    // Solo con ACK se cambia de nota; 409 abre el conflicto y un error se muestra en el composer.
    if (outcome === 'saved') goTo(target)
  }, [goTo, pending])

  const handleDirtyDiscardAndContinue = useCallback(() => {
    const target = pending
    setPending(null)
    if (target == null) return
    composerRef.current?.reset()
    goTo(target)
  }, [goTo, pending])

  const handleDirtyCancel = useCallback(() => {
    if (savingBeforeContinue) return
    setPending(null)
  }, [savingBeforeContinue])

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 2 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 2,
        }}
      >
        <Typography component="h1" variant="h5" sx={{ fontWeight: 600 }}>
          Notas de voz
        </Typography>
        <Button variant="outlined" onClick={handleNewNote} disabled={composerBusy}>
          Nueva nota
        </Button>
      </Box>

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
            ref={composerRef}
            selectedDetail={selectedDetail}
            onBusyChange={setComposerBusy}
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
          <VoiceLibrary onSelect={handleSelect} selectedId={selectedId} disabled={composerBusy} />
        </Box>
      </Box>

      {/* Diálogo de cambios sin guardar al cambiar de nota o crear una nueva */}
      <Dialog open={pending != null} onClose={handleDirtyCancel}>
        <DialogTitle>Cambios sin guardar</DialogTitle>
        <DialogContent>
          <DialogContentText>Tenés cambios sin guardar. ¿Qué querés hacer?</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={handleDirtyCancel} disabled={savingBeforeContinue}>
            Cancelar
          </Button>
          <Button onClick={handleDirtySaveAndContinue} disabled={savingBeforeContinue}>
            {savingBeforeContinue ? 'Guardando…' : 'Guardar y continuar'}
          </Button>
          <Button onClick={handleDirtyDiscardAndContinue} disabled={savingBeforeContinue}>
            Descartar y continuar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
