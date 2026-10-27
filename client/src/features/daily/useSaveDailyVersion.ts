import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../services/http'
import { getDailyVersion, saveDailyVersion, dailyVersionKeys } from './versionApi'
import type { UseDailyNoteReturn } from './useDailyNote'

// ——— Tipos ———

export type SaveVersionPhase =
  'idle' | 'checking' | 'confirming' | 'saving' | 'success' | 'error' | 'conflict' | 'unknown'

export interface UseSaveDailyVersionReturn {
  /** true mientras se consulta/confirmación/flush+POST; el editor debe bloquearse. */
  isLocked: boolean
  /** Fase actual de la operación. */
  phase: SaveVersionPhase
  /** Error activo (si phase es error/conflict). */
  error: ApiError | null
  /** Abre el flujo: consulta versión existente y, si no hay, ejecuta directamente. */
  handleClick: () => void
  /** Confirma el reemplazo tras la consulta previa (200). */
  handleConfirm: () => void
  /** Cancela la confirmación; no modifica la copia. */
  handleCancel: () => void
  /** Reintenta desde cero tras error/conflict/unknown. */
  handleRetry: () => void
  /** true si se muestra el diálogo de confirmación. */
  showConfirmDialog: boolean
  /** Fecha formateada para el diálogo de confirmación. */
  confirmDate: string | null
}

/**
 * Hook que coordina la secuencia de guardar versión manual (S-104 v2).
 *
 * 1. Click → consultar versión propia (200/404/error).
 * 2. 200 → diálogo de confirmación; 404 → ejecutar directamente; error → bloquear.
 * 3. Al confirmar → flush({ force }) + POST con revisión confirmada.
 * 4. Invalidar queries de identidad iniciadora.
 */
export function useSaveDailyVersion({
  owner,
  date,
  note,
  sessionIsCurrent,
  onLockChange,
}: {
  owner: string
  date: string
  note: Pick<UseDailyNoteReturn, 'flush' | 'revision' | 'getRevision'>
  sessionIsCurrent?: () => boolean
  onLockChange?: (locked: boolean) => void
}): UseSaveDailyVersionReturn {
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<SaveVersionPhase>('idle')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmDate, setConfirmDate] = useState<string | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const mountedRef = useRef(true)
  const savingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (!savingRef.current) onLockChange?.(false)
    }
  }, [onLockChange])

  const isLocked = phase === 'checking' || phase === 'confirming' || phase === 'saving'

  // ——— Ejecutar flush + POST ———
  const executeSave = useCallback(async () => {
    savingRef.current = true
    setPhase('saving')
    setError(null)

    try {
      await note.flush({ force: true })
      await saveDailyVersion(owner, date, note.getRevision())

      const keys = dailyVersionKeys(owner)
      await queryClient.invalidateQueries({ queryKey: keys.detail(date) })
      await queryClient.invalidateQueries({ queryKey: keys.list() })

      if (sessionIsCurrent && !sessionIsCurrent()) {
        setPhase('unknown')
        return
      }

      setPhase('success')
    } catch (err) {
      const apiErr = err as ApiError | null
      if (apiErr && apiErr.status === 409) {
        setError(apiErr)
        setPhase('conflict')
        return
      }
      if (apiErr && apiErr.status === 403) {
        setError(apiErr)
        setPhase('error')
        return
      }
      if (apiErr) {
        setError(apiErr)
      }
      setPhase('unknown')
    } finally {
      savingRef.current = false
      onLockChange?.(false)
    }
  }, [owner, date, note, queryClient, sessionIsCurrent, onLockChange])

  // ——— Consultar versión existente ———
  const checkExisting = useCallback(async () => {
    onLockChange?.(true)
    setPhase('checking')
    setError(null)
    try {
      await getDailyVersion(date, undefined, sessionIsCurrent)
      if (!mountedRef.current) return
      setConfirmDate(date)
      setPhase('confirming')
      setShowConfirmDialog(true)
    } catch (err) {
      if (!mountedRef.current) return
      const apiErr = err as ApiError | null
      if (apiErr && apiErr.status === 404) {
        setConfirmDate(null)
        setPhase('idle')
        executeSave()
      } else {
        onLockChange?.(false)
        setError(apiErr ?? null)
        setPhase('error')
      }
    }
  }, [date, sessionIsCurrent, executeSave, onLockChange])

  const handleClick = useCallback(() => {
    if (isLocked) return
    checkExisting()
  }, [isLocked, checkExisting])

  const handleConfirm = useCallback(() => {
    setShowConfirmDialog(false)
    executeSave()
  }, [executeSave])

  const handleCancel = useCallback(() => {
    onLockChange?.(false)
    setShowConfirmDialog(false)
    setPhase('idle')
    setError(null)
  }, [onLockChange])

  const handleRetry = useCallback(() => {
    setError(null)
    setPhase('idle')
  }, [])

  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(() => {
        setPhase('idle')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [phase])

  return {
    isLocked,
    phase,
    error,
    handleClick,
    handleConfirm,
    handleCancel,
    handleRetry,
    showConfirmDialog,
    confirmDate,
  }
}
