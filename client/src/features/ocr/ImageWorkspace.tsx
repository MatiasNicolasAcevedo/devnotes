import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from 'react'
import { useCopyToClipboard } from '../../shared/ui/useCopyToClipboard'
import type { Space } from '../spaces/space'
import { extractScreenshot, extractionErrorMessage, validateScreenshot } from './api'
import { DiscardImageChanges } from './DiscardImageChanges'
import { ImageDraftContext } from './imageDraftContext'
import { ocrActionSx } from './styles'
import './imageWorkspace.css'

interface Screenshot {
  file: File
  url: string
}

interface Result {
  text: string
  baseline: string
}

type SelectionFeedback = { kind: 'error' | 'notice'; message: string }

function clipboardScreenshot(data: DataTransfer | null): File | undefined {
  if (!data) return undefined
  const files = Array.from(data.files)
  let fallback: File | undefined
  function supported(file: File) {
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : null
    if (!extension) {
      fallback ??= file
      return undefined
    }
    if (/\.[^.]+$/.test(file.name)) return file
    return new File([file], `captura.${extension}`, { type: file.type })
  }
  for (const file of files) {
    const image = supported(file)
    if (image) return image
  }
  for (const item of Array.from(data.items ?? [])) {
    const file = item.kind === 'file' ? item.getAsFile() : null
    if (file) {
      const image = supported(file)
      if (image) return image
    }
  }
  return fallback
}

const NO_CLIPBOARD_IMAGE =
  'No hay una imagen en el portapapeles. Copiá la captura o usá Elegir imagen.'

export function ImageWorkspace({ space, canExtract }: { space: Space; canExtract: boolean }) {
  const mobile = useMediaQuery('(pointer: coarse)', { noSsr: true })
  const previewId = useId()
  const pasteHelpId = useId()
  const warningId = useId()
  const resultId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const extractButton = useRef<HTMLButtonElement>(null)
  const resultInput = useRef<HTMLTextAreaElement>(null)
  const focusResult = useRef(false)
  const pasteZone = useRef<HTMLDivElement>(null)
  const clipboardRead = useRef(0)
  const editedText = useRef(false)
  const selection = useRef<Screenshot | null>(null)
  const request = useRef<AbortController | null>(null)
  const copying = useRef<Screenshot | null>(null)
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [replacement, setReplacement] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [selectionFeedback, setSelectionFeedback] = useState<SelectionFeedback | null>(null)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const { copy } = useCopyToClipboard()
  const focusPasteZone = useCallback(
    (zone: HTMLDivElement | null) => {
      pasteZone.current = zone
      if (!mobile) zone?.focus({ preventScroll: true })
    },
    [mobile],
  )

  // La identidad, el espacio y la ruta delimitan el montaje.
  const clearSelection = useCallback(() => {
    request.current?.abort()
    request.current = null
    copying.current = null
    if (selection.current) URL.revokeObjectURL(selection.current.url)
    selection.current = null
  }, [])
  useLayoutEffect(
    () => () => {
      clipboardRead.current += 1
      clearSelection()
    },
    [clearSelection],
  )

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
  const { setImageEdited } = useContext(ImageDraftContext)
  useLayoutEffect(() => {
    editedText.current = edited
    setImageEdited(edited)
    return () => setImageEdited(false)
  }, [edited, setImageEdited])
  useEffect(() => {
    if (!edited) return
    function confirmUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', confirmUnload)
    return () => window.removeEventListener('beforeunload', confirmUnload)
  }, [edited])

  function choose(file: File) {
    clipboardRead.current += 1
    const error = validateScreenshot(file)
    if (error) {
      setSelectionFeedback({ kind: 'error', message: error })
      return
    }
    setSelectionFeedback(null)
    if (editedText.current) {
      setReplacement(file)
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
    const { target, currentTarget } = event
    if (
      event.defaultPrevented ||
      !(target instanceof Element) ||
      !currentTarget.contains(target) ||
      target.closest('textarea, input') ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return
    }
    event.preventDefault()
    clipboardRead.current += 1
    const file = clipboardScreenshot(event.clipboardData)
    if (file) {
      choose(file)
    } else {
      setSelectionFeedback({
        kind: 'error',
        message: NO_CLIPBOARD_IMAGE,
      })
    }
  }

  async function pasteFromClipboard() {
    const attempt = ++clipboardRead.current
    try {
      const items = await navigator.clipboard.read()
      if (attempt !== clipboardRead.current) return
      for (const item of items) {
        const type = item.types.find((value) => value === 'image/png' || value === 'image/jpeg')
        if (!type) continue
        const blob = await item.getType(type)
        if (attempt !== clipboardRead.current) return
        const name = type === 'image/png' ? 'captura.png' : 'captura.jpg'
        choose(new File([blob], name, { type }))
        return
      }
      setSelectionFeedback({ kind: 'error', message: NO_CLIPBOARD_IMAGE })
    } catch {
      if (attempt !== clipboardRead.current) return
      setSelectionFeedback({
        kind: 'error',
        message: 'No se pudo leer el portapapeles. Usá Ctrl+V en la caja o Elegir imagen.',
      })
      // La captura puede estar plegada mientras se edita un resultado en una pantalla angosta.
      setPreviewExpanded(true)
      requestAnimationFrame(() => {
        if (attempt === clipboardRead.current) pasteZone.current?.focus()
      })
    }
  }

  function dragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const hasFiles = event.dataTransfer.types.includes('Files')
    event.dataTransfer.dropEffect = hasFiles ? 'copy' : 'none'
    setDragging(hasFiles)
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    clipboardRead.current += 1
    const { files, items } = event.dataTransfer
    const [file, extra] = Array.from(files)
    const hasStringItem = Array.from(items).some((item) => item.kind === 'string')
    if (!file || extra || hasStringItem) {
      setSelectionFeedback({ kind: 'error', message: 'Soltá un solo archivo PNG o JPG.' })
      return
    }
    choose(file)
  }

  async function extract() {
    const current = selection.current
    if (!current || request.current || !canExtract) return
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
      <Box onPaste={paste} className="ocr-workspace">
        <div className="ocr-panes">
          <div className="ocr-capture">
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
              Captura
            </Typography>
            <Box
              className="ocr-paste-zone"
              role="group"
              aria-label="Zona para pegar una captura"
              aria-describedby={pasteHelpId}
              tabIndex={0}
              onClick={(event) => event.currentTarget.focus({ preventScroll: true })}
              ref={focusPasteZone}
              onDragOver={dragOver}
              onDragLeave={(event) => {
                const next = event.relatedTarget
                if (!(next instanceof Node) || !event.currentTarget.contains(next))
                  setDragging(false)
              }}
              onDrop={drop}
              data-collapsed={hasResult && !previewExpanded ? 'true' : undefined}
              sx={{
                bgcolor: 'background.default',
                border: screenshot ? '1px solid' : '1px dashed',
                borderColor: dragging ? 'primary.main' : 'divider',
                borderRadius: 1,
                '&:focus': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: -2,
                },
              }}
            >
              {screenshot ? (
                <div id={previewId} className="ocr-preview">
                  <img draggable={false} src={screenshot.url} alt="Vista previa de la captura" />
                </div>
              ) : (
                <Typography
                  aria-hidden="true"
                  className="ocr-paste-hint"
                  color="text.secondary"
                  variant="body2"
                  sx={{ px: 1.5, py: 1 }}
                >
                  Pegá tu imagen acá
                </Typography>
              )}
            </Box>
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
              <Button variant="outlined" onClick={() => void pasteFromClipboard()} sx={ocrActionSx}>
                Pegar
              </Button>
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
            <Typography id={pasteHelpId} color="text.secondary" variant="body2">
              PNG o JPG, hasta 1 MB{!mobile && ' · Ctrl+V para pegar'}
            </Typography>
            {selectionFeedback?.kind === 'error' && (
              <Alert severity="error">{selectionFeedback.message}</Alert>
            )}
            {selectionFeedback?.kind === 'notice' && (
              <Typography variant="body2" color="text.secondary" role="status">
                {selectionFeedback.message}
              </Typography>
            )}
            {!hasResult && (
              <>
                <Typography id={warningId} variant="body2" color="text.secondary">
                  Se enviará la imagen completa a OCR.space.
                </Typography>
                <Button
                  ref={extractButton}
                  variant="contained"
                  aria-describedby={warningId}
                  disabled={!screenshot || !canExtract}
                  aria-disabled={extracting || undefined}
                  onClick={() => void extract()}
                  sx={ocrActionSx}
                >
                  Extraer texto
                </Button>
              </>
            )}
            {extractionError && <Alert severity="error">{extractionError}</Alert>}
            {extracting && (
              <Typography variant="body2" color="text.secondary" role="status">
                Extrayendo texto…
              </Typography>
            )}
          </div>
          <div className="ocr-result">
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
              <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>
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
                sx={{
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1.5,
                }}
                color="text.secondary"
                variant="body2"
              >
                El texto aparecerá acá después de extraerlo.
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={() => void copyText()}
              disabled={!result?.text.trim()}
              sx={ocrActionSx}
            >
              Copiar texto
            </Button>
            {copyFailed && <Alert severity="error">Seleccioná y copiá el texto manualmente.</Alert>}
            {result && (
              <Typography variant="body2" color="text.secondary" role="status">
                {copiedText === result.text ? 'Texto copiado' : 'Texto listo'}
              </Typography>
            )}
          </div>
        </div>
      </Box>
      {replacement && (
        <DiscardImageChanges
          cancel={() => setReplacement(null)}
          discard={() => {
            setReplacement(null)
            replace(replacement)
          }}
        />
      )}
    </>
  )
}
