import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useId, useState } from 'react'
import type { FreeNoteDraft } from './freeNotesContext'

export function FreeNoteExitDialog({
  draft,
  cancel,
  proceed,
}: {
  draft: FreeNoteDraft
  cancel: () => void
  proceed: () => void
}) {
  const id = useId()
  const [saving, setSaving] = useState(false)
  const busy = saving || draft.busy
  return (
    <Dialog open aria-labelledby={id} onClose={busy ? undefined : cancel}>
      <DialogTitle id={id}>¿Guardar los cambios de la nota libre?</DialogTitle>
      <DialogContent>Podés guardar el borrador antes de salir o descartarlo.</DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}>
        <Button autoFocus disabled={busy} onClick={cancel}>
          Seguir editando
        </Button>
        <Button disabled={busy} onClick={proceed}>
          Descartar
        </Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={async () => {
            setSaving(true)
            const success = await draft.save()
            setSaving(false)
            if (success) proceed()
            else cancel()
          }}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
