import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDailyNoteQuery, invalidateDailyNote } from './useDailyNoteQuery'
import { copyPreviousDailyNote, dailyNoteKeys, isCopySourceConflict, saveDailyNote } from './api'
import type { DailyNoteDetail, PreviousDailyNote } from './api'
import { emptyDocument, isEmptyDailyDocument, validateDailyContent } from './editor/dailyDocument'
import type { DailyContent } from './editor/dailyDocument'
import { ApiError } from '../../services/http'
import type { Space } from '../spaces/space'

// ——— Tipos internos ———

/** Identificador monótono de generación local; cada edición válida lo incrementa. */
type Generation = number

/** Estado de la cola de escritura. */
type QueueState = 'idle' | 'flushing'

interface DraftEntry {
  content: DailyContent
  generation: Generation
}

export interface ConfirmedCopy {
  sourceDate: string
  note: DailyNoteDetail
}

export interface CopyTargetRecovery {
  minimumRevision: number
}

// ——— Estado público del hook ———

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unconfirmed' | 'error' | 'conflict'

export interface UseDailyNoteReturn {
  isLoading: boolean
  /** Revisión síncrona del último ACK, disponible al resolver flush. */
  getRevision: () => number
  /** Documento actual (borrador dirty o remoto confirmado). */
  content: DailyContent
  /** Revisión confirmada por el servidor (0 si no hay nota remota). */
  revision: number
  /** Estado de guardado para indicadores UI. */
  status: SaveStatus
  /** Error activo (si status === 'error' | 'conflict'). */
  error: ApiError | null
  /** true si hay borrador sin confirmar. */
  isDirty: boolean
  /** true mientras hay PUT en vuelo. */
  isSaving: boolean
  canCopyPrevious: boolean
  isCopyingPrevious: boolean
  isReloadingCopyTarget: boolean
  copyTargetNeedsReload: boolean
  confirmedCopy: ConfirmedCopy | null
  copyPrevious: (
    source: PreviousDailyNote,
    expectedRevision: number,
    isCurrent: () => boolean,
  ) => Promise<boolean>
  reloadCopyTarget: (isCurrent: () => boolean) => Promise<boolean>
  /**
   * Edita el contenido. Si es válido, actualiza borrador y programa debounce.
   * Si es inválido, conserva el texto y no envía.
   */
  edit: (newContent: unknown) => void
  /** Reintenta la última escritura fallida. */
  retry: () => void
  /**
   * Espera a que se complete la última escritura programada.
   * Si force es true, permite persistir el vacío explícito.
   * Resuelve cuando la cola está vacía o rechaza con el error.
   */
  flush: (options?: { force?: boolean }) => Promise<void>
  /**
   * Descarta el borrador local y recarga el estado remoto.
   * Espera cualquier PUT en vuelo antes de recargar.
   */
  discard: () => Promise<void>
}

// ——— Constantes ———

const DEFAULT_DEBOUNCE_MS = 700

/** Permite inyectar un debounce más corto en pruebas. */
let testDebounceMs: number | undefined

export function setTestDebounce(ms: number | undefined) {
  testDebounceMs = ms
}

function getDebounceMs(): number {
  return testDebounceMs ?? DEFAULT_DEBOUNCE_MS
}

// ——— Hook ———

/**
 * Coordinador de borrador y cola de guardado por identidad/espacio/fecha.
 *
 * - Debounce 700 ms tras última edición válida.
 * - Cola serial: una escritura en vuelo por documento.
 * - Snapshot + generación local; ACK confirma solo esa generación.
 * - Si hubo ediciones posteriores, envía la última con revisión confirmada.
 * - Refetch no pisa dirty.
 * - 409 detiene cola y retiene texto.
 * - Reintento explícito; sin retries automáticos.
 * - GET 404 → vacío + revision 0, sin PUT automático.
 */
export function useDailyNote(
  owner: string,
  space: Space,
  date: string,
  copyRecovery: CopyTargetRecovery | undefined,
  setCopyRecovery: (recovery: CopyTargetRecovery | undefined) => void,
  sessionIsCurrent?: () => boolean,
): UseDailyNoteReturn {
  const queryClient = useQueryClient()
  // ——— Query de lectura ———
  const query = useDailyNoteQuery(owner, space, date, sessionIsCurrent)

  // ——— Estado local ———
  const [draft, setDraft] = useState<DraftEntry | null>(null)
  const [confirmedRevision, setConfirmedRevision] = useState<number>(0)
  const [confirmedContent, setConfirmedContent] = useState<DailyContent>(emptyDocument())
  const [queueState, setQueueState] = useState<QueueState>('idle')
  const [error, setError] = useState<ApiError | null>(null)
  const [isCopyingPrevious, setCopyingPrevious] = useState(false)
  const [isReloadingCopyTarget, setReloadingCopyTarget] = useState(false)
  const [recoveryOnMount] = useState(copyRecovery)
  const copyTargetNeedsReload = copyRecovery !== undefined
  const [confirmedCopy, setConfirmedCopy] = useState<ConfirmedCopy | null>(null)

  // Referencias mutables para evitar closures stale en el debounce y la cola.
  const draftRef = useRef<DraftEntry | null>(null)
  const revisionRef = useRef<number>(0)
  const queueRef = useRef<QueueState>('idle')
  const generationRef = useRef<Generation>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushersRef = useRef<Array<{ resolve: () => void; reject: (e: unknown) => void }>>([])
  const forceRef = useRef<boolean>(false)
  const copyingRef = useRef(false)
  const reloadTargetRef = useRef(false)

  // Sincronizar refs con estado.
  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    revisionRef.current = confirmedRevision
  }, [confirmedRevision])

  useEffect(() => {
    queueRef.current = queueState
  }, [queueState])

  // ——— Limpiar timer al desmontar ———
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  // ——— Sincronizar remoto → confirmado (sin pisar dirty) ———
  const { data: remote, error: readError, isFetchedAfterMount, isFetching, isSuccess } = query
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // El editor conserva el documento previo hasta poder aplicar la copia como un undo.
    if (isCopyingPrevious || copyingRef.current) return
    if (copyRecovery) {
      // Al volver, solo una lectura terminada de esta visita puede resolver la copia.
      if (
        copyRecovery !== recoveryOnMount ||
        !isFetchedAfterMount ||
        isFetching ||
        reloadTargetRef.current
      )
        return
      if (isSuccess && remote.revision >= copyRecovery.minimumRevision) {
        revisionRef.current = remote.revision
        setConfirmedContent(remote.content)
        setConfirmedRevision(remote.revision)
        setCopyRecovery(undefined)
      } else if (
        readError instanceof ApiError &&
        readError.status === 404 &&
        copyRecovery.minimumRevision === 0
      ) {
        setCopyRecovery(undefined)
      }
      return
    }
    if (remote && remote.revision > confirmedRevision) {
      revisionRef.current = remote.revision
      setConfirmedContent(remote.content)
      setConfirmedRevision(remote.revision)
    }
  }, [
    remote,
    readError,
    isFetchedAfterMount,
    isFetching,
    isSuccess,
    confirmedRevision,
    isCopyingPrevious,
    copyRecovery,
    recoveryOnMount,
    setCopyRecovery,
  ])
  /* eslint-enable react-hooks/set-state-in-effect */

  const confirmWrite = useCallback((response: DailyNoteDetail) => {
    revisionRef.current = response.revision
    setConfirmedRevision(response.revision)
    setConfirmedContent(response.content)
    setError(null)
  }, [])

  const canCopyPrevious =
    !copyTargetNeedsReload &&
    !query.isFetching &&
    (query.isSuccess || (query.error instanceof ApiError && query.error.status === 404)) &&
    (query.data?.revision ?? 0) <= confirmedRevision &&
    draft === null &&
    queueState === 'idle' &&
    error === null &&
    isEmptyDailyDocument(confirmedContent)

  async function copyPrevious(
    source: PreviousDailyNote,
    expectedRevision: number,
    isCurrent: () => boolean,
  ) {
    if (
      !isCurrent() ||
      !canCopyPrevious ||
      copyingRef.current ||
      draftRef.current ||
      queueRef.current !== 'idle' ||
      revisionRef.current !== expectedRevision
    )
      return false

    copyingRef.current = true
    setCopyingPrevious(true)
    const minimumRevision = () =>
      Math.max(
        revisionRef.current,
        queryClient.getQueryData<DailyNoteDetail>(dailyNoteKeys(owner, space).detail(date))
          ?.revision ?? 0,
      )
    try {
      const response = await copyPreviousDailyNote(space, date, source, expectedRevision, isCurrent)
      if (!isCurrent()) {
        setCopyRecovery({ minimumRevision: minimumRevision() })
        return false
      }
      // El GET queda en caché durante la copia. Una revisión superior invalida este ACK.
      if (response.revision < minimumRevision()) {
        throw new Error('La nota de destino cambió después de copiarse')
      }
      confirmWrite(response)
      setConfirmedCopy({ sourceDate: source.sourceDate, note: response })
      void invalidateDailyNote(queryClient, owner, space, date)
      void invalidateDailyNote(queryClient, owner, space)
      return true
    } catch (error) {
      if (!isCurrent() || !isCopySourceConflict(error)) {
        setCopyRecovery({ minimumRevision: minimumRevision() })
      }
      throw error
    } finally {
      copyingRef.current = false
      setCopyingPrevious(false)
    }
  }

  async function reloadCopyTarget(isCurrent: () => boolean) {
    if (
      !copyRecovery ||
      !isCurrent() ||
      reloadTargetRef.current ||
      copyingRef.current ||
      draftRef.current
    ) {
      return false
    }
    reloadTargetRef.current = true
    setReloadingCopyTarget(true)
    try {
      await queryClient.cancelQueries({ queryKey: dailyNoteKeys(owner, space).detail(date) })
      if (!isCurrent()) return false
      const result = await query.refetch()
      if (!isCurrent()) return false
      const minimumRevision = Math.max(revisionRef.current, copyRecovery.minimumRevision)
      if (result.isSuccess && result.data.revision >= minimumRevision) {
        confirmWrite(result.data)
        setCopyRecovery(undefined)
        return true
      }
      if (
        result.error instanceof ApiError &&
        result.error.status === 404 &&
        minimumRevision === 0
      ) {
        setCopyRecovery(undefined)
        return true
      }
      return false
    } finally {
      reloadTargetRef.current = false
      setReloadingCopyTarget(false)
    }
  }

  // ——— Cola de escritura ———
  // flushQueue se refiere a sí misma dentro del .then() para encadenar
  // la siguiente generación. Usamos una ref mutable para evitar el problema
  // de useCallback que captura el valor antiguo.
  const flushQueueRef = useRef<(force?: boolean) => void | null>(null)

  const flushQueue = useCallback(
    (force?: boolean) => {
      timerRef.current = null
      const entry = draftRef.current
      if (!entry) {
        setQueueState('idle')
        return
      }

      // Validar antes de enviar, a menos que force permita saltar.
      if (!force) {
        const validation = validateDailyContent(entry.content)
        if (!validation.valid) {
          setError(new Error(validation.error ?? 'Contenido inválido') as ApiError)
          setQueueState('idle')
          return
        }
      }

      const rev = revisionRef.current
      queueRef.current = 'flushing'
      setQueueState('flushing')

      // Espacio y fecha capturados por esta instancia: el coordinador se remonta por owner+space+fecha.
      saveDailyNote(space, date, entry.content, rev)
        .then((response) => {
          // ACK: actualizar revisión confirmada.
          confirmWrite(response)

          // Invalidar query para refetch.
          invalidateDailyNote(queryClient, owner, space, date)

          // Verificar si hay nueva generación pendiente ANTES de limpiar.
          const nextDraft = draftRef.current
          if (nextDraft && nextDraft.generation > entry.generation) {
            // Hay ediciones posteriores; no limpiar draft, enviar la más reciente.
            setTimeout(() => flushQueueRef.current?.(), 0)
          } else {
            draftRef.current = null
            queueRef.current = 'idle'
            setDraft(null)
            setQueueState('idle')
            // Resolver flushers pendientes.
            const flushers = flushersRef.current
            flushersRef.current = []
            for (const f of flushers) {
              f.resolve()
            }
          }
        })
        .catch((err: unknown) => {
          queueRef.current = 'idle'
          const apiErr = err as ApiError | null
          if (apiErr && 'status' in apiErr && (apiErr as ApiError).status === 409) {
            setError(apiErr)
            setQueueState('idle')
            // Rechazar flushers con el error.
            const flushers = flushersRef.current
            flushersRef.current = []
            for (const f of flushers) {
              f.reject(apiErr)
            }
            return
          }
          // Error de red u otro: conservar borrador, detener cola.
          if (apiErr) {
            setError(apiErr)
          }
          setQueueState('idle')
          // No resolver flushers; el error se propaga.
          const flushers = flushersRef.current
          flushersRef.current = []
          for (const f of flushers) {
            f.reject(apiErr)
          }
        })
    },
    [owner, space, date, queryClient, confirmWrite],
  )

  // Mantener flushQueueRef sincronizado para la llamada recursiva en .then().
  useEffect(() => {
    flushQueueRef.current = flushQueue
  }, [flushQueue])

  const scheduleFlush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      flushQueue()
    }, getDebounceMs())
  }, [flushQueue])

  // ——— edit ———
  const edit = useCallback(
    (newContent: unknown) => {
      if (copyingRef.current || reloadTargetRef.current || copyTargetNeedsReload) return
      const validation = validateDailyContent(newContent)
      if (!validation.valid) {
        // Conservar texto actual y no enviar.
        return
      }

      generationRef.current++
      const gen = generationRef.current
      const entry: DraftEntry = { content: validation.data!, generation: gen }
      draftRef.current = entry
      setDraft(entry)

      // Si hay un PUT en vuelo, no interrumpir; la cola enviará la nueva
      // generación tras el ACK.
      if (queueRef.current === 'idle') {
        scheduleFlush()
      }
      // Si hay PUT en vuelo, el .then() detectará draftRef.current con generación mayor.
    },
    [copyTargetNeedsReload, scheduleFlush],
  )

  // ——— retry ———
  const retry = useCallback(() => {
    setError(null)
    if (draftRef.current && queueRef.current === 'idle') {
      flushQueue()
    }
  }, [flushQueue])

  // ——— flush ———
  const flush = useCallback(
    (options?: { force?: boolean }) => {
      const force = options?.force ?? false
      if (copyingRef.current || reloadTargetRef.current) {
        return Promise.reject(new Error('La copia o la recarga está en curso'))
      }
      if (force && copyTargetNeedsReload) {
        return Promise.reject(new Error('Recargá la nota antes de guardar una versión'))
      }
      return new Promise<void>((resolve, reject) => {
        // La acción manual puede crear un documento vacío, pero cargarlo nunca escribe.
        if (force && !draftRef.current && revisionRef.current === 0) {
          const entry = { content: emptyDocument(), generation: ++generationRef.current }
          draftRef.current = entry
          setDraft(entry)
        }
        if (!draftRef.current && queueRef.current === 'idle') {
          resolve()
          return
        }
        flushersRef.current.push({ resolve, reject })
        // Si hay timer pendiente, lo ejecuta inmediatamente.
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current)
          timerRef.current = null
          forceRef.current = force
          flushQueue(force)
        } else if (queueRef.current === 'flushing') {
          // Ya hay PUT en vuelo; esperar.
        } else if (draftRef.current !== null) {
          // Borrador sin timer ni PUT: enviar ahora.
          forceRef.current = force
          flushQueue(force)
        } else {
          // Nada pendiente.
          resolve()
        }
      })
    },
    [copyTargetNeedsReload, flushQueue],
  )

  // ——— discard ———
  const discard = useCallback(async () => {
    // Esperar PUT en vuelo.
    if (queueRef.current === 'flushing') {
      await new Promise<void>((resolve) => {
        flushersRef.current.push({ resolve, reject: () => {} })
      })
    }
    // Limpiar borrador.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setDraft(null)
    draftRef.current = null
    queueRef.current = 'idle'
    setError(null)
    setQueueState('idle')
    // Recargar estado remoto.
    invalidateDailyNote(queryClient, owner, space, date)
  }, [queryClient, owner, space, date])

  // ——— Derivar estado público ———
  const isDirty = draft !== null
  const isSaving = queueState === 'flushing'

  let status: SaveStatus
  if (copyTargetNeedsReload) {
    status = 'unconfirmed'
  } else if (error !== null && 'status' in error && (error as ApiError).status === 409) {
    status = 'conflict'
  } else if (error !== null) {
    status = 'error'
  } else if (isSaving || isCopyingPrevious) {
    status = 'saving'
  } else if (isDirty) {
    status = 'idle'
  } else if (!query.isLoading && !query.isPending) {
    status = 'saved'
  } else {
    status = 'idle'
  }

  // El contenido activo es el borrador si existe, sino el confirmado.
  const content = isDirty && draft !== null ? draft.content : confirmedContent

  return {
    isLoading: query.isPending,
    getRevision: () => revisionRef.current,
    content,
    revision: confirmedRevision,
    status,
    error,
    isDirty,
    isSaving,
    canCopyPrevious,
    isCopyingPrevious,
    isReloadingCopyTarget,
    copyTargetNeedsReload,
    confirmedCopy,
    copyPrevious,
    reloadCopyTarget,
    edit,
    retry,
    flush,
    discard,
  }
}
