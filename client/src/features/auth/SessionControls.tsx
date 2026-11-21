import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useContext, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router'
import { DatabaseIcon, PersonIcon } from '../../shared/ui/icons'
import { ServiceActivityDialog } from '../serviceActivity/ServiceActivityDialog'
import {
  useDailyVisit,
  useServiceActivityCapabilities,
} from '../serviceActivity/useServiceActivity'
import { texts as dataTexts } from '../portability/messages'
import { DiscardImageChanges } from '../ocr/DiscardImageChanges'
import { ImageDraftContext } from '../ocr/imageDraftContext'
import { sessionLabel, useSession } from './sessionContext'

/** Estado de sesión en la barra superior: menú de usuario con «Cerrar sesión» o acceso al ingreso. */
export function SessionControls({ menuContainer }: { menuContainer?: () => HTMLElement | null }) {
  const { status, user } = useSession()
  const { pathname } = useLocation()

  // Se monta solo con sesión y por identidad: al terminar o cambiar de cuenta, el menú y el detalle abiertos se
  // descartan y no reaparecen con otra identidad.
  if (status === 'authenticated' && user) {
    return (
      <AccountMenu
        key={user.id}
        owner={user.id}
        label={sessionLabel(user)}
        menuContainer={menuContainer}
      />
    )
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

function AccountMenu({
  owner,
  label,
  menuContainer,
}: {
  owner: string
  label: string
  menuContainer?: () => HTMLElement | null
}) {
  const { logout, logoutPending, csrfReady } = useSession()
  const { imageEdited } = useContext(ImageDraftContext)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const location = useLocation()
  const [menu, setMenu] = useState<{ anchor: HTMLElement; location: string } | null>(null)
  if (menu && menu.location !== location.key) setMenu(null)
  const anchor = menu?.location === location.key ? menu.anchor : null
  const closeMenu = () => setMenu(null)
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
        onClick={(event) => setMenu({ anchor: event.currentTarget, location: location.key })}
        sx={{
          flexShrink: 0,
          width: 44,
          height: 44,
          border: 1,
          borderColor: 'divider',
          '&.Mui-focusVisible': { outline: '2px solid currentColor', outlineOffset: 2 },
        }}
      >
        <PersonIcon />
      </IconButton>
      <Menu
        container={menuContainer}
        anchorEl={anchor}
        open={open}
        onClose={closeMenu}
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
          component={RouterLink}
          to="/data"
          onClick={closeMenu}
          aria-current={location.pathname === '/data' ? 'page' : undefined}
          sx={{ '&&': { minHeight: 48 }, gap: 1 }}
        >
          <DatabaseIcon />
          {dataTexts.title}
        </MenuItem>
        {available ? (
          <MenuItem
            onClick={() => {
              closeMenu()
              setActivityOpen(true)
            }}
          >
            Actividad del servidor
          </MenuItem>
        ) : null}
        <MenuItem
          disabled={logoutPending || !csrfReady}
          onClick={() => {
            closeMenu()
            if (imageEdited) setConfirmLogout(true)
            else logout()
          }}
        >
          {logoutPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </MenuItem>
      </Menu>
      {confirmLogout && (
        <DiscardImageChanges
          cancel={() => setConfirmLogout(false)}
          discard={() => {
            setConfirmLogout(false)
            logout()
          }}
        />
      )}
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
