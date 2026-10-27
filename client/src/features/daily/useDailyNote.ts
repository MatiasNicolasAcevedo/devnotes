import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDailyNoteQuery, invalidateDailyNote } from './useDailyNoteQuery'
import { saveDailyNote } from './api'
import { emptyDocument, validateDailyContent } from './editor/dailyDocument'
import type { DailyContent } from './editor/dailyDocument'
import type { ApiError } from '../../services/http'

// ——— Tipos internos ———

/** Identificador monótono de generación local; cada edición válida lo incrementa. */
type Generation = number

/** Estado de la cola de escritura. */
type QueueState = 'idle' | 'flushing'

interface DraftEntry {
  content: DailyContent
  generation: Generation
}

// ——— Estado público del hook ———

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

export interface UseDailyNoteReturn {
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
 * Coordinador de borrador y cola de guardado por identidad/fecha.
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
  date: string,
  sessionIsCurrent?: () => boolean,
): UseDailyNoteReturn {
  const queryClient = useQueryClient()
  // ——— Query de lectura ———
  const query = useDailyNoteQuery(owner, date, sessionIsCurrent)

  // ——— Estado local ———
  const [draft, setDraft] = useState<DraftEntry | null>(null)
  const [confirmedRevision, setConfirmedRevision] = useState<number>(0)
  const [confirmedContent, setConfirmedContent] = useState<DailyContent>(emptyDocument())
  const [queueState, setQueueState] = useState<QueueState>('idle')
  const [error, setError] = useState<ApiError | null>(null)

  // Referencias mutables para evitar closures stale en el debounce y la cola.
  const draftRef = useRef<DraftEntry | null>(null)
  const revisionRef = useRef<number>(0)
  const queueRef = useRef<QueueState>('idle')
  const generationRef = useRef<Generation>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushersRef = useRef<Array<{ resolve: () => void; reject: (e: unknown) => void }>>([])
  const forceRef = useRef<boolean>(false)

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
  useEffect(() => {
    if (query.data) {
      const remote = query.data
      // Si el borrador está dirty y la respuesta tiene la misma generación,
      // no es una respuesta vieja. Si la revisión es menor que la confirmada,
      // es una respuesta vieja y se ignora.
      if (remote.revision < revisionRef.current) {
        return // ACK viejo, ignorar
      }
      setConfirmedContent(remote.content)
      setConfirmedRevision(remote.revision)
    }
  }, [query.data])

  // ——— Manejar error de query (404 → vacío) ———
  useEffect(() => {
    if (query.error && query.error instanceof Error) {
      // 404 no es error de UI; significa "sin nota".
      // El hook de query ya lo maneja como error; aquí solo evitamos
      // que un 404 inicial marque el estado como error.
    }
  }, [query.error])

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
      setQueueState('flushing')

      saveDailyNote(owner, date, entry.content, rev)
        .then((response) => {
          // ACK: actualizar revisión confirmada.
          setConfirmedRevision(response.revision)
          setConfirmedContent(response.content)
          setError(null)

          // Invalidar query para refetch.
          invalidateDailyNote(queryClient, owner, date)

          // Verificar si hay nueva generación pendiente ANTES de limpiar.
          const nextDraft = draftRef.current
          if (nextDraft && nextDraft.generation > entry.generation) {
            // Hay ediciones posteriores; no limpiar draft, enviar la más reciente.
            setTimeout(() => flushQueueRef.current?.(), 0)
          } else {
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
    [owner, date, queryClient],
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
      const validation = validateDailyContent(newContent)
      if (!validation.valid) {
        // Conservar texto actual y no enviar.
        return
      }

      generationRef.current++
      const gen = generationRef.current
      const entry: DraftEntry = { content: validation.data!, generation: gen }
      setDraft(entry)

      // Si hay un PUT en vuelo, no interrumpir; la cola enviará la nueva
      // generación tras el ACK.
      if (queueRef.current === 'idle') {
        scheduleFlush()
      }
      // Si hay PUT en vuelo, el .then() detectará draftRef.current con generación mayor.
    },
    [scheduleFlush],
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
      return new Promise<void>((resolve, reject) => {
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
        flushersRef.current.push({ resolve, reject })
      })
    },
    [flushQueue],
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
    setError(null)
    setQueueState('idle')
    // Recargar estado remoto.
    invalidateDailyNote(queryClient, owner, date)
  }, [queryClient, owner, date])

  // ——— Derivar estado público ———
  const isDirty = draft !== null
  const isSaving = queueState === 'flushing'

  let status: SaveStatus
  if (error !== null && 'status' in error && (error as ApiError).status === 409) {
    status = 'conflict'
  } else if (error !== null) {
    status = 'error'
  } else if (isSaving) {
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
    content,
    revision: confirmedRevision,
    status,
    error,
    isDirty,
    isSaving,
    edit,
    retry,
    flush,
    discard,
  }
}
