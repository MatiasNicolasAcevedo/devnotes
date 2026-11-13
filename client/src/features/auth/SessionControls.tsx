import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router'
import { PersonIcon } from '../../shared/ui/icons'
import { ServiceActivityDialog } from '../serviceActivity/ServiceActivityDialog'
import {
  useDailyVisit,
  useServiceActivityCapabilities,
} from '../serviceActivity/useServiceActivity'
import { sessionLabel, useSession } from './sessionContext'

/** Estado de sesión en la barra superior: menú de usuario con «Cerrar sesión» o acceso al ingreso. */
export function SessionControls() {
  const { status, user } = useSession()
  const { pathname } = useLocation()

  // Se monta solo con sesión y por identidad: al terminar o cambiar de cuenta, el menú y el detalle abiertos se
  // descartan y no reaparecen con otra identidad.
  if (status === 'authenticated' && user) {
    return <AccountMenu key={user.id} owner={user.id} label={sessionLabel(user)} />
  }

  if (status === 'visitor' && pathname !== '/login') {
    return (
      <Button color="inherit" component={RouterLink} to="/login" sx={{ flexShrink: 0 }}>
        Ingresar
      </Button>
    )
  }

  return null
}

function AccountMenu({ owner, label }: { owner: string; label: string }) {
  const { logout, logoutPending, csrfReady } = useSession()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const open = anchor !== null
  // Solo la cuenta habilitada recibe `available: true`; para las demás no hay activación ni detalle.
  const { data: capabilities } = useServiceActivityCapabilities(owner)
  const serviceDate = capabilities?.available ? capabilities.serviceDate : null
  const available = serviceDate !== null
  useDailyVisit(owner, csrfReady, serviceDate)

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
        {available ? (
          <MenuItem
            onClick={() => {
              setAnchor(null)
              setActivityOpen(true)
            }}
          >
            Actividad del servidor
          </MenuItem>
        ) : null}
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
      {available ? (
        <ServiceActivityDialog
          owner={owner}
          open={activityOpen}
          csrfReady={csrfReady}
          onClose={() => setActivityOpen(false)}
        />
      ) : null}
    </>
  )
}
