import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { DailyDraftProvider, useDailyDraftContext } from './DailyDraftProvider'
import { isValidIsoDate, todayLocal } from './dateUtils'
import { readSpaceParam, spaceHref, type Space } from '../spaces/space'

function routeDate(pathname: string) {
  if (pathname === '/notes') return todayLocal()
  const date = /^\/notes\/(\d{4}-\d{2}-\d{2})$/.exec(pathname)?.[1]
  return date && isValidIsoDate(date) ? date : null
}

/**
 * Se crea al visitar notas y permanece sobre el shell hasta terminar la sesión o cambiar el espacio confirmado.
 * Solo una URL de notas cuyo `space` coincide con el confirmado crea el borrador: una URL inválida o de otro espacio
 * nunca lee ni escribe aquí.
 */
export function DailyDraftWorkspace({
  owner,
  space,
  outletOverride,
  bypassLinkFlush = false,
  navigationRoot,
  children,
}: {
  owner: string
  space: Space | null
  outletOverride?: ReactNode
  bypassLinkFlush?: boolean
  navigationRoot?: RefObject<HTMLDivElement | null>
  children: (outlet: ReactNode) => ReactNode
}) {
  const { pathname, search } = useLocation()
  const routeSpace = readSpaceParam(search)
  const inSpace = space !== null && routeSpace.kind === 'valid' && routeSpace.space === space
  const requestedDate = outletOverride === undefined && inSpace ? routeDate(pathname) : null
  const scope = `${owner}/${space ?? ''}`
  const [workspace, setWorkspace] = useState({ scope, initialDate: requestedDate })
  const initialDate = workspace.scope === scope ? workspace.initialDate : requestedDate
  if (workspace.scope !== scope || (!initialDate && requestedDate)) {
    setWorkspace({ scope, initialDate: requestedDate })
  }
  if (!owner || !space || !initialDate) return children(outletOverride ?? <Outlet />)
  return (
    <DailyDraftProvider key={scope} owner={owner} space={space} initialDate={initialDate}>
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
  const isTodayAlias = pathname === '/notes'
  const noteHref = spaceHref(`/notes/${ctx.activeDate}`, ctx.space)
  const onActiveNote = date === ctx.activeDate
  const pending =
    !bypassGuard && (ctx.isDirty || ctx.isSaving || ctx.navigationLocked) && !onActiveNote
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (outletOverride !== undefined) return
    if (!pending && date && date !== ctx.activeDate) {
      void ctx.navigateToDate(date).catch(() => {})
    }
    if (isTodayAlias && onActiveNote) {
      void navigate(noteHref, { replace: true })
    }
  }, [ctx, date, pending, isTodayAlias, onActiveNote, navigate, outletOverride, noteHref])

  if (outletOverride !== undefined) return outletOverride
  if (pending)
    return (
      <Alert severity="warning">
        Hay cambios pendientes en la nota del {ctx.activeDate}. Se conserva el texto antes de
        continuar.
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button onClick={() => navigate(noteHref)}>Volver a la nota</Button>
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
  // El selector debe montarse en la URL definitiva: el replace de hoy podría pisar su navegación.
  if (isTodayAlias || (date && !onActiveNote)) return <p role="status">Cargando nota…</p>
  return <Outlet />
}
