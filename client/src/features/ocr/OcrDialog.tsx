import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useCallback, useId, useLayoutEffect, useRef, useState, type ClipboardEvent } from 'react'
import { useCopyToClipboard } from '../../shared/ui/useCopyToClipboard'
import type { Space } from '../spaces/space'
import { extractScreenshot, extractionErrorMessage, validateScreenshot } from './api'
import { ocrActionSx } from './styles'
import './ocrDialog.css'

interface Screenshot {
  file: File
  url: string
}

interface Result {
  text: string
  baseline: string
}

type Discard = { kind: 'close' } | { kind: 'replace'; file: File }
type SelectionFeedback = { kind: 'error' | 'notice'; message: string }

export function OcrDialog({
  space,
  csrfReady,
  onClose,
}: {
  space: Space
  csrfReady: boolean
  onClose: () => void
}) {
  const mobile = useMediaQuery('(pointer: coarse)', { noSsr: true })
  const titleId = useId()
  const previewId = useId()
  const discardId = useId()
  const warningId = useId()
  const resultId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const extractButton = useRef<HTMLButtonElement>(null)
  const resultInput = useRef<HTMLTextAreaElement>(null)
  const focusResult = useRef(false)
  const selection = useRef<Screenshot | null>(null)
  const request = useRef<AbortController | null>(null)
  const copying = useRef<Screenshot | null>(null)
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [discard, setDiscard] = useState<Discard | null>(null)
  const [selectionFeedback, setSelectionFeedback] = useState<SelectionFeedback | null>(null)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const { copy } = useCopyToClipboard()
  const focusPasteZone = useCallback(
    (zone: HTMLDivElement | null) => {
      if (!mobile) zone?.focus({ preventScroll: true })
    },
    [mobile],
  )

  // La identidad, el espacio y la fecha delimitan el montaje desde Notas.
  const clearSelection = useCallback(() => {
    request.current?.abort()
    request.current = null
    copying.current = null
    if (selection.current) URL.revokeObjectURL(selection.current.url)
    selection.current = null
  }, [])
  useLayoutEffect(() => clearSelection, [clearSelection])

  const hasResult = result !== null
  useLayoutEffect(() => {
    if (hasResult && focusResult.current) resultInput.current?.focus()
    focusResult.current = false
  }, [hasResult])

  function replace(file: File) {
    clearSelection()
    const next = { file, url: URL.createObjectURL(file) }
    selection.current = next
    setScreenshot(next)
    setResult(null)
    setExtracting(false)
    setPreviewExpanded(false)
    setSelectionFeedback(null)
    setExtractionError(null)
    setCopiedText(null)
    setCopyFailed(false)
  }

  const edited = result !== null && result.text !== result.baseline

  function choose(file: File) {
    const error = validateScreenshot(file)
    if (error) {
      setSelectionFeedback({ kind: 'error', message: error })
      return
    }
    setSelectionFeedback(null)
    if (edited) {
      setDiscard({ kind: 'replace', file })
    } else {
      replace(file)
    }
  }

  const cancelSelection = useCallback(() => {
    setSelectionFeedback({
      kind: 'notice',
      message: selection.current
        ? 'La captura anterior sigue seleccionada.'
        : 'No elegiste una imagen.',
    })
  }, [])
  const attachFileInput = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return
      fileInput.current = input
      input.addEventListener('cancel', cancelSelection)
      return () => {
        input.removeEventListener('cancel', cancelSelection)
        fileInput.current = null
      }
    },
    [cancelSelection],
  )

  function paste(event: ClipboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const file = Array.from(event.clipboardData.files).find((item) =>
      item.type.startsWith('image/'),
    )
    if (file) {
      event.preventDefault()
      choose(file)
    }
  }

  function close() {
    if (edited) {
      setDiscard({ kind: 'close' })
    } else {
      clearSelection()
      onClose()
    }
  }

  async function extract() {
    const current = selection.current
    if (!current || request.current || !csrfReady) return
    const controller = new AbortController()
    request.current = controller
    setSelectionFeedback(null)
    setExtractionError(null)
    setExtracting(true)
    try {
      const { text } = await extractScreenshot(space, current.file, controller.signal)
      if (request.current !== controller) return
      focusResult.current = !mobile && document.activeElement === extractButton.current
      setResult({ text, baseline: text })
    } catch (error) {
      if (request.current === controller) setExtractionError(extractionErrorMessage(error))
    } finally {
      if (request.current === controller) {
        request.current = null
        setExtracting(false)
      }
    }
  }

  async function copyText() {
    const current = selection.current
    if (!current || copying.current || !result?.text.trim()) return
    const text = result.text
    copying.current = current
    setCopiedText(null)
    setCopyFailed(false)
    const outcome = await copy(text)
    if (selection.current !== current) return
    copying.current = null
    if (outcome.success) {
      setResult((latest) => latest && { ...latest, baseline: text })
      setCopiedText(text)
    } else {
      setCopyFailed(true)
    }
  }

  return (
    <>
      <Dialog
        open
        onClose={close}
        aria-labelledby={titleId}
        fullScreen={mobile}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: mobile ? '100%' : 'min(1120px, calc(100% - 24px))',
              maxWidth: 'none',
              margin: mobile ? 0 : '12px',
              maxHeight: mobile ? '100dvh' : 'calc(100dvh - 24px)',
              pt: mobile ? 'env(safe-area-inset-top)' : 0,
              pb: mobile ? 'env(safe-area-inset-bottom)' : 0,
              pl: mobile ? 'env(safe-area-inset-left)' : 0,
              pr: mobile ? 'env(safe-area-inset-right)' : 0,
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            py: 1,
            px: { xs: 2, sm: 3 },
            lineHeight: 1.25,
          }}
        >
          <DialogTitle id={titleId} sx={{ p: 0, lineHeight: 'inherit' }}>
            Copiar texto de una captura
          </DialogTitle>
          <Button color="inherit" onClick={close} sx={{ ...ocrActionSx, flexShrink: 0 }}>
            Cerrar
          </Button>
        </Box>

        <DialogContent dividers className="ocr-dialog-content" sx={{ px: { xs: 2, sm: 3 } }}>
          <div className="ocr-panes">
            <div className="ocr-capture">
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
                Captura
              </Typography>
              <Box
                className="ocr-paste-zone"
                role="group"
                aria-label="Zona para pegar una captura"
                tabIndex={0}
                onPaste={paste}
                ref={focusPasteZone}
                sx={{
                  bgcolor: 'background.default',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: -2,
                  },
                }}
              >
                {!mobile && <Typography variant="body2">Pegá una captura (Ctrl+V)</Typography>}
                <Typography color="text.secondary" variant="body2">
                  PNG o JPG, hasta 1 MB
                </Typography>
              </Box>
              {screenshot && (
                <Box
                  id={previewId}
                  className="ocr-preview"
                  data-collapsed={hasResult && !previewExpanded ? 'true' : undefined}
                  sx={{
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <img src={screenshot.url} alt="Vista previa de la captura" />
                </Box>
              )}
              <div className="ocr-image-actions">
                {hasResult && (
                  <Button
                    className="ocr-preview-toggle"
                    aria-controls={previewId}
                    aria-expanded={previewExpanded}
                    onClick={() => setPreviewExpanded(!previewExpanded)}
                    sx={ocrActionSx}
                  >
                    {previewExpanded ? 'Ocultar captura' : 'Ver captura'}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => fileInput.current?.click()}
                  sx={ocrActionSx}
                >
                  {screenshot ? 'Elegir otra imagen' : 'Elegir imagen'}
                </Button>
                <input
                  ref={attachFileInput}
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  aria-label="Archivo de la captura"
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    event.currentTarget.value = ''
                    if (file) choose(file)
                    else cancelSelection()
                  }}
                />
              </div>
              {selectionFeedback?.kind === 'error' && (
                <Alert severity="error">{selectionFeedback.message}</Alert>
              )}
              {selectionFeedback?.kind === 'notice' && (
                <Typography variant="body2" color="text.secondary" role="status">
                  {selectionFeedback.message}
                </Typography>
              )}
            </div>
            <div className="ocr-result" data-empty={!hasResult || undefined}>
              {hasResult ? (
                <Typography
                  component="label"
                  htmlFor={resultId}
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                >
                  Texto extraído
                </Typography>
              ) : (
                <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Texto extraído
                </Typography>
              )}
              {result ? (
                <TextField
                  id={resultId}
                  inputRef={resultInput}
                  multiline
                  minRows={6}
                  fullWidth
                  value={result.text}
                  onChange={(event) => {
                    const text = event.target.value
                    setResult((latest) => latest && { ...latest, text })
                    setCopiedText(null)
                    setCopyFailed(false)
                  }}
                  slotProps={{
                    input: {
                      sx: {
                        bgcolor: 'background.default',
                        fontFamily: '"Roboto Mono", monospace',
                        fontSize: '1rem',
                        lineHeight: 1.6,
                        '& textarea': { overflowWrap: 'anywhere' },
                      },
                    },
                    htmlInput: { spellCheck: false },
                  }}
                />
              ) : (
                <Typography
                  className="ocr-result-placeholder"
                  color="text.secondary"
                  variant="body2"
                >
                  El texto aparecerá acá después de extraerlo.
                </Typography>
              )}
            </div>
          </div>

          <div className="ocr-feedback">
            {extractionError && <Alert severity="error">{extractionError}</Alert>}
            {copyFailed && <Alert severity="error">Seleccioná y copiá el texto manualmente.</Alert>}
            <Typography component="div" variant="body2" color="text.secondary" role="status">
              {extracting
                ? 'Extrayendo texto…'
                : result && (copiedText === result.text ? 'Texto copiado' : 'Texto listo')}
            </Typography>
          </div>

          <DialogActions disableSpacing className="ocr-actions" sx={{ p: 0 }}>
            {!hasResult && (
              <Typography id={warningId} variant="body2" color="text.secondary">
                Se enviará la imagen completa a OCR.space.
              </Typography>
            )}
            {result ? (
              <Button
                variant="contained"
                onClick={() => void copyText()}
                disabled={!result.text.trim()}
                sx={ocrActionSx}
              >
                Copiar texto
              </Button>
            ) : (
              <Button
                ref={extractButton}
                variant="contained"
                aria-describedby={warningId}
                disabled={!screenshot || !csrfReady}
                aria-disabled={extracting || undefined}
                onClick={() => void extract()}
                sx={ocrActionSx}
              >
                Extraer texto
              </Button>
            )}
          </DialogActions>
        </DialogContent>
      </Dialog>
      {discard && (
        <Dialog open onClose={() => setDiscard(null)} aria-labelledby={discardId}>
          <DialogTitle id={discardId}>¿Descartar los cambios del texto?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Editaste el texto extraído y todavía no copiaste esos cambios.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button autoFocus onClick={() => setDiscard(null)} sx={ocrActionSx}>
              Seguir editando
            </Button>
            <Button
              variant="contained"
              sx={ocrActionSx}
              onClick={() => {
                setDiscard(null)
                if (discard.kind === 'replace') {
                  replace(discard.file)
                } else {
                  clearSelection()
                  onClose()
                }
              }}
            >
              Descartar cambios
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
