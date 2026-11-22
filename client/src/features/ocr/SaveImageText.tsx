import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useRef, useState } from 'react'
import { ApiError } from '../../services/http'
import { newImageTextAttempt, saveImageText, type ImageTextAttempt } from './imageTextsApi'
import { ocrActionSx } from './styles'
import { useImageTextScope, type ImageTextScope } from './useImageTextScope'

export function SaveImageText({
  scope,
  text,
  onSaved,
}: {
  scope: ImageTextScope
  text: string
  onSaved: (text: string) => void
}) {
  const { isCurrent, invalidateList, mutate } = useImageTextScope(scope)
  const pending = useRef(false)
  const attempt = useRef<ImageTextAttempt | null>(null)
  const [status, setStatus] = useState<
    { kind: 'pending' } | { kind: 'saved' | 'error'; text: string } | null
  >(null)
  const tooLong = [...text].length > 60_000
  const valid = /\P{White_Space}/u.test(text) && !tooLong

  async function save() {
    if (!scope.csrfReady || !valid || pending.current || !isCurrent()) return
    pending.current = true
    setStatus({ kind: 'pending' })
    try {
      const input = attempt.current?.text === text ? attempt.current : newImageTextAttempt(text)
      attempt.current = input
      await mutate((options) => saveImageText(scope.space, input, options))
      attempt.current = null
      void invalidateList()
      if (isCurrent()) {
        onSaved(text)
        setStatus({ kind: 'saved', text })
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) attempt.current = null
      if (isCurrent()) setStatus({ kind: 'error', text })
    } finally {
      pending.current = false
    }
  }

  return (
    <div>
      <Button
        variant="outlined"
        sx={ocrActionSx}
        disabled={!valid || !scope.csrfReady || status?.kind === 'pending'}
        onClick={(event) => {
          if (event.detail <= 1) void save()
        }}
      >
        Guardar
      </Button>
      {tooLong && <Alert severity="warning">Usá hasta 60.000 caracteres para guardar.</Alert>}
      {status?.kind === 'pending' && <Typography role="status">Guardando texto…</Typography>}
      {status?.kind === 'saved' && status.text === text && (
        <Typography role="status">Texto guardado</Typography>
      )}
      {status?.kind === 'error' && status.text === text && (
        <Alert severity="error">No se pudo guardar el texto. Volvé a intentarlo.</Alert>
      )}
    </div>
  )
}
