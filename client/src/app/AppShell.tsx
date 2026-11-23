import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import useMediaQuery from '@mui/material/useMediaQuery'
import Typography from '@mui/material/Typography'
import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link as RouterLink, matchPath, useLocation } from 'react-router'
import { SessionAlerts } from '../features/auth/SessionAlerts'
import { AiNavbar } from '../features/ai/AiNavbar'
import { AiProvider } from '../features/ai/AiProvider'
import { DemoLink } from '../features/demo/DemoLink'
import { SessionControls } from '../features/auth/SessionControls'
import { useSession } from '../features/auth/sessionContext'
import { DailyDraftWorkspace } from '../features/daily/DailyDraftNavigation'
import { DailyCopyRecoveryProvider } from '../features/daily/DailyDraftProvider'
import { FreeNotesProvider } from '../features/free-notes/FreeNotesProvider'
import { ImageDraftContext } from '../features/ocr/imageDraftContext'
import { SideReadingProvider } from '../features/side-reading/SideReadingProvider'
import { SpaceNavigation } from '../features/spaces/SpaceNavigation'
import { SpaceProvider } from '../features/spaces/SpaceProvider'
import { SpaceSelector } from '../features/spaces/SpaceSelector'
import { useOptionalActiveSpace, useSpaceHref } from '../features/spaces/spaceContext'
import { ServerStatus } from '../features/system/ServerStatus'
import { VoiceDraftNavigation } from '../features/voice/VoiceDraftNavigation'
import { VoiceDraftProvider } from '../features/voice/VoiceDraftProvider'
import { BookmarkIcon, HistoryIcon, ImageIcon, MicIcon, NoteIcon } from '../shared/ui/icons'
import { AMBER } from './theme'

/**
 * Estructura común: barra superior con la sesión y contenido. Las rutas se remontan al cambiar la identidad o el
 * espacio confirmado, así que el estado local de una pantalla nunca pasa de un usuario ni de un espacio a otro.
 */
export function AppShell() {
  const { user } = useSession()
  const owner = user?.id ?? ''
  const navigationRoot = useRef<HTMLDivElement>(null)
  const [imageEdited, setImageEdited] = useState(false)
  return (
    <SpaceProvider owner={owner}>
      <ImageDraftContext.Provider value={{ imageEdited, setImageEdited }}>
        <AiProvider>
          <AppShellContent navigationRoot={navigationRoot}>
            <FreeNotesProvider key={owner}>
              <DailyCopyRecoveryProvider key={owner}>
                <SpaceWorkspaces owner={owner} navigationRoot={navigationRoot} />
              </DailyCopyRecoveryProvider>
            </FreeNotesProvider>
          </AppShellContent>
        </AiProvider>
      </ImageDraftContext.Provider>
    </SpaceProvider>
  )
}

/** Borradores de voz y diario de una identidad en el espacio confirmado, con el coordinador de transición encima del outlet. */
function SpaceWorkspaces({
  owner,
  navigationRoot,
}: {
  owner: string
  navigationRoot: RefObject<HTMLDivElement | null>
}) {
  const { status } = useSession()
  const { pathname } = useLocation()
  const space = useOptionalActiveSpace()
  const voiceActive = status !== 'loading' && matchPath('/voice', pathname) != null
  return (
    <VoiceDraftProvider key={`${owner}/${space ?? ''}`} owner={owner} active={voiceActive}>
      <SideReadingProvider>
        <VoiceDraftNavigation>
          {(outletOverride, bypassDailyLinks) => (
            <DailyDraftWorkspace
              owner={owner}
              space={space}
              outletOverride={outletOverride}
              bypassLinkFlush={bypassDailyLinks}
              navigationRoot={navigationRoot}
            >
              {(outlet) => <SpaceNavigation>{outlet}</SpaceNavigation>}
            </DailyDraftWorkspace>
          )}
        </VoiceDraftNavigation>
      </SideReadingProvider>
    </VoiceDraftProvider>
  )
}

const VOICE_TAB = { label: 'Voz', to: '/voice', Icon: MicIcon }
const NOTES_TAB = { label: 'Notas', to: '/notes', Icon: NoteIcon }
const COMPACT_WRITING_VIEWPORT =
  '(width < 768px) and (hover: hover) and (pointer: fine) and (not (any-pointer: coarse))'
const OTHER_TABS = [
  { label: 'Referencias', to: '/reference', Icon: BookmarkIcon },
  { label: 'Imagen', to: '/image', Icon: ImageIcon },
  { label: 'Historial', to: '/history', Icon: HistoryIcon },
]

function PrimaryNavigation({ mobile }: { mobile: boolean }) {
  const { pathname } = useLocation()
  const href = useSpaceHref()
  const tabs = mobile
    ? [NOTES_TAB, VOICE_TAB, ...OTHER_TABS]
    : [VOICE_TAB, NOTES_TAB, ...OTHER_TABS]

  return (
    <Box
      component="nav"
      aria-label="Navegación principal"
      sx={
        mobile
          ? {
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              flexShrink: 0,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
              pl: 'env(safe-area-inset-left)',
              pr: 'env(safe-area-inset-right)',
              pb: 'env(safe-area-inset-bottom)',
            }
          : { display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }
      }
    >
      {tabs.map(({ label, to, Icon }) => (
        <Link
          key={to}
          component={RouterLink}
          to={href(to)}
          underline="none"
          color="inherit"
          aria-current={
            matchPath({ path: to, end: false }, pathname) ||
            (to === '/notes' && matchPath({ path: '/free-notes', end: false }, pathname))
              ? 'page'
              : undefined
          }
          sx={{
            display: 'flex',
            flexDirection: mobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 0.25,
            minHeight: mobile ? 48 : 44,
            px: mobile ? 0.25 : 1,
            borderRadius: '6px',
            fontSize: mobile ? '0.6875rem' : '0.9375rem',
            lineHeight: 1.25,
            overflowWrap: 'anywhere',
            '&:hover': { color: AMBER },
            '&[aria-current="page"]': { color: AMBER, bgcolor: alpha(AMBER, 0.16) },
            '&:focus-visible': { outline: `2px solid ${AMBER}`, outlineOffset: -2 },
          }}
        >
          {mobile && <Icon />}
          {label}
        </Link>
      ))}
    </Box>
  )
}

function AppShellContent({
  navigationRoot,
  children,
}: {
  navigationRoot: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const { status } = useSession()
  const { pathname } = useLocation()
  const daily = matchPath('/notes/:date?', pathname) != null
  const freeNotes = matchPath({ path: '/free-notes', end: false }, pathname) != null
  const narrowFinePointer = useMediaQuery(COMPACT_WRITING_VIEWPORT, { noSsr: true })
  const compactWriting = status === 'authenticated' && (daily || freeNotes) && narrowFinePointer
  const headerHeight = compactWriting ? 32 : daily ? 48 : 56
  const desktop = useMediaQuery('(min-width: 768px)', { noSsr: true })
  // Datos sigue siendo un enlace del shell para el coordinador de navegación diaria.
  const menuContainer = () => navigationRoot.current

  return (
    <Box
      ref={navigationRoot}
      sx={{
        minHeight: desktop ? '100dvh' : 0,
        height: desktop ? 'auto' : '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{ flexShrink: 0, pt: 'env(safe-area-inset-top)' }}
      >
        <Toolbar
          variant="dense"
          disableGutters
          sx={{
            gap: desktop ? 1.5 : 0.5,
            minHeight: headerHeight,
            ...(compactWriting && {
              '--shell-control-size': '28px',
              '--shell-label-size': '0.8125rem',
              '--shell-focus-offset': '-2px',
              '--shell-control-block-padding': '0px',
            }),
            pl: 'max(8px, env(safe-area-inset-left))',
            pr: 'max(8px, env(safe-area-inset-right))',
          }}
        >
          <SpaceSelector />
          {desktop && <PrimaryNavigation mobile={false} />}
          {desktop && <DemoLink />}
          <Stack
            direction="row"
            spacing={desktop ? 1 : 0.5}
            sx={{ ml: 'auto', flexShrink: 0, alignItems: 'center' }}
          >
            {!desktop && <DemoLink />}
            <ServerStatus compact={!desktop} />
            <AiNavbar />
            <SessionControls menuContainer={menuContainer} />
          </Stack>
        </Toolbar>
      </AppBar>
      <Container
        component="main"
        maxWidth="lg"
        disableGutters
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: desktop ? undefined : 'auto',
          pl: {
            xs: 'max(8px, env(safe-area-inset-left))',
            sm: 'max(16px, env(safe-area-inset-left))',
          },
          pr: {
            xs: 'max(8px, env(safe-area-inset-right))',
            sm: 'max(16px, env(safe-area-inset-right))',
          },
          py: daily ? 0.5 : { xs: 1, sm: 1.5 },
        }}
      >
        <Stack
          spacing={1}
          sx={{
            height: daily && !desktop ? '100%' : undefined,
            '--daily-editor-height':
              daily && desktop
                ? `calc(100dvh - ${headerHeight}px - env(safe-area-inset-top) - 8px)`
                : undefined,
            '--free-writing-height': desktop
              ? `calc(100dvh - ${headerHeight}px - env(safe-area-inset-top) - 24px)`
              : `calc(100dvh - ${headerHeight}px - 48px - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom))`,
          }}
        >
          <SessionAlerts />
          {status === 'loading' ? (
            <Stack direction="row" spacing={1.5} role="status" sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} aria-hidden />
              <Typography>Verificando sesión…</Typography>
            </Stack>
          ) : (
            children
          )}
        </Stack>
      </Container>
      {!desktop && <PrimaryNavigation mobile />}
    </Box>
  )
}
