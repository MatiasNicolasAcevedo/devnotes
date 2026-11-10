import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { authQueryKeys, type AuthUser } from '../auth/api'
import { useSession } from '../auth/sessionContext'
import { sessionEvents } from '../../services/sessionEvents'
import { voiceQueryKeys } from './api'
import { useVoiceDraft } from './useVoiceDraft'
import { useVoiceRecorder } from './useVoiceRecorder'
import { useVoiceCapabilities } from './useVoiceNotes'
import { VoiceDraftContext } from './voiceDraftContext'

/** El shell monta una instancia por identidad, por encima de ambas guardias y del outlet. */
export function VoiceDraftProvider({
  owner,
  active = true,
  children,
}: {
  owner?: string
  active?: boolean
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const { logoutPending } = useSession()
  const mounted = useRef(true)
  const [pageEpoch, setPageEpoch] = useState(0)
  useLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const sessionIsCurrent = useCallback(
    () =>
      mounted.current &&
      (queryClient.getQueryData<AuthUser | null>(authQueryKeys.session)?.id ?? '') === owner,
    [owner, queryClient],
  )
  const draft = useVoiceDraft(owner === undefined ? undefined : sessionIsCurrent)
  const { data: capabilities } = useVoiceCapabilities(active && !logoutPending)
  const recorder = useVoiceRecorder({
    maxDurationSeconds: capabilities?.maxDurationSeconds,
    maxAudioBytes: capabilities?.maxAudioBytes,
    mimeTypes: capabilities?.mimeTypes,
  })
  const { cancel, consumeResult, result, state: recorderState, stop } = recorder
  const { clearAudio, reset, setCaptureState, transcribe } = draft
  const autoTranscribe = useRef(false)
  const consumedGeneration = useRef<number | null>(null)

  const stopAndTranscribe = () => {
    autoTranscribe.current = true
    void stop()
  }

  const stopForNavigation = useCallback(() => {
    autoTranscribe.current = false
    if (recorderState === 'recording') void stop()
    if (recorderState === 'requesting') cancel()
    if (draft.state.captureState === 'stopping') clearAudio(false)
  }, [cancel, clearAudio, draft.state.captureState, recorderState, stop])

  const discard = useCallback(() => {
    autoTranscribe.current = false
    cancel()
    reset()
  }, [cancel, reset])

  useLayoutEffect(() => {
    const unsubscribeLogout = sessionEvents.onLogoutStarted(() => {
      autoTranscribe.current = false
      cancel()
      clearAudio()
    })
    const unsubscribeUnauthorized = sessionEvents.onUnauthorized(discard)
    return () => {
      unsubscribeLogout()
      unsubscribeUnauthorized()
    }
  }, [cancel, clearAudio, discard])

  useLayoutEffect(() => {
    if (!logoutPending) return
    autoTranscribe.current = false
    clearAudio()
  }, [clearAudio, logoutPending])

  useEffect(() => {
    if (!result || consumedGeneration.current === result.generation) return
    consumedGeneration.current = result.generation
    consumeResult()
    const send = autoTranscribe.current && active && !document.hidden && !logoutPending
    autoTranscribe.current = false
    if (logoutPending) return
    if (send) transcribe(result)
    else setCaptureState('idle', result, null)
  }, [active, consumeResult, logoutPending, result, setCaptureState, transcribe])

  const capturePending =
    recorderState === 'requesting' || recorderState === 'recording' || recorderState === 'stopping'
  const audioPending = capturePending || result != null || draft.state.captureResult != null
  const unloadPending = draft.isDirty || draft.state.documentState === 'saving' || audioPending

  useEffect(() => {
    if (!unloadPending) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unloadPending])

  useEffect(() => {
    const handlePageHide = () => {
      discard()
      setPageEpoch((value) => value + 1)
      void queryClient.cancelQueries({ queryKey: voiceQueryKeys.all })
    }
    const handleVisibilityChange = () => {
      if (document.hidden) autoTranscribe.current = false
    }
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [discard, queryClient])

  return (
    <VoiceDraftContext
      value={{
        draft,
        recorder,
        capabilities,
        pending: draft.isDirty || draft.isBusy || audioPending,
        pageEpoch,
        stopAndTranscribe,
        stopForNavigation,
        discard,
      }}
    >
      {children}
    </VoiceDraftContext>
  )
}
