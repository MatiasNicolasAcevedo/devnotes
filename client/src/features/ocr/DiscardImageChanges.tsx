import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useId } from 'react'
import { ocrActionSx } from './styles'

export function DiscardImageChanges({
  cancel,
  discard,
}: {
  cancel: () => void
  discard: () => void
}) {
  const title = useId()
  return (
    <Dialog open onClose={cancel} aria-labelledby={title}>
      <DialogTitle id={title}>¿Descartar los cambios del texto?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Editaste el texto extraído y todavía no copiaste esos cambios.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={cancel} sx={ocrActionSx}>
          Seguir editando
        </Button>
        <Button variant="contained" onClick={discard} sx={ocrActionSx}>
          Descartar cambios
        </Button>
      </DialogActions>
    </Dialog>
  )
}
