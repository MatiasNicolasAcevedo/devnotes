import { useCallback, useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useVoiceCapabilities } from './useVoiceNotes'
import { useVoiceRecorder } from './useVoiceRecorder'
import { useVoiceDraft, voiceNoteTextSchema } from './useVoiceDraft'

/**
 * Composer de nota de voz: captura → transcripción → edición → copia/guardado manual.
 *
 * S-105: nueva nota abre borrador vacío. Permitir texto manual y grabación solo en nuevo vacío.
 * Antes de grabar: aviso Groq. Stop espera último fragmento y libera tracks.
 * Copiar entrega exactamente el texto actual. Guardar exige texto válido y ACK.
 */
export function VoiceComposer() {
  const { data: capabilities } = useVoiceCapabilities()
  const draft = useVoiceDraft()

  const recordingEnabled = capabilities?.recordingEnabled ?? false
  const recordingReason = capabilities?.reason

  // Estado local para copiar
  const [copySuccess, setCopySuccess] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [showGroqWarning, setShowGroqWarning] = useState(true)

  // Validación del texto
  const [textError, setTextError] = useState<string | undefined>()
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

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

  // Sincronizar estado de captura con el draft
  useEffect(() => {
    draft.setCaptureState(
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
    draft,
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

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      draft.setText(value)
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
      // Ocultar después de 3 segundos
      setTimeout(() => setCopySuccess(false), 3000)
    } else {
      setCopyError(true)
    }
  }, [draft])

  const handleSave = useCallback(() => {
    // Validar antes de guardar
    const result = voiceNoteTextSchema.safeParse(draft.state.text)
    if (!result.success) {
      setTextError(result.error.issues[0]?.message)
      return
    }
    draft.save()
  }, [draft])

  const isTranscribing = draft.transcribeMutation.isPending
  const isSaving = draft.createMutation.isPending

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

  return (
    <Box sx={{ width: '100%' }}>
      {/* Aviso de Groq antes de grabar */}
      {showGroqWarning && recordingEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography component="span">
            Al detener, el audio se envía a Groq para transcribir. DevNotes guarda solo el texto que
            decidas guardar. La retención de Groq depende de{' '}
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
              <Button size="small" color="inherit" onClick={handleStopRecording} variant="outlined">
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

      {/* Error de guardar */}
      {draft.createMutation.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          No se pudo guardar la nota. El texto se conserva en el borrador.
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
      </Stack>
    </Box>
  )
}
