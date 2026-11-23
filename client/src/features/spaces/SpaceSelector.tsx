import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { alpha } from '@mui/material/styles'
import { useId, useRef, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { BriefcaseIcon, CheckIcon, ChevronDownIcon, PersonIcon } from '../../shared/ui/icons'
import { isSpaceRoute, spaceHref, SPACE_LABELS, SPACE_SELECTOR_INTENT, SPACES } from './space'
import { useSpaceContext } from './spaceContext'

const APPEARANCE = {
  work: { color: '#86efac', Icon: BriefcaseIcon },
  personal: { color: '#c4b5fd', Icon: PersonIcon },
} as const

export function SpaceSelector() {
  const { owner, space, lockReason } = useSpaceContext()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [menu, setMenu] = useState<{ anchor: HTMLElement; owner: string } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  if (!space) return null

  const anchor = menu?.owner === owner ? menu.anchor : null
  const open = anchor !== null
  const label = SPACE_LABELS[space]
  const { color, Icon } = APPEARANCE[space]
  const destination = matchPath('/free-notes/:id', pathname)
    ? '/free-notes'
    : isSpaceRoute(pathname)
      ? pathname
      : '/notes'
  const close = () => setMenu(null)

  return (
    <>
      <Button
        ref={trigger}
        aria-label={`Espacio: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-describedby={lockReason ? `${id}-lock` : undefined}
        startIcon={<Icon />}
        endIcon={<ChevronDownIcon />}
        onClick={(event) => setMenu({ anchor: event.currentTarget, owner })}
        sx={{
          flexShrink: 0,
          minHeight: 'var(--shell-control-size, 44px)',
          py: 'var(--shell-control-block-padding, 6px)',
          px: 1.25,
          fontSize: 'var(--shell-label-size, 1rem)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          color,
          border: `1px solid ${color}`,
          bgcolor: alpha(color, 0.08),
          '&:hover': { bgcolor: alpha(color, 0.16) },
          '&.Mui-focusVisible': {
            outline: `2px solid ${color}`,
            outlineOffset: 'var(--shell-focus-offset, 2px)',
          },
        }}
      >
        {label}
      </Button>
      {lockReason && (
        <Box component="span" id={`${id}-lock`} hidden>
          {lockReason}
        </Box>
      )}
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={close}
        disableRestoreFocus
        transitionDuration={0}
        slotProps={{
          transition: { onExited: () => trigger.current?.focus() },
          list: {
            id: `${id}-menu`,
            'aria-label': 'Cambiar de espacio',
            'aria-describedby': lockReason ? `${id}-lock` : undefined,
          },
        }}
      >
        {SPACES.map((option) => {
          const selected = space === option
          const { Icon: OptionIcon, color: optionColor } = APPEARANCE[option]
          return (
            <MenuItem
              key={option}
              role="menuitemradio"
              aria-checked={selected}
              selected={selected}
              disabled={!selected && lockReason !== null}
              onClick={() => {
                close()
                if (!selected) {
                  void navigate(spaceHref(destination, option), { state: SPACE_SELECTOR_INTENT })
                }
              }}
              sx={{
                '&&': { minHeight: 48 },
                minWidth: 164,
                gap: 1,
                '&.Mui-focusVisible': { outline: `2px solid ${optionColor}`, outlineOffset: -2 },
              }}
            >
              <OptionIcon sx={{ color: optionColor }} />
              {SPACE_LABELS[option]}
              {selected && <CheckIcon sx={{ color: optionColor, ml: 'auto' }} />}
            </MenuItem>
          )
        })}
        {lockReason && (
          <Box component="li" role="presentation" sx={{ px: 2, py: 1, maxWidth: 220 }}>
            {lockReason}
          </Box>
        )}
      </Menu>
    </>
  )
}
