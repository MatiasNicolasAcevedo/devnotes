import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useSession } from '../auth/sessionContext'
import { useOptionalDailyDraftContext } from '../daily/DailyDraftProvider'
import { formatDateLocal } from '../daily/dateUtils'
import { voiceNoteTextSchema, type SaveOutcome } from '../voice/useVoiceDraft'
import { useVoiceDraftContext } from '../voice/voiceDraftContext'
import { readSpaceParam, searchWithSpace, SPACE_LABELS, SPACES, type Space } from './space'
import { useSpaceContext } from './spaceContext'

/**
 * Qué impide hoy completar el cambio de espacio. El orden es la tabla de S-109 «Cambio seguro de espacio»: primero lo
 * que no se puede interrumpir (importación, versión), después el diario (flush hasta ACK) y por último la voz
 * (captura detenida sin transcribir y diálogo de cambios).
 */
export type SpaceTransitionStep =
  'locked' | 'version' | 'daily-flush' | 'daily-failed' | 'voice-stop' | 'voice-confirm' | 'commit'

/**
 * Coordinador único de transición entre espacios (S-109). Cubre enlaces, Atrás/Adelante, rutas escritas a mano y el
 * futuro selector: todos cambian la URL y llegan aquí con la misma decisión. Mientras el destino no se confirma, el
 * espacio del contexto sigue siendo el de origen, con su borrador, su cola y sus keys; el destino no se monta ni lee
 * nada. Una URL sin espacio espera su canonicalización; una inválida muestra «Espacio no válido» y nunca carga ni
 * escribe en ningún espacio.
 */
export function SpaceNavigation({
  children,
  navigationRoot,
}: {
  children: ReactNode
  navigationRoot?: RefObject<HTMLDivElement | null>
}) {
  const ctx = useSpaceContext()
  const daily = useOptionalDailyDraftContext()
  const voice = useVoiceDraftContext()
  const { csrfReady, logoutPending } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const { requested, space: origin, commit, lockReason } = ctx

  const target =
    requested?.kind === 'valid' && origin !== null && requested.space !== origin
      ? requested.space
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

  // Sin guardias pendientes: se confirma antes de pintar, para que el destino nunca vea el contexto del origen.
  useLayoutEffect(() => {
    if (step === 'commit' && target) commit(target)
  }, [step, target, commit])

  const [blockedNotice, setBlockedNotice] = useState<string | null>(null)
  if (blockedNotice && !lockReason) setBlockedNotice(null)
  useEffect(() => {
    const root = navigationRoot?.current
    if (!root || !lockReason || origin === null) return
    // Un enlace a otro espacio desmontaría la operación en curso: se queda aquí y se explica por qué.
    const captureNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return
      const destination = new URL(link.href)
      if (destination.origin !== window.location.origin) return
      const param = readSpaceParam(destination.search)
      if (param.kind === 'valid' && param.space === origin) return
      event.preventDefault()
      event.stopPropagation()
      setBlockedNotice(lockReason)
    }
    root.addEventListener('click', captureNavigation, true)
    return () => root.removeEventListener('click', captureNavigation, true)
  }, [navigationRoot, lockReason, origin])

  const backToOrigin = () => void navigate(ctx.originHref(), { replace: true })

  if (!ctx.owner || requested === null) {
    return (
      <>
        {blockedNotice && <LockNotice reason={blockedNotice} />}
        {children}
      </>
    )
  }

  if (requested.kind === 'invalid') {
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

  if (requested.kind === 'missing' || origin === null) return <Busy text="Abriendo espacio…" />
  if (!target || !step) return children

  const from = SPACE_LABELS[origin]
  const to = SPACE_LABELS[target]
  const back = <Button onClick={backToOrigin}>Volver a {from}</Button>

  switch (step) {
    case 'locked':
      return (
        <Alert severity="info" role="status">
          {lockReason} El cambio a {to} espera a que termine.
          <Actions>{back}</Actions>
        </Alert>
      )
    case 'version':
      return (
        <Alert severity="info" role="status">
          Se está guardando una versión de la nota del {formatDateLocal(daily!.activeDate)} en{' '}
          {from}. El cambio a {to} espera su resultado.
          <Actions>{back}</Actions>
        </Alert>
      )
    case 'daily-flush':
      return (
        <Busy
          text={`Guardando la nota del ${formatDateLocal(daily!.activeDate)} en ${from} antes de cambiar a ${to}…`}
        />
      )
    case 'daily-failed':
      return (
        <Alert severity="warning" role="alert">
          No se pudo guardar la nota del {formatDateLocal(daily!.activeDate)} en {from}. El borrador
          se conserva en {from} y el cambio a {to} no se hizo.
          <Actions>
            {back}
            <Button onClick={() => setDailyFailed(false)}>Reintentar</Button>
          </Actions>
        </Alert>
      )
    case 'voice-stop':
      return <Busy text="Deteniendo la grabación sin transcribir…" />
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
      return (
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
        </Alert>
      )
    }
    case 'commit':
      return <Busy text={`Abriendo ${to}…`} />
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
      {reason} No se puede cambiar de espacio hasta que termine.
    </Alert>
  )
}
