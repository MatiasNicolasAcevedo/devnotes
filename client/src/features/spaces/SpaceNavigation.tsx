import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  matchPath,
  NavigationType,
  type Location,
  useBlocker,
  useLocation,
  useNavigate,
  type BlockerFunction,
} from 'react-router'
import { useSession } from '../auth/sessionContext'
import { useOptionalDailyDraftContext } from '../daily/DailyDraftProvider'
import { FreeNoteExitDialog } from '../free-notes/FreeNoteExitDialog'
import { useFreeNotesContext } from '../free-notes/freeNotesContext'
import { DiscardImageChanges } from '../ocr/DiscardImageChanges'
import { ImageDraftContext } from '../ocr/imageDraftContext'
import { formatDateLocal } from '../daily/dateUtils'
import { voiceNoteTextSchema, type SaveOutcome } from '../voice/useVoiceDraft'
import { useVoiceDraftContext } from '../voice/voiceDraftContext'
import {
  readSpaceParam,
  searchWithSpace,
  SPACE_LABELS,
  SPACE_SELECTOR_INTENT,
  SPACES,
  type Space,
} from './space'
import { useSpaceContext } from './spaceContext'

/**
 * Qué impide hoy completar el cambio de espacio. El orden es la tabla de S-109 «Cambio seguro de espacio»: primero lo
 * que no se puede interrumpir (importación, versión), después el diario (flush hasta ACK) y por último la voz
 * (captura detenida sin transcribir y diálogo de cambios).
 */
export type SpaceTransitionStep =
  'locked' | 'version' | 'daily-flush' | 'daily-failed' | 'voice-stop' | 'voice-confirm' | 'commit'

/**
 * Coordinador único de transición entre espacios (S-109). Retiene la navegación del selector antes de publicar
 * su URL y protege el resultado de Datos durante la importación. Conserva el espacio confirmado y sus borradores
 * hasta resolver las guardias, también al llegar a una URL de otro espacio por el historial.
 */
export function SpaceNavigation({ children }: { children: ReactNode }) {
  const ctx = useSpaceContext()
  const daily = useOptionalDailyDraftContext()
  const voice = useVoiceDraftContext()
  const { csrfReady, logoutPending } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const { requested, space: origin, commit, lockReason } = ctx

  const freeDraft = useFreeNotesContext()?.draft
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null)
  if (blockedNotice && !lockReason && !freeDraft?.busy) setBlockedNotice(null)
  const { imageEdited } = useContext(ImageDraftContext)
  const leavesImageDraft = useCallback(
    (next: Location) => {
      if (!imageEdited || !ctx.owner) return false
      const destination = readSpaceParam(next.search)
      return (
        !matchPath('/image', next.pathname) ||
        destination.kind !== 'valid' ||
        destination.space !== origin
      )
    },
    [ctx.owner, imageEdited, origin],
  )
  const leavesFreeDraft = useCallback(
    (current: Location, next: Location) => {
      if (!freeDraft || !ctx.owner) return false
      const destination = readSpaceParam(next.search)
      return (
        next.pathname !== current.pathname ||
        (destination.kind !== 'missing' &&
          (destination.kind !== 'valid' || destination.space !== origin))
      )
    },
    [ctx.owner, freeDraft, origin],
  )
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation, historyAction }) => {
      if (ctx.owner && lockReason && currentLocation.pathname !== nextLocation.pathname) {
        setBlockedNotice(lockReason)
        return true
      }
      if (leavesFreeDraft(currentLocation, nextLocation)) {
        if (freeDraft?.busy) setBlockedNotice('Se está guardando la nota libre.')
        return true
      }
      if (leavesImageDraft(nextLocation)) return true
      return (
        ctx.owner !== '' &&
        origin !== null &&
        historyAction === NavigationType.Push &&
        nextLocation.state === SPACE_SELECTOR_INTENT
      )
    },
    [ctx.owner, freeDraft?.busy, leavesFreeDraft, leavesImageDraft, lockReason, origin],
  )
  const blocker = useBlocker(shouldBlock)
  const confirmImageExit =
    blocker.state === 'blocked' && !blockedNotice && leavesImageDraft(blocker.location)
  const confirmFreeExit =
    blocker.state === 'blocked' && !blockedNotice && leavesFreeDraft(location, blocker.location)
  const selectorIntent =
    blocker.state === 'blocked' &&
    !confirmImageExit &&
    !confirmFreeExit &&
    blocker.location.state === SPACE_SELECTOR_INTENT
      ? readSpaceParam(blocker.location.search)
      : null
  const keepingOrigin = selectorIntent?.kind === 'valid' && !blockedNotice
  const destination = keepingOrigin ? selectorIntent : requested
  const target =
    destination?.kind === 'valid' && origin !== null && destination.space !== origin
      ? destination.space
      : null

  // Estados de un intento: se reinician al cambiar de destino (incluido volver al origen).
  const [attemptTarget, setAttemptTarget] = useState(target)
  const [dailyFailed, setDailyFailed] = useState(false)
  const [voiceSaving, setVoiceSaving] = useState(false)
  const [voiceOutcome, setVoiceOutcome] = useState<SaveOutcome | null>(null)
  if (attemptTarget !== target) {
    setAttemptTarget(target)
    setDailyFailed(false)
    setVoiceOutcome(null)
  }

  const { draft, recorder } = voice
  const voiceCapturing =
    recorder.state === 'requesting' ||
    recorder.state === 'recording' ||
    recorder.state === 'stopping' ||
    draft.state.captureState === 'stopping'
  const dailyPending = !!daily && (daily.isDirty || daily.isSaving)

  let step: SpaceTransitionStep | null = null
  if (target) {
    if (lockReason) step = 'locked'
    else if (daily?.navigationLocked) step = 'version'
    else if (dailyPending) step = dailyFailed ? 'daily-failed' : 'daily-flush'
    else if (voiceCapturing) step = 'voice-stop'
    else if (voice.pending || voiceSaving) step = 'voice-confirm'
    else step = 'commit'
  }

  // Diario dirty/guardando: un solo flush por intento; el origen se conserva hasta el ACK.
  const flushing = useRef(false)
  useEffect(() => {
    if (step !== 'daily-flush' || !daily || flushing.current) return
    flushing.current = true
    daily
      .flush()
      .catch(() => setDailyFailed(true))
      .finally(() => {
        flushing.current = false
      })
  }, [step, daily])

  // Grabación o transcripción en curso: se detiene sin transcribir ni enviar nada a Groq.
  const { stopForNavigation } = voice
  useEffect(() => {
    if (step === 'voice-stop') stopForNavigation()
  }, [step, stopForNavigation])

  // Tras las guardias del selector, publicar la URL. Luego confirmar el espacio antes de pintar el destino.
  useLayoutEffect(() => {
    if (step !== 'commit' || !target) return
    if (keepingOrigin && blocker.state === 'blocked') blocker.proceed()
    else commit(target)
  }, [step, target, commit, keepingOrigin, blocker])

  useEffect(() => {
    if (blocker.state === 'blocked' && blockedNotice) blocker.reset()
  }, [blocker, blockedNotice])

  const backToOrigin = () => {
    if (keepingOrigin && blocker.state === 'blocked') blocker.reset()
    else void navigate(ctx.originHref(), { replace: true })
  }
  // La pantalla de origen conserva su posición en el árbol al agregar o quitar el aviso.
  const withOrigin = (notice?: ReactNode) => (
    <>
      {notice}
      {children}
    </>
  )
  if (confirmFreeExit && freeDraft && blocker.state === 'blocked')
    return withOrigin(
      <FreeNoteExitDialog draft={freeDraft} cancel={blocker.reset} proceed={blocker.proceed} />,
    )
  if (confirmImageExit && blocker.state === 'blocked')
    return withOrigin(<DiscardImageChanges cancel={blocker.reset} discard={blocker.proceed} />)

  if ((!ctx.owner || requested === null) && !keepingOrigin)
    return withOrigin(blockedNotice ? <LockNotice reason={blockedNotice} /> : undefined)

  if (requested?.kind === 'invalid' && !keepingOrigin) {
    const open = (space: Space) =>
      void navigate(
        {
          pathname: location.pathname,
          search: searchWithSpace(location.search, space),
          hash: location.hash,
        },
        { replace: true },
      )
    return (
      <Alert severity="error">
        <AlertTitle component="h1">Espacio no válido</AlertTitle>
        <Typography>
          La dirección no corresponde a Trabajo ni a Personal. No se abrió ni se guardó nada. Elegí
          dónde continuar.
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
          {SPACES.map((space) => (
            <Button key={space} variant="outlined" onClick={() => open(space)}>
              Abrir {SPACE_LABELS[space]}
            </Button>
          ))}
        </Stack>
      </Alert>
    )
  }

  if (requested?.kind === 'missing' || (!keepingOrigin && origin === null))
    return <Busy text="Abriendo espacio…" />
  if (!origin || !target || !step) return withOrigin()

  const showGuard = (notice: ReactNode) => (keepingOrigin ? withOrigin(notice) : notice)
  const from = SPACE_LABELS[origin]
  const to = SPACE_LABELS[target]
  const back = <Button onClick={backToOrigin}>Volver a {from}</Button>

  switch (step) {
    case 'locked':
      return showGuard(
        <Alert severity="info" role="status">
          {lockReason} El cambio a {to} espera a que termine.
          <Actions>{back}</Actions>
        </Alert>,
      )
    case 'version':
      return showGuard(
        <Alert severity="info" role="status">
          {daily?.isCopyingPrevious
            ? `Se está copiando la nota anterior al ${formatDateLocal(daily.activeDate)} en ${from}.`
            : `Se está guardando una versión de la nota del ${formatDateLocal(daily!.activeDate)} en ${from}.`}{' '}
          El cambio a {to} espera su resultado.
          <Actions>{back}</Actions>
        </Alert>,
      )
    case 'daily-flush':
      return showGuard(
        <Busy
          text={`Guardando la nota del ${formatDateLocal(daily!.activeDate)} en ${from} antes de cambiar a ${to}…`}
        />,
      )
    case 'daily-failed':
      return showGuard(
        <Alert severity="warning" role="alert">
          No se pudo guardar la nota del {formatDateLocal(daily!.activeDate)} en {from}. El borrador
          se conserva en {from} y el cambio a {to} no se hizo.
          <Actions>
            {back}
            <Button onClick={() => setDailyFailed(false)}>Reintentar</Button>
          </Actions>
        </Alert>,
      )
    case 'voice-stop':
      return showGuard(<Busy text="Deteniendo la grabación sin transcribir…" />)
    case 'voice-confirm': {
      const audioPending = draft.state.captureResult != null
      const writing =
        logoutPending ||
        voiceSaving ||
        draft.state.documentState === 'saving' ||
        draft.state.documentState === 'deleting'
      const canSave =
        csrfReady &&
        !writing &&
        !audioPending &&
        draft.isDirty &&
        voiceNoteTextSchema.safeParse(draft.state.text).success
      const saveAndSwitch = async () => {
        setVoiceSaving(true)
        setVoiceOutcome(null)
        const outcome = await draft.save()
        setVoiceSaving(false)
        if (outcome !== 'saved') setVoiceOutcome(outcome)
      }
      return showGuard(
        <Alert severity="warning" role="alert">
          <AlertTitle>Hay cambios sin guardar en la nota de voz de {from}</AlertTitle>
          {audioPending &&
            'El audio pendiente se perderá si descartás. Para transcribirlo, seguí aquí. '}
          {voiceOutcome &&
            voiceOutcome !== 'stale' &&
            `No se pudieron guardar los cambios${voiceOutcome === 'conflict' ? ' porque la nota cambió en otro lugar' : ''}. Tu borrador se conserva en ${from}.`}
          <Actions>
            <Button onClick={() => void saveAndSwitch()} disabled={!canSave}>
              {voiceSaving ? 'Guardando…' : 'Guardar y cambiar'}
            </Button>
            <Button onClick={voice.discard} disabled={writing}>
              Descartar y cambiar
            </Button>
            <Button onClick={backToOrigin} disabled={voiceSaving}>
              Seguir aquí
            </Button>
          </Actions>
        </Alert>,
      )
    }
    case 'commit':
      return showGuard(<Busy text={`Abriendo ${to}…`} />)
  }
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
      {children}
    </Stack>
  )
}

function Busy({ text }: { text: string }) {
  return (
    <Stack direction="row" spacing={1.5} role="status" sx={{ alignItems: 'center' }}>
      <CircularProgress size={20} aria-hidden />
      <Typography>{text}</Typography>
    </Stack>
  )
}

function LockNotice({ reason }: { reason: string }) {
  return (
    <Alert severity="info" role="status">
      {reason} No se puede salir de Datos ni cambiar de espacio hasta que termine.
    </Alert>
  )
}
