import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Link as RouterLink } from 'react-router'
import { ErrorAlert } from '../../shared/ui/ErrorAlert'
import { authQueryKeys, renewCsrf, withCsrfRenewal, type AuthUser } from '../auth/api'
import { useSession } from '../auth/sessionContext'
import { spaceHref, SPACE_LABELS, SPACES, type Space } from '../spaces/space'
import { useSpaceTransitionLock } from '../spaces/spaceContext'
import {
  downloadExport,
  importFile,
  previewImport,
  saveBlob,
  type ImportCounts,
  type ImportPreview,
  type ImportResult,
} from './api'
import { COUNT_LABELS, formatExportedAt, portabilityErrorMessage, texts } from './messages'

/** Pantalla /data: exportar la cuenta a Excel e importarla en una cuenta vacía (S-107). */
export function DataPage() {
  const session = useSession()
  return (
    <Stack spacing={3} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
      <Stack spacing={1}>
        <Typography component="h1" variant="h4">
          {texts.title}
        </Typography>
        <Typography color="text.secondary">{texts.intro}</Typography>
      </Stack>
      {session.status === 'authenticated' && session.user ? (
        // La clave remonta la pantalla al cambiar la identidad: ningún estado pasa de una cuenta a otra.
        <PrivateData key={session.user.id} owner={session.user.id} />
      ) : session.status === 'visitor' ? (
        <Alert severity="info">
          Ingresá para exportar o importar tus datos.{' '}
          <Link component={RouterLink} to="/login">
            Iniciar sesión
          </Link>
        </Alert>
      ) : session.status === 'loading' ? (
        <Typography role="status">Verificando sesión…</Typography>
      ) : (
        <ErrorAlert error={session.sessionError} onRetry={session.retrySession} />
      )}
    </Stack>
  )
}

type ExportState =
  | { kind: 'idle' }
  | { kind: 'downloading' }
  | { kind: 'done'; filename: string }
  | { kind: 'error'; error: unknown }

type ImportState =
  | { kind: 'idle' }
  | { kind: 'previewing'; file: File }
  | { kind: 'preview'; file: File; preview: ImportPreview }
  | { kind: 'importing'; file: File; preview: ImportPreview }
  | { kind: 'success'; result: ImportResult }
  | { kind: 'error'; file: File; stage: 'preview' | 'import'; error: unknown }

function PrivateData({ owner }: { owner: string }) {
  const session = useSession()
  const client = useQueryClient()
  const [exportState, setExportState] = useState<ExportState>({ kind: 'idle' })
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' })
  const [confirming, setConfirming] = useState(false)
  // Señal de la identidad: se aborta al desmontar, que es lo que ocurre al cambiar o cerrar la sesión.
  const identity = useRef<AbortController | null>(null)
  // Vista previa en vuelo: elegir otro archivo la aborta y descarta su respuesta.
  const previewRequest = useRef<AbortController | null>(null)
  const importing = useRef(false)
  const successHeading = useRef<HTMLHeadingElement>(null)
  const importAlert = useRef<HTMLDivElement>(null)
  const fileInputId = useId()
  const fileHelpId = useId()
  // Una importación en vuelo impide cambiar de espacio hasta su resultado (S-109, cambio seguro).
  useSpaceTransitionLock(importState.kind === 'importing' ? 'Hay una importación en curso.' : null)

  useEffect(() => {
    const controller = new AbortController()
    identity.current = controller
    return () => {
      controller.abort()
      previewRequest.current?.abort()
    }
  }, [])

  useEffect(() => {
    // El foco sigue al resultado: tras confirmar, el botón que lo tenía ya no existe.
    if (importState.kind === 'success') successHeading.current?.focus()
    if (importState.kind === 'error') importAlert.current?.focus()
  }, [importState.kind])

  const isCurrent = (controller: AbortController) =>
    !controller.signal.aborted &&
    client.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner

  const download = async () => {
    const controller = identity.current
    if (!controller || exportState.kind === 'downloading') return
    setExportState({ kind: 'downloading' })
    try {
      const file = await downloadExport({
        signal: controller.signal,
        sessionIsCurrent: () => isCurrent(controller),
      })
      if (!isCurrent(controller)) return
      saveBlob(file)
      setExportState({ kind: 'done', filename: file.filename })
    } catch (error) {
      if (!isCurrent(controller)) return
      setExportState({ kind: 'error', error })
    }
  }

  const preview = async (file: File) => {
    const controller = identity.current
    if (!controller || importing.current) return
    previewRequest.current?.abort()
    const request = new AbortController()
    previewRequest.current = request
    const sessionIsCurrent = () => isCurrent(controller)
    const live = () => sessionIsCurrent() && !request.signal.aborted
    setConfirming(false)
    setImportState({ kind: 'previewing', file })
    try {
      const result = await withCsrfRenewal(
        () =>
          previewImport(file, {
            signal: AbortSignal.any([controller.signal, request.signal]),
            sessionIsCurrent,
          }),
        () => (live() ? renewCsrf() : Promise.resolve()),
      )
      if (!live()) return
      setImportState({ kind: 'preview', file, preview: result })
    } catch (error) {
      if (!live()) return
      setImportState({ kind: 'error', file, stage: 'preview', error })
    }
  }

  const confirmImport = async () => {
    const controller = identity.current
    if (!controller || importing.current || importState.kind !== 'preview') return
    const { file, preview: previewed } = importState
    if (!previewed.accountEmpty) return
    importing.current = true
    const sessionIsCurrent = () => isCurrent(controller)
    setConfirming(false)
    setImportState({ kind: 'importing', file, preview: previewed })
    try {
      const result = await withCsrfRenewal(
        () => importFile(file, { signal: controller.signal, sessionIsCurrent }),
        () => (sessionIsCurrent() ? renewCsrf() : Promise.resolve()),
      )
      if (!sessionIsCurrent()) return
      setImportState({ kind: 'success', result })
      // Todo lo privado de esta identidad quedó desactualizado: notas, historial, voz, referencias, textos de Imagen y notas libres.
      void client.invalidateQueries()
    } catch (error) {
      if (!sessionIsCurrent()) return
      setImportState({ kind: 'error', file, stage: 'import', error })
    } finally {
      importing.current = false
    }
  }

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Se limpia para que elegir de nuevo el mismo archivo vuelva a disparar el cambio.
    event.target.value = ''
    if (file) void preview(file)
  }

  const downloading = exportState.kind === 'downloading'
  // Durante la vista previa el input sigue habilitado: elegir otro archivo reemplaza la revisión en curso, y
  // deshabilitar el control enfocado haría perder el foco del teclado.
  const importDisabled =
    !session.csrfReady || session.logoutPending || importState.kind === 'importing'

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Card component="section" aria-labelledby="data-export-title" variant="outlined">
        <CardContent>
          <Stack spacing={2} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
            <Typography id="data-export-title" component="h2" variant="h6">
              {texts.exportTitle}
            </Typography>
            <Typography color="text.secondary">{texts.exportHelp}</Typography>
            <Button
              variant="contained"
              onClick={() => void download()}
              disabled={downloading || session.logoutPending}
              sx={{ maxWidth: '100%' }}
            >
              {downloading ? texts.exporting : texts.exportButton}
            </Button>
            {exportState.kind === 'done' ? (
              <Alert severity="success" role="status" sx={{ alignSelf: 'stretch' }}>
                Descarga lista: {exportState.filename}
              </Alert>
            ) : null}
            {exportState.kind === 'error' ? (
              <Alert
                severity="error"
                sx={{ alignSelf: 'stretch' }}
                action={
                  <Button color="inherit" size="small" onClick={() => void download()}>
                    Reintentar
                  </Button>
                }
              >
                <AlertTitle>{texts.exportError}</AlertTitle>
                {portabilityErrorMessage(exportState.error)}
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card component="section" aria-labelledby="data-import-title" variant="outlined">
        <CardContent>
          <Stack spacing={2} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
            <Typography id="data-import-title" component="h2" variant="h6">
              {texts.importTitle}
            </Typography>
            <Typography id={fileHelpId} color="text.secondary">
              {texts.importHelp}
            </Typography>
            <Stack spacing={0.5} sx={{ alignSelf: 'stretch', minWidth: 0 }}>
              <Typography component="label" htmlFor={fileInputId} variant="subtitle2">
                {texts.fileLabel}
              </Typography>
              <Box
                component="input"
                id={fileInputId}
                type="file"
                accept=".xlsx"
                aria-describedby={fileHelpId}
                onChange={chooseFile}
                disabled={importDisabled}
                sx={{
                  maxWidth: '100%',
                  minWidth: 0,
                  font: 'inherit',
                  '&:focus-visible': { outline: '2px solid', outlineOffset: 2 },
                }}
              />
            </Stack>
            {!session.csrfReady ? (
              <Typography role="status" color="text.secondary">
                {texts.csrfPending}
              </Typography>
            ) : null}

            {importState.kind === 'previewing' ? (
              <Typography role="status">{texts.previewing}</Typography>
            ) : null}

            {importState.kind === 'preview' || importState.kind === 'importing' ? (
              <Stack
                component="section"
                aria-label={texts.previewTitle}
                spacing={1}
                sx={{ alignSelf: 'stretch', alignItems: 'flex-start', minWidth: 0 }}
              >
                <Typography component="h3" variant="subtitle1">
                  {texts.previewTitle}
                </Typography>
                <Typography>
                  Versión {importState.preview.version} · Exportado el{' '}
                  {formatExportedAt(importState.preview.exportedAt)}
                </Typography>
                {importState.preview.version === 1 && (
                  <Typography color="text.secondary">{texts.legacyHelp}</Typography>
                )}
                <AccountCounts result={importState.preview} />
                {!importState.preview.accountEmpty ? (
                  <Alert severity="info" role="status" sx={{ alignSelf: 'stretch' }}>
                    {texts.notEmpty}
                  </Alert>
                ) : importState.kind === 'importing' ? (
                  <Typography role="status">{texts.importing}</Typography>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => setConfirming(true)}
                    disabled={importDisabled}
                    sx={{ maxWidth: '100%' }}
                  >
                    {texts.importButton}
                  </Button>
                )}
              </Stack>
            ) : null}

            {importState.kind === 'error' ? (
              <Alert
                ref={importAlert}
                tabIndex={-1}
                severity="error"
                sx={{ alignSelf: 'stretch' }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void preview(importState.file)}
                    disabled={importDisabled}
                  >
                    Reintentar
                  </Button>
                }
              >
                <AlertTitle>
                  {importState.stage === 'import' ? texts.importError : texts.previewError}
                </AlertTitle>
                {portabilityErrorMessage(importState.error)}
              </Alert>
            ) : null}

            {importState.kind === 'success' ? (
              <Alert severity="success" role="status" sx={{ alignSelf: 'stretch' }}>
                <AlertTitle ref={successHeading} tabIndex={-1}>
                  {texts.successTitle}
                </AlertTitle>
                <AccountCounts result={importState.result} linkToContent />
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={confirming && importState.kind === 'preview'}
        onClose={() => setConfirming(false)}
        aria-labelledby="data-import-confirm-title"
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="data-import-confirm-title">{texts.confirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{texts.confirmHelp}</DialogContentText>
          {importState.kind === 'preview' ? (
            <>
              {importState.preview.version === 1 && (
                <DialogContentText>{texts.legacyHelp}</DialogContentText>
              )}
              <AccountCounts result={importState.preview} />
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setConfirming(false)}>{texts.cancel}</Button>
          <Button variant="contained" onClick={() => void confirmImport()}>
            {texts.confirmButton}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function AccountCounts({
  result,
  linkToContent = false,
}: {
  result: ImportResult
  linkToContent?: boolean
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
        width: '100%',
        gap: 1.5,
      }}
    >
      <CountList counts={result.counts} label={texts.total} />
      {SPACES.map((space) => (
        <CountList
          key={space}
          counts={result.countsBySpace[space]}
          label={SPACE_LABELS[space]}
          linkSpace={linkToContent ? space : undefined}
        />
      ))}
    </Box>
  )
}

function CountList({
  counts,
  label,
  linkSpace,
}: {
  counts: ImportCounts
  label: string
  linkSpace?: Space
}) {
  return (
    <Box>
      <Typography variant="subtitle2">{label}</Typography>
      <Box component="ul" aria-label={label} sx={{ m: 0, pl: 2.5 }}>
        {COUNT_LABELS.map((item) => (
          <li key={item.key}>
            {item.label}: {counts[item.key]}
            {linkSpace && item.to !== null && counts[item.key] > 0 && (
              <>
                {' · '}
                <Link
                  component={RouterLink}
                  to={spaceHref(item.to, linkSpace)}
                  aria-label={`Ver en ${item.link} (${SPACE_LABELS[linkSpace]})`}
                >
                  Ver en {item.link}
                </Link>
              </>
            )}
          </li>
        ))}
      </Box>
    </Box>
  )
}
