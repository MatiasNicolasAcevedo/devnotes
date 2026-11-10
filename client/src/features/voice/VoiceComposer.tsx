import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
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
import { useSession } from '../auth/sessionContext'
import { MaxDurationExceededError } from './recorder'
import { type SaveOutcome, voiceNoteTextSchema } from './useVoiceDraft'
import { useVoiceDraftContext } from './voiceDraftContext'

interface VoiceComposerProps {
  /** Detalle de una nota seleccionada desde la lista. Al cambiar, se carga en el composer. */
  selectedDetail?: VoiceNoteDetail | null
  /**
   * Avisa cuando empieza/termina un guardado o borrado en vuelo. Mientras sea true la página no
   * cambia de documento: la respuesta pertenece a la nota actual (S-105: cargas tardías).
   */
  onBusyChange?: (busy: boolean) => void
  /** La página está obteniendo el detalle de otra nota: editor y acciones bloqueados. */
  loadingDetail?: boolean
  /** La nota pedida no se pudo abrir: el editor queda bloqueado hasta reintentar o elegir otra. */
  detailUnavailable?: boolean
  /** El documento dejó de corresponder a una nota guardada (borrada o 404): la página la deselecciona. */
  onDetached?: () => void
}

export interface VoiceComposerHandle {
  isDirty: boolean
  /** Guardado o borrado en vuelo. */
  isBusy: boolean
  /** Quita avisos de la nota anterior (error de guardado/borrado, copia) al cambiar de documento. */
  dismissNotices: () => void
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
  (
    { selectedDetail, onBusyChange, loadingDetail = false, detailUnavailable = false, onDetached },
    ref,
  ) => {
    // Mientras la nota pedida carga o falló no se escribe, graba, guarda ni borra: lo que se hiciera
    // quedaría sobre el documento anterior y el detalle entrante lo descartaría o se superpondría.
    const { logoutPending } = useSession()
    const editorLocked = loadingDetail || detailUnavailable || logoutPending
    const { draft, recorder, capabilities, stopAndTranscribe } = useVoiceDraftContext()
    const captureState = recorder.state === 'idle' ? draft.state.captureState : recorder.state
    const captureError = recorder.error ?? draft.state.captureError
    const queryClient = useQueryClient()

    // Diálogo de confirmación de borrado
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    // Conflicto 409: el diálogo se abre mientras draft.state.conflict != null (sin estado espejo).
    const [confirmReload, setConfirmReload] = useState(false)
    const [reloading, setReloading] = useState(false)
    const reloadOperation = useRef<symbol | null>(null)
    const [reloadError, setReloadError] = useState<string | null>(null)
    const [conflictCopy, setConflictCopy] = useState<'ok' | 'error' | null>(null)
    // Generación del documento guardado en esta sesión: el aviso de éxito solo se muestra para ella.
    const [savedGeneration, setSavedGeneration] = useState<number | null>(null)

    useLayoutEffect(() => {
      // El borrador sobrevive al outlet, pero una recarga iniciada por el editor no.
      return () => {
        reloadOperation.current = null
      }
    }, [])

    const recordingEnabled = capabilities?.recordingEnabled ?? false
    const recordingReason = capabilities?.reason

    // Estado local para copiar
    const [copySuccess, setCopySuccess] = useState(false)
    const [copyError, setCopyError] = useState(false)
    const [showGroqWarning, setShowGroqWarning] = useState(true)

    // Validación del texto
    // Error de validación derivado del texto vigente: solo con cambios sin guardar, y nunca se arrastra
    // de un documento a otro.
    const textValidation =
      draft.state.documentState === 'dirty' ? voiceNoteTextSchema.safeParse(draft.state.text) : null
    const textError =
      textValidation && !textValidation.success
        ? textValidation.error.issues[0]?.message
        : undefined
    const textAreaRef = useRef<HTMLTextAreaElement>(null)

    // Errores de operación, fijados por el resultado de save()/deleteNote()
    const [saveError, setSaveError] = useState<'error' | 'gone' | null>(null)
    const [deleteError, setDeleteError] = useState<'error' | 'gone' | null>(null)

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
    }, [selectedDetail?.id, selectedDetail?.revision])

    const handleTextChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        draft.setText(value)
        setSaveError(null)
        setDeleteError(null)
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

    const handleCancelRecording = useCallback(() => {
      recorder.cancel()
    }, [recorder])

    const handleRetryTranscription = useCallback(() => {
      if (draft.state.captureResult) {
        draft.transcribe()
      }
    }, [draft])

    const handleDiscardAudio = useCallback(() => {
      recorder.cancel()
      draft.clearAudio()
    }, [draft, recorder])

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
        textAreaRef.current?.focus()
        return 'skipped'
      }
      setSaveError(null)
      setDeleteError(null)
      const generation = draft.state.generation
      const outcome = await draft.save()
      setSaveError(outcome === 'error' || outcome === 'gone' ? outcome : null)
      if (outcome === 'saved') setSavedGeneration(generation)
      if (outcome === 'gone') onDetached?.()
      return outcome
    }, [draft, onDetached])

    const handleDeleteClick = useCallback(() => {
      setShowDeleteDialog(true)
    }, [])

    const handleDeleteConfirm = useCallback(async () => {
      setShowDeleteDialog(false)
      setDeleteError(null)
      setSaveError(null)
      const outcome = await draft.deleteNote()
      if (outcome === 'error' || outcome === 'gone') setDeleteError(outcome)
      if (outcome === 'deleted' || outcome === 'gone') onDetached?.()
    }, [draft, onDetached])

    const handleDeleteCancel = useCallback(() => {
      setShowDeleteDialog(false)
    }, [])

    const closeConflict = useCallback(() => {
      setConfirmReload(false)
      setReloadError(null)
      setConflictCopy(null)
    }, [])

    const handleConflictCopy = useCallback(async () => {
      setConflictCopy((await draft.copyToClipboard()) ? 'ok' : 'error')
    }, [draft])

    const handleConflictDismiss = useCallback(() => {
      if (reloading) return
      draft.dismissConflict()
      closeConflict()
    }, [draft, closeConflict, reloading])

    const handleConflictReloadConfirm = useCallback(async () => {
      const { noteId: id, generation } = draft.state
      if (id == null || reloadOperation.current !== null || !draft.isCurrentGeneration(generation))
        return
      const operation = Symbol()
      reloadOperation.current = operation
      const isCurrent = () =>
        reloadOperation.current === operation && draft.isCurrentGeneration(generation)
      setReloading(true)
      setReloadError(null)
      try {
        const fresh = await queryClient.fetchQuery({
          queryKey: voiceQueryKeys.detail(id),
          queryFn: ({ signal }) => fetchVoiceNote(id, signal),
          staleTime: 0,
        })
        if (!isCurrent()) return
        draft.loadNote(fresh, { force: true })
        setSaveError(null)
        setDeleteError(null)
        closeConflict()
      } catch (error) {
        if (!isCurrent()) return
        setConfirmReload(false)
        setReloadError(
          error instanceof ApiError && error.status === 404
            ? 'La nota ya no existe en el servidor. Podés guardar tu texto como nota nueva.'
            : 'No se pudo recargar la nota. Tu borrador se conserva.',
        )
      } finally {
        if (reloadOperation.current === operation) {
          reloadOperation.current = null
          setReloading(false)
        }
      }
    }, [draft, queryClient, closeConflict])

    const handleConflictNewNote = useCallback(() => {
      draft.detachAsNewNote()
      setSaveError(null)
      setDeleteError(null)
      closeConflict()
      onDetached?.()
    }, [draft, closeConflict, onDetached])

    const { reset: resetDraft } = draft
    const { resetError: resetRecorderError } = recorder
    const dismissNotices = useCallback(() => {
      setSaveError(null)
      setDeleteError(null)
      setCopySuccess(false)
      setCopyError(false)
    }, [])

    const isTranscribing = draft.transcribeMutation.isPending
    const isSaving = draft.createMutation.isPending || draft.updateMutation.isPending
    const isDeleting = draft.deleteMutation.isPending
    // La página no cambia de documento con guardado/borrado, captura o transcripción en curso,
    // ni con audio pendiente de transcribir/descartar (S-105: no se superponen).
    const captureBusy =
      captureState === 'requesting' || captureState === 'recording' || captureState === 'stopping'
    const audioPending = recorder.result != null || draft.state.captureResult != null
    const isPersisting = isSaving || isDeleting || draft.isBusy || captureBusy || audioPending

    useEffect(() => {
      onBusyChange?.(isPersisting)
    }, [isPersisting, onBusyChange])

    // Exponer isDirty, save y reset al padre (VoicePage) para el diálogo de cambios sin guardar.
    // Se recrea cuando cambia handleSave (cada cambio de texto), para no guardar un texto desactualizado.
    useImperativeHandle(
      ref,
      () => ({
        isDirty: draft.isDirty,
        isBusy: isPersisting,
        dismissNotices,
        save: handleSave,
        reset: () => {
          resetDraft()
          // Un aviso de captura (p. ej. audio excedido y ya descartado) no bloquea el documento nuevo.
          resetRecorderError()
          dismissNotices()
        },
      }),
      [draft.isDirty, resetDraft, resetRecorderError, handleSave, isPersisting, dismissNotices],
    )

    // Determinar si se puede grabar: solo en borrador nuevo vacío
    const canRecord =
      !editorLocked &&
      recordingEnabled &&
      captureState === 'idle' &&
      draft.state.documentState === 'new' &&
      !isPersisting

    // Determinar si se puede guardar
    const canSave =
      !editorLocked &&
      !draft.isTextEmpty &&
      !isSaving &&
      !isTranscribing &&
      captureState === 'idle' &&
      !audioPending &&
      draft.state.documentState !== 'saving' &&
      !textError

    // Determinar si se puede borrar: solo nota existente y clean
    const canDelete =
      !editorLocked &&
      draft.state.noteId != null &&
      draft.state.documentState === 'clean' &&
      !draft.isBusy

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
        {captureState === 'requesting' && (
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
        {captureState === 'recording' && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Stack direction="row" spacing={1} useFlexGap>
                <Button size="small" color="inherit" onClick={stopAndTranscribe} variant="outlined">
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
                aria-label={`Tiempo de grabación: ${recorder.elapsedFormatted}`}
              >
                {recorder.elapsedFormatted}
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
        {captureState === 'idle' && draft.state.captureResult && (
          <Alert severity="info" sx={{ mb: 2 }}>
            El audio está listo para transcribir.
            <Stack direction="row" spacing={1}>
              <Button disabled={editorLocked} onClick={handleRetryTranscription}>
                Transcribir
              </Button>
              <Button onClick={handleDiscardAudio}>Descartar audio</Button>
            </Stack>
          </Alert>
        )}
        {captureState === 'error' && captureError && (
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                {draft.state.captureResult && (
                  <Button
                    size="small"
                    color="inherit"
                    disabled={editorLocked}
                    onClick={handleRetryTranscription}
                  >
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
            {captureError instanceof MaxDurationExceededError
              ? `${captureError.message} Se descartó el audio.`
              : `No se pudo transcribir el audio. ${draft.state.captureResult ? 'Podés reintentar o descartar.' : 'Intentá de nuevo.'}`}
          </Alert>
        )}

        {/* Error de guardado (no 409: el conflicto tiene su diálogo) */}
        {saveError === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No se pudieron guardar los cambios. Tu borrador se conserva.
          </Alert>
        )}

        {/* Carga del detalle de otra nota */}
        {loadingDetail && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} role="status">
              <CircularProgress size={20} aria-hidden />
              <Typography>Cargando nota…</Typography>
            </Stack>
          </Alert>
        )}

        {/* Error de borrado */}
        {deleteError === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No se pudo borrar la nota.
          </Alert>
        )}
        {(deleteError === 'gone' || saveError === 'gone') && (
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
          disabled={editorLocked || captureBusy || audioPending}
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
        {draft.state.documentState === 'clean' &&
          draft.state.noteId &&
          savedGeneration === draft.state.generation && (
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
            {conflictCopy === 'ok' && !confirmReload && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Texto copiado al portapapeles.
              </Alert>
            )}
            {conflictCopy === 'error' && !confirmReload && (
              <Alert severity="error" sx={{ mt: 2 }}>
                No se pudo copiar al portapapeles. Seleccioná el texto en el editor y copiá
                manualmente.
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
