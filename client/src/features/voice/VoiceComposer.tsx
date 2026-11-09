import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ApiError } from '../../services/http'
import { fetchVoiceNote, voiceQueryKeys, type VoiceNoteDetail } from './api'
import { useVoiceCapabilities } from './useVoiceNotes'
import { useVoiceRecorder } from './useVoiceRecorder'
import { type SaveOutcome, useVoiceDraft, voiceNoteTextSchema } from './useVoiceDraft'

interface VoiceComposerProps {
  /** Detalle de una nota seleccionada desde la lista. Al cambiar, se carga en el composer. */
  selectedDetail?: VoiceNoteDetail | null
}

export interface VoiceComposerHandle {
  isDirty: boolean
  /** Guarda el texto vigente; resuelve 'saved' solo con ACK del servidor. */
  save: () => Promise<SaveOutcome>
  reset: () => void
}

/**
 * Composer de nota de voz: captura → transcripción → edición → copia/guardado manual.
 * Soporta nueva nota (POST) y nota existente (PUT con CAS, DELETE con CAS).
 *
 * S-105: nueva nota abre borrador vacío. Permitir texto manual y grabación solo en nuevo vacío.
 * Antes de grabar: aviso Groq. Stop espera último fragmento y libera tracks.
 * Conflicto 409: conserva borrador, ofrece Copiar / Recargar con confirmación / Nueva nota con ese texto.
 * Borrar: diálogo Confirmar/Cancelar, espera 204, error no oculta borrador.
 */
export const VoiceComposer = React.forwardRef<VoiceComposerHandle, VoiceComposerProps>(
  ({ selectedDetail }, ref) => {
    const { data: capabilities } = useVoiceCapabilities()
    const draft = useVoiceDraft()
    const queryClient = useQueryClient()

    // Diálogo de confirmación de borrado
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    // Conflicto 409: el diálogo se abre mientras draft.state.conflict != null (sin estado espejo).
    const [confirmReload, setConfirmReload] = useState(false)
    const [reloading, setReloading] = useState(false)
    const [reloadError, setReloadError] = useState<string | null>(null)
    const [conflictCopied, setConflictCopied] = useState(false)

    const recordingEnabled = capabilities?.recordingEnabled ?? false
    const recordingReason = capabilities?.reason

    // Estado local para copiar
    const [copySuccess, setCopySuccess] = useState(false)
    const [copyError, setCopyError] = useState(false)
    const [showGroqWarning, setShowGroqWarning] = useState(true)

    // Validación del texto
    const [textError, setTextError] = useState<string | undefined>()
    const textAreaRef = useRef<HTMLTextAreaElement>(null)

    // Errores de operación, fijados por el resultado de save()/deleteNote()
    const [saveError, setSaveError] = useState(false)
    const [deleteError, setDeleteError] = useState<'error' | 'gone' | null>(null)

    // Hook de captura de voz
    const recorder = useVoiceRecorder({
      maxDurationSeconds: capabilities?.maxDurationSeconds,
      maxAudioBytes: capabilities?.maxAudioBytes,
      mimeTypes: capabilities?.mimeTypes,
      onResult: (result) => {
        draft.setCaptureState('idle', result)
      },
      onError: (error) => {
        draft.setCaptureState('error', null, error)
      },
    })

    // Sincronizar estado de captura con el draft. Depende solo del callback estable: `draft` es un
    // objeto nuevo en cada render y como dependencia provocaba un bucle de renders infinito.
    const { setCaptureState } = draft
    useEffect(() => {
      setCaptureState(
        recorder.state,
        recorder.result,
        recorder.error,
        recorder.elapsedSeconds,
        recorder.elapsedFormatted,
      )
    }, [
      recorder.state,
      recorder.result,
      recorder.error,
      recorder.elapsedSeconds,
      recorder.elapsedFormatted,
      setCaptureState,
    ])

    // Cuando hay resultado de captura, iniciar transcripción automáticamente
    useEffect(() => {
      if (recorder.result && recorder.state === 'idle') {
        draft.transcribe()
      }
    }, [recorder.result, recorder.state, draft])

    // Enfocar el textarea tras transcripción exitosa
    useEffect(() => {
      if (
        draft.state.documentState === 'dirty' &&
        draft.state.captureState === 'idle' &&
        !draft.state.captureResult
      ) {
        textAreaRef.current?.focus()
      }
    }, [draft.state.documentState, draft.state.captureState, draft.state.captureResult])

    // Cargar nota seleccionada desde la lista
    useEffect(() => {
      if (selectedDetail != null) {
        draft.loadNote(selectedDetail)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDetail?.id])

    const handleTextChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        draft.setText(value)
        setSaveError(false)
        setDeleteError(null)
        // Validar en tiempo real
        const result = voiceNoteTextSchema.safeParse(value)
        setTextError(result.success ? undefined : result.error.issues[0]?.message)
      },
      [draft],
    )

    const handleStartRecording = useCallback(async () => {
      if (!recordingEnabled) return
      setShowGroqWarning(false)
      try {
        await recorder.start()
      } catch {
        // El error se maneja en el hook
      }
    }, [recordingEnabled, recorder])

    const handleStopRecording = useCallback(() => {
      recorder.stop()
    }, [recorder])

    const handleCancelRecording = useCallback(() => {
      recorder.cancel()
    }, [recorder])

    const handleRetryTranscription = useCallback(() => {
      if (draft.state.captureResult) {
        draft.transcribe()
      }
    }, [draft])

    const handleDiscardAudio = useCallback(() => {
      draft.setCaptureState('idle', null, null)
    }, [draft])

    const handleCopy = useCallback(async () => {
      setCopySuccess(false)
      setCopyError(false)
      const success = await draft.copyToClipboard()
      if (success) {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 3000)
      } else {
        setCopyError(true)
      }
    }, [draft])

    const handleSave = useCallback(async (): Promise<SaveOutcome> => {
      const result = voiceNoteTextSchema.safeParse(draft.state.text)
      if (!result.success) {
        setTextError(result.error.issues[0]?.message)
        textAreaRef.current?.focus()
        return 'skipped'
      }
      setSaveError(false)
      setDeleteError(null)
      const outcome = await draft.save()
      setSaveError(outcome === 'error')
      return outcome
    }, [draft])

    const handleDeleteClick = useCallback(() => {
      setShowDeleteDialog(true)
    }, [])

    const handleDeleteConfirm = useCallback(async () => {
      setShowDeleteDialog(false)
      setDeleteError(null)
      setSaveError(false)
      const outcome = await draft.deleteNote()
      if (outcome === 'error' || outcome === 'gone') setDeleteError(outcome)
    }, [draft])

    const handleDeleteCancel = useCallback(() => {
      setShowDeleteDialog(false)
    }, [])

    const closeConflict = useCallback(() => {
      setConfirmReload(false)
      setReloadError(null)
      setConflictCopied(false)
    }, [])

    const handleConflictCopy = useCallback(async () => {
      setConflictCopied(await draft.copyToClipboard())
    }, [draft])

    const handleConflictDismiss = useCallback(() => {
      if (reloading) return
      draft.dismissConflict()
      closeConflict()
    }, [draft, closeConflict, reloading])

    const handleConflictReloadConfirm = useCallback(async () => {
      const id = draft.state.noteId
      if (id == null) return
      setReloading(true)
      setReloadError(null)
      try {
        const fresh = await queryClient.fetchQuery({
          queryKey: voiceQueryKeys.detail(id),
          queryFn: ({ signal }) => fetchVoiceNote(id, signal),
          staleTime: 0,
        })
        draft.loadNote(fresh, { force: true })
        setSaveError(false)
        setDeleteError(null)
        closeConflict()
      } catch (error) {
        setConfirmReload(false)
        setReloadError(
          error instanceof ApiError && error.status === 404
            ? 'La nota ya no existe en el servidor. Podés guardar tu texto como nota nueva.'
            : 'No se pudo recargar la nota. Tu borrador se conserva.',
        )
      } finally {
        setReloading(false)
      }
    }, [draft, queryClient, closeConflict])

    const handleConflictNewNote = useCallback(() => {
      draft.detachAsNewNote()
      setSaveError(false)
      setDeleteError(null)
      closeConflict()
    }, [draft, closeConflict])

    const isTranscribing = draft.transcribeMutation.isPending
    const isSaving = draft.createMutation.isPending || draft.updateMutation.isPending
    const isDeleting = draft.deleteMutation.isPending

    // Exponer isDirty, save y reset al padre (VoicePage) para el diálogo de cambios sin guardar.
    // Se recrea cuando cambia handleSave (cada cambio de texto), para no guardar un texto desactualizado.
    useImperativeHandle(
      ref,
      () => ({
        isDirty: draft.isDirty,
        save: handleSave,
        reset: draft.reset,
      }),
      [draft.isDirty, draft.reset, handleSave],
    )

    // Determinar si se puede grabar: solo en borrador nuevo vacío
    const canRecord =
      recordingEnabled &&
      draft.state.captureState === 'idle' &&
      draft.state.documentState === 'new' &&
      !draft.isBusy

    // Determinar si se puede guardar
    const canSave =
      !draft.isTextEmpty &&
      !isSaving &&
      !isTranscribing &&
      draft.state.captureState === 'idle' &&
      draft.state.documentState !== 'saving' &&
      !textError

    // Determinar si se puede borrar: solo nota existente y clean
    const canDelete =
      draft.state.noteId != null && draft.state.documentState === 'clean' && !draft.isBusy

    // Determinar si es nota existente
    const isExistingNote = draft.state.noteId != null

    return (
      <Box sx={{ width: '100%' }}>
        {/* Info de nota existente */}
        {isExistingNote && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Revisión {draft.state.revision}
          </Typography>
        )}

        {/* Aviso de Groq antes de grabar */}
        {showGroqWarning && recordingEnabled && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography component="span">
              Al detener, el audio se envía a Groq para transcribir. DevNotes guarda solo el texto
              que decidas guardar. La retención de Groq depende de{' '}
              <Link
                href="https://console.groq.com/docs/your-data"
                target="_blank"
                rel="noopener noreferrer"
              >
                su política
              </Link>
              .
            </Typography>
          </Alert>
        )}

        {/* Razón si la grabación está deshabilitada */}
        {!recordingEnabled && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {recordingReason === 'not_configured'
              ? 'La transcripción de voz no está configurada. Podés escribir notas manualmente.'
              : 'La grabación de voz está deshabilitada. Podés escribir notas manualmente.'}
          </Alert>
        )}

        {/* Estado de captura: solicitando permiso */}
        {draft.state.captureState === 'requesting' && (
          <Alert severity="info">
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} aria-hidden />
              <Typography>Esperando permiso del micrófono</Typography>
              <Button size="small" onClick={handleCancelRecording}>
                Cancelar
              </Button>
            </Stack>
          </Alert>
        )}

        {/* Estado de captura: grabando */}
        {draft.state.captureState === 'recording' && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Stack direction="row" spacing={1} useFlexGap>
                <Button
                  size="small"
                  color="inherit"
                  onClick={handleStopRecording}
                  variant="outlined"
                >
                  Detener y transcribir
                </Button>
                <Button size="small" color="inherit" onClick={handleCancelRecording}>
                  Cancelar grabación
                </Button>
              </Stack>
            }
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  animation: 'pulse 1.5s infinite',
                }}
                aria-hidden
              />
              <Typography component="span" sx={{ fontWeight: 600 }}>
                Grabando
              </Typography>
              <Typography
                component="span"
                sx={{ fontFamily: 'monospace', fontSize: '1.1rem' }}
                role="timer"
                aria-label={`Tiempo de grabación: ${draft.state.elapsedFormatted}`}
              >
                {draft.state.elapsedFormatted}
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* Estado de transcripción */}
        {isTranscribing && (
          <Alert severity="info">
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} role="status">
              <CircularProgress size={20} aria-hidden />
              <Typography>Transcribiendo…</Typography>
            </Stack>
          </Alert>
        )}

        {/* Error de captura */}
        {draft.state.captureState === 'error' && draft.state.captureError && (
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                {draft.state.captureResult && (
                  <Button size="small" color="inherit" onClick={handleRetryTranscription}>
                    Reintentar transcripción
                  </Button>
                )}
                <Button size="small" color="inherit" onClick={handleDiscardAudio}>
                  Descartar audio
                </Button>
              </Stack>
            }
            sx={{ mb: 2 }}
          >
            No se pudo transcribir el audio.{' '}
            {draft.state.captureResult ? 'Podés reintentar o descartar.' : 'Intentá de nuevo.'}
          </Alert>
        )}

        {/* Error de guardado (no 409: el conflicto tiene su diálogo) */}
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No se pudieron guardar los cambios. Tu borrador se conserva.
          </Alert>
        )}

        {/* Error de borrado */}
        {deleteError === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No se pudo borrar la nota.
          </Alert>
        )}
        {deleteError === 'gone' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            La nota ya no existe. El texto se conserva como borrador nuevo sin guardar.
          </Alert>
        )}

        {/* Textarea de edición */}
        <TextField
          inputRef={textAreaRef}
          fullWidth
          multiline
          minRows={8}
          maxRows={20}
          placeholder="Escribí tu nota o grabá audio para transcribir…"
          value={draft.state.text}
          onChange={handleTextChange}
          disabled={isTranscribing || draft.state.captureState === 'recording'}
          error={!!textError}
          helperText={textError}
          slotProps={{
            input: {
              'aria-label': 'Texto de la nota',
            },
          }}
          sx={{ mb: 2, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.95rem' } }}
        />

        {/* Mensaje de éxito al guardar */}
        {draft.state.documentState === 'clean' && draft.state.noteId && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Nota guardada correctamente.
          </Alert>
        )}

        {/* Mensaje de guardado en curso */}
        {isSaving && (
          <Alert severity="info">
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} role="status">
              <CircularProgress size={20} aria-hidden />
              <Typography>Guardando…</Typography>
            </Stack>
          </Alert>
        )}

        {/* Mensaje de borrado en curso */}
        {draft.state.documentState === 'deleting' && (
          <Alert severity="info">
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} role="status">
              <CircularProgress size={20} aria-hidden />
              <Typography>Eliminando…</Typography>
            </Stack>
          </Alert>
        )}

        {/* Mensaje de éxito al copiar */}
        {copySuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Texto copiado al portapapeles.
          </Alert>
        )}

        {/* Error de copiar */}
        {copyError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No se pudo copiar al portapapeles. Seleccioná el texto y copiá manualmente.
          </Alert>
        )}

        {/* Botones de acción */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {/* Grabar */}
          {canRecord && (
            <Button
              variant="outlined"
              onClick={handleStartRecording}
              startIcon={
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                  }}
                />
              }
            >
              Grabar
            </Button>
          )}

          {/* Copiar */}
          {!draft.isTextEmpty && (
            <Button variant="outlined" onClick={handleCopy} disabled={isTranscribing || isSaving}>
              Copiar
            </Button>
          )}

          {/* Guardar */}
          <Button variant="contained" onClick={handleSave} disabled={!canSave}>
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>

          {/* Borrar — solo nota existente */}
          {canDelete && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              Borrar
            </Button>
          )}
        </Stack>

        {/* Diálogo de confirmación de borrado */}
        <Dialog open={showDeleteDialog} onClose={handleDeleteCancel}>
          <DialogTitle>Eliminar nota</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ¿Estás seguro de que querés eliminar esta nota? Esta acción no se puede deshacer.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancelar</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de conflicto de revisión (409): abierto mientras haya conflicto pendiente */}
        <Dialog
          open={draft.state.conflict != null}
          onClose={handleConflictDismiss}
          aria-labelledby="voice-conflict-title"
        >
          <DialogTitle id="voice-conflict-title">Conflicto de edición</DialogTitle>
          <DialogContent>
            {confirmReload ? (
              <DialogContentText>
                Se descartará tu borrador y se cargará la versión guardada en el servidor.
              </DialogContentText>
            ) : (
              <DialogContentText>
                Esta nota fue modificada o borrada por otra sesión. Tu borrador se conserva. ¿Qué
                querés hacer?
              </DialogContentText>
            )}
            {conflictCopied && !confirmReload && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Texto copiado al portapapeles.
              </Alert>
            )}
            {reloadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {reloadError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
            {confirmReload ? (
              <>
                <Button onClick={() => setConfirmReload(false)} disabled={reloading}>
                  Volver
                </Button>
                <Button
                  onClick={handleConflictReloadConfirm}
                  color="warning"
                  variant="contained"
                  disabled={reloading}
                >
                  {reloading ? 'Recargando…' : 'Descartar y recargar'}
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleConflictCopy}>Copiar texto</Button>
                <Button
                  onClick={() => {
                    setReloadError(null)
                    setConfirmReload(true)
                  }}
                >
                  Recargar nota
                </Button>
                <Button onClick={handleConflictNewNote} variant="contained">
                  Nueva nota
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    )
  },
)

VoiceComposer.displayName = 'VoiceComposer'
