import Button from '@mui/material/Button'
import SvgIcon from '@mui/material/SvgIcon'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCopyToClipboard } from './useCopyToClipboard'

interface CopyButtonProps {
  /** Texto que se copiará al portapapeles. */
  text: string
  /** Label accesible del botón. */
  'aria-label': string
  /** Texto visible del botón (opcional; por defecto solo icono). */
  children?: string
}

/**
 * Botón accesible para copiar texto al portapapeles.
 *
 * Muestra feedback de éxito temporal y error persistente con sugerencia de copia manual.
 * No envía texto a terceros; usa la Clipboard API solo por acción de usuario.
 */
export function CopyButton({ text, 'aria-label': ariaLabel, children }: CopyButtonProps) {
  const { copy, result, clear } = useCopyToClipboard()
  const [showSuccess, setShowSuccess] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleCopy = useCallback(async () => {
    clear()
    setShowSuccess(false)
    const res = await copy(text)
    if (res.success) {
      setShowSuccess(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setShowSuccess(false)
        clear()
      }, 2000)
    }
  }, [text, copy, clear])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const CopyIcon = (
    <SvgIcon fontSize="small" aria-hidden="true">
      <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1ZM19 5H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z" />
    </SvgIcon>
  )

  const CheckIcon = (
    <SvgIcon fontSize="small" aria-hidden="true">
      <path d="M9 16.2l-3.5-3.5a.996.996 0 0 0-1.4 0c-.38.38-.38 1 0 1.4L7.2 18c.19.2.44.3.7.3s.51-.1.7-.3l7-7a.996.996 0 0 0 0-1.4c-.38-.38-1-.38-1.4 0L9 16.2Z" />
    </SvgIcon>
  )

  return (
    <>
      <Button
        ref={buttonRef}
        size="small"
        aria-label={ariaLabel}
        onClick={handleCopy}
        startIcon={showSuccess ? CheckIcon : CopyIcon}
        title={ariaLabel}
      >
        {children}
      </Button>
      {showSuccess && (
        <Typography
          variant="caption"
          color="success.main"
          role="status"
          sx={{ whiteSpace: 'nowrap' }}
        >
          Copiado
        </Typography>
      )}
      {result && !result.success && result.error && (
        <Typography variant="caption" color="error.main" role="alert" sx={{ whiteSpace: 'nowrap' }}>
          {result.error}
        </Typography>
      )}
    </>
  )
}
