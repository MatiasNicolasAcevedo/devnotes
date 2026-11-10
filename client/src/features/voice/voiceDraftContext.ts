import { createContext, useContext, type ContextType } from 'react'
import type { useVoiceDraft } from './useVoiceDraft'
import type { useVoiceRecorder } from './useVoiceRecorder'
import type { useVoiceCapabilities } from './useVoiceNotes'

export const VoiceDraftContext = createContext<{
  draft: ReturnType<typeof useVoiceDraft>
  recorder: ReturnType<typeof useVoiceRecorder>
  capabilities: ReturnType<typeof useVoiceCapabilities>['data']
  pending: boolean
  pageEpoch: number
  stopAndTranscribe: () => void
  stopForNavigation: () => void
  discard: () => void
} | null>(null)

export function useVoiceDraftContext(): NonNullable<ContextType<typeof VoiceDraftContext>> {
  const workspace = useContext(VoiceDraftContext)
  if (!workspace) throw new Error('useVoiceDraftContext requiere VoiceDraftProvider')
  return workspace
}
