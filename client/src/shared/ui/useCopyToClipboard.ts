import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../features/auth/sessionContext'

/** Resultado de intentar copiar texto al portapapeles. */
export interface CopyResult {
  /** true si se copió con éxito. */
  success: boolean
  /** Mensaje de error si no se pudo copiar. */
  error?: string
}

/**
 * Hook para copiar texto al portapapeles usando la Clipboard API.
 *
 * Solo copia por acción explícita del usuario. Si la API no está disponible
 * o el usuario rechaza el permiso, devuelve un error con sugerencia de copia manual.
 * Descarta respuestas tardías cuando cambia la identidad activa.
 */
export function useCopyToClipboard() {
  const session = useSession()
  const [result, setResult] = useState<CopyResult | null>(null)
  const sessionRef = useRef(session.status)
  const pendingRef = useRef(false)

  useEffect(() => {
    sessionRef.current = session.status
  }, [session.status])

  const copy = useCallback(
    async (text: string): Promise<CopyResult> => {
      pendingRef.current = true
      let resolved = false

      try {
        if (!navigator.clipboard) {
          const err = {
            success: false as const,
            error:
              'El portapapeles no está disponible en este navegador. Seleccioná el texto y usá Ctrl+C para copiar.',
          }
          setResult(err)
          return err
        }

        await navigator.clipboard.writeText(text)

        // Verificar que la sesión no cambió mientras se resolvía la promesa.
        if (sessionRef.current !== session.status) {
          pendingRef.current = false
          return { success: false, error: 'La sesión cambió durante la operación.' }
        }

        resolved = true
        const ok = { success: true as const }
        setResult(ok)
        return ok
      } catch (err) {
        if (sessionRef.current !== session.status) {
          pendingRef.current = false
          return { success: false, error: 'La sesión cambió durante la operación.' }
        }

        const message =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'El navegador bloqueó el acceso al portapapeles. Seleccioná el texto y usá Ctrl+C para copiar.'
            : 'No se pudo copiar al portapapeles. Seleccioná el texto y usá Ctrl+C para copiar.'
        const failure = { success: false as const, error: message }
        setResult(failure)
        return failure
      } finally {
        if (!resolved) {
          pendingRef.current = false
        }
      }
    },
    [session.status],
  )

  const clear = useCallback(() => {
    pendingRef.current = false
    setResult(null)
  }, [])

  return { copy, result, clear }
}
