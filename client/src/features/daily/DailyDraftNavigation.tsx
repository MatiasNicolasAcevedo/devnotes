import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { DailyDraftProvider, useDailyDraftContext } from './DailyDraftProvider'
import { isValidIsoDate, todayLocal } from './dateUtils'

function routeDate(pathname: string) {
  if (pathname === '/notes') return todayLocal()
  const date = /^\/notes\/(\d{4}-\d{2}-\d{2})$/.exec(pathname)?.[1]
  return date && isValidIsoDate(date) ? date : null
}

/** Se crea al visitar notas y permanece sobre el shell hasta terminar la sesión. */
export function DailyDraftWorkspace({
  owner,
  outletOverride,
  bypassLinkFlush = false,
  navigationRoot,
  children,
}: {
  owner: string
  outletOverride?: ReactNode
  bypassLinkFlush?: boolean
  navigationRoot?: RefObject<HTMLDivElement | null>
  children: (outlet: ReactNode) => ReactNode
}) {
  const { pathname } = useLocation()
  const requestedDate = outletOverride === undefined ? routeDate(pathname) : null
  const [workspace, setWorkspace] = useState({ owner, initialDate: requestedDate })
  const initialDate = workspace.owner === owner ? workspace.initialDate : requestedDate
  if (workspace.owner !== owner || (!initialDate && requestedDate)) {
    setWorkspace({ owner, initialDate: requestedDate })
  }
  if (!owner || !initialDate) return children(outletOverride ?? <Outlet />)
  return (
    <DailyDraftProvider key={owner} owner={owner} initialDate={initialDate}>
      <DailyDraftNavigation bypassLinkFlush={bypassLinkFlush} navigationRoot={navigationRoot}>
        {children(
          <DailyDraftOutlet outletOverride={outletOverride} bypassGuard={bypassLinkFlush} />,
        )}
      </DailyDraftNavigation>
    </DailyDraftProvider>
  )
}

function DailyDraftNavigation({
  children,
  bypassLinkFlush,
  navigationRoot,
}: {
  children: ReactNode
  bypassLinkFlush: boolean
  navigationRoot?: RefObject<HTMLDivElement | null>
}) {
  const ctx = useDailyDraftContext()
  const navigate = useNavigate()
  const busy = useRef(false)
  const fallbackRoot = useRef<HTMLDivElement>(null)
  const active = useRef(false)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!ctx.isDirty && !ctx.isSaving) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [ctx.isDirty, ctx.isSaving])

  useEffect(() => {
    if (bypassLinkFlush) return
    const root = navigationRoot?.current ?? fallbackRoot.current
    const captureNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return
      if (!(event.target instanceof Element)) return
      const link = event.target.closest('a[href]')
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === '_blank' ||
        link.hasAttribute('download')
      )
        return
      const destination = new URL(link.href)
      if (destination.origin !== window.location.origin) return
      if (ctx.navigationLocked || busy.current) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (!ctx.isDirty && !ctx.isSaving) return
      event.preventDefault()
      event.stopPropagation()
      busy.current = true
      void ctx
        .flush()
        .then(() => {
          if (active.current)
            void navigate(destination.pathname + destination.search + destination.hash)
        })
        .catch(() => {
          // El coordinador conserva borrador y error; la ruta sigue en la nota original.
        })
        .finally(() => {
          busy.current = false
        })
    }
    root?.addEventListener('click', captureNavigation, true)
    return () => root?.removeEventListener('click', captureNavigation, true)
  }, [bypassLinkFlush, ctx, navigate, navigationRoot])

  return navigationRoot ? children : <div ref={fallbackRoot}>{children}</div>
}

function DailyDraftOutlet({
  outletOverride,
  bypassGuard,
}: {
  outletOverride?: ReactNode
  bypassGuard: boolean
}) {
  const ctx = useDailyDraftContext()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const date = routeDate(pathname)
  const onActiveNote = date === ctx.activeDate
  const pending =
    !bypassGuard && (ctx.isDirty || ctx.isSaving || ctx.navigationLocked) && !onActiveNote
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (outletOverride !== undefined) return
    if (!pending && date && date !== ctx.activeDate) {
      void ctx.navigateToDate(date).catch(() => {})
    }
    if (pathname === '/notes' && onActiveNote) {
      void navigate(`/notes/${ctx.activeDate}`, { replace: true })
    }
  }, [ctx, date, pending, pathname, onActiveNote, navigate, outletOverride])

  if (outletOverride !== undefined) return outletOverride
  if (pending)
    return (
      <Alert severity="warning">
        Hay cambios pendientes en la nota del {ctx.activeDate}. Se conserva el texto antes de
        continuar.
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button onClick={() => navigate(`/notes/${ctx.activeDate}`)}>Volver a la nota</Button>
          <Button
            disabled={ctx.navigationLocked}
            onClick={() => {
              void ctx.flush().catch(() => {})
            }}
          >
            Reintentar
          </Button>
          <Button disabled={ctx.navigationLocked} onClick={() => setConfirmDiscard(true)}>
            Descartar cambios
          </Button>
          {confirmDiscard && (
            <Button
              onClick={() => {
                void ctx.discard().then(() => setConfirmDiscard(false))
              }}
            >
              Confirmar descarte
            </Button>
          )}
        </Stack>
      </Alert>
    )
  if (date && !onActiveNote) return <p role="status">Cargando nota…</p>
  return <Outlet />
}
