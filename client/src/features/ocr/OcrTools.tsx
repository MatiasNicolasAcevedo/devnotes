import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import type { Space } from '../spaces/space'
import { getOcrCapabilities } from './api'
import { OcrDialog } from './OcrDialog'
import { ocrActionSx } from './styles'

export function OcrTools({
  owner,
  space,
  csrfReady,
}: {
  owner: string
  space: Space
  csrfReady: boolean
}) {
  const triggerId = useId()
  const menuId = useId()
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const capability = useQuery({
    queryKey: ['ocr', 'capabilities', owner, space],
    queryFn: ({ signal }) => getOcrCapabilities(space, signal),
    enabled: anchor !== null,
    retry: false,
    staleTime: 0,
  })
  const available =
    !capability.isFetching && !capability.isError && capability.data?.available === true
  const availabilityMessage = capability.isFetching
    ? 'Comprobando disponibilidad…'
    : capability.isError
      ? 'No se pudo comprobar la disponibilidad. Volvé a abrir Herramientas.'
      : 'La extracción no está habilitada en este espacio.'

  function closeMenu() {
    anchor?.focus({ preventScroll: true })
    setAnchor(null)
  }

  return (
    <>
      <Button
        id={triggerId}
        size="small"
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor !== null}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ ...ocrActionSx, flexShrink: 0, ml: 'auto' }}
      >
        Herramientas
      </Button>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={closeMenu}
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          list: { id: menuId, 'aria-labelledby': triggerId, disabledItemsFocusable: true },
          paper: { sx: { maxWidth: 'min(360px, calc(100vw - 32px))' } },
        }}
      >
        <MenuItem
          disabled={!available}
          onClick={() => {
            closeMenu()
            setDialogOpen(true)
          }}
          sx={{
            ...ocrActionSx,
            whiteSpace: 'normal',
            '&.Mui-disabled': { opacity: 1, color: 'text.secondary' },
          }}
        >
          <ListItemText
            primary="Copiar texto de una captura"
            secondary={available ? undefined : availabilityMessage}
          />
        </MenuItem>
      </Menu>
      {dialogOpen && (
        <OcrDialog space={space} csrfReady={csrfReady} onClose={() => setDialogOpen(false)} />
      )}
    </>
  )
}
