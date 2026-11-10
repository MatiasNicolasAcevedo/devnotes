import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { useSession } from '../auth/sessionContext'
import { voiceNoteTextSchema } from './useVoiceDraft'
import { useVoiceDraftContext } from './voiceDraftContext'

export function VoiceDraftNavigation({
  children,
}: {
  children: (outletOverride: ReactNode, bypassDailyLinks: boolean) => ReactNode
}) {
  const { user, csrfReady, logoutPending } = useSession()
  const { draft, recorder, pending, stopForNavigation, discard } = useVoiceDraftContext()
  const location = useLocation()
  const navigate = useNavigate()
  const onVoice = matchPath('/voice', location.pathname) != null
  const voiceLocation = useRef(location)
  const [heldCapture, setHeldCapture] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)
  const hasCapture = recorder.state === 'recording' || recorder.state === 'requesting'
  const [wasOnVoice, setWasOnVoice] = useState(onVoice)
  if (onVoice !== wasOnVoice) {
    setWasOnVoice(onVoice)
    setHeldCapture(!onVoice && hasCapture)
    setSaveError(false)
  }
  if (logoutPending && heldCapture) setHeldCapture(false)
  const blocked = !!user && !onVoice && (pending || heldCapture)

  useLayoutEffect(() => {
    if (onVoice) voiceLocation.current = location
    else if (blocked && !logoutPending) stopForNavigation()
  }, [blocked, location, logoutPending, onVoice, stopForNavigation])

  useEffect(() => {
    const clearHold = () => {
      setHeldCapture(false)
      setSaveError(false)
    }
    window.addEventListener('pagehide', clearHold)
    return () => window.removeEventListener('pagehide', clearHold)
  }, [])

  const returnToVoice = () => {
    const { pathname, search, hash, state } = voiceLocation.current
    void navigate({ pathname, search, hash }, { state, replace: true })
  }

  const discardAndContinue = () => {
    discard()
    setHeldCapture(false)
    setSaveError(false)
  }

  const saveAndContinue = async () => {
    setSaving(true)
    setSaveError(false)
    const outcome = await draft.save()
    setSaving(false)
    if (outcome === 'saved') setHeldCapture(false)
    else if (outcome !== 'stale') setSaveError(true)
  }

  if (!blocked) {
    const voiceFirst = onVoice && !!user && pending && !logoutPending
    return children(undefined, voiceFirst)
  }

  const writing =
    logoutPending ||
    saving ||
    draft.state.documentState === 'saving' ||
    draft.state.documentState === 'deleting'
  const canSave =
    csrfReady &&
    !writing &&
    !hasCapture &&
    !draft.state.captureResult &&
    voiceNoteTextSchema.safeParse(draft.state.text).success

  return children(
    <Alert severity="warning">
      Hay cambios pendientes en la nota de voz.
      {saveError && ' No se pudieron guardar los cambios. Tu borrador se conserva.'}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button onClick={returnToVoice} disabled={saving}>
          Volver a voz
        </Button>
        <Button onClick={() => void saveAndContinue()} disabled={!canSave}>
          {saving ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
        <Button onClick={discardAndContinue} disabled={writing}>
          Descartar y continuar
        </Button>
      </Stack>
    </Alert>,
    true,
  )
}
