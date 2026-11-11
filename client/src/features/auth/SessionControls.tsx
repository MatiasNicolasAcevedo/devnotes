import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router'
import { PersonIcon } from '../../shared/ui/icons'
import { sessionLabel, useSession } from './sessionContext'

/** Estado de sesión en la barra superior: menú de usuario con «Cerrar sesión» o acceso al ingreso. */
export function SessionControls() {
  const { status, user } = useSession()
  const { pathname } = useLocation()

  // Se monta solo con sesión: al terminar, el menú abierto se descarta y no reaparece con otra identidad.
  if (status === 'authenticated' && user) return <AccountMenu label={sessionLabel(user)} />

  if (status === 'visitor' && pathname !== '/login') {
    return (
      <Button color="inherit" component={RouterLink} to="/login" sx={{ flexShrink: 0 }}>
        Ingresar
      </Button>
    )
  }

  return null
}

function AccountMenu({ label }: { label: string }) {
  const { logout, logoutPending, csrfReady } = useSession()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = anchor !== null

  return (
    <>
      <IconButton
        color="inherit"
        size="small"
        aria-label={`Cuenta de ${label}`}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ flexShrink: 0, border: 1, borderColor: 'divider' }}
      >
        <PersonIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {/* Primera línea no interactiva: la identidad activa sigue a la vista sin ocupar la barra. */}
        <MenuItem
          disabled
          divider
          sx={{ '&.Mui-disabled': { opacity: 1 }, maxWidth: 280, whiteSpace: 'normal' }}
        >
          {label}
        </MenuItem>
        <MenuItem
          disabled={logoutPending || !csrfReady}
          onClick={() => {
            setAnchor(null)
            logout()
          }}
        >
          {logoutPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </MenuItem>
      </Menu>
    </>
  )
}
