import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
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
  children,
}: {
  owner: string
  children: (outlet: ReactNode) => ReactNode
}) {
  const { pathname } = useLocation()
  const requestedDate = routeDate(pathname)
  const [workspace, setWorkspace] = useState({ owner, initialDate: requestedDate })
  const initialDate = workspace.owner === owner ? workspace.initialDate : requestedDate
  if (workspace.owner !== owner || (!initialDate && requestedDate)) {
    setWorkspace({ owner, initialDate: requestedDate })
  }
  if (!owner || !initialDate) return children(<Outlet />)
  return (
    <DailyDraftProvider key={owner} owner={owner} initialDate={initialDate}>
      <DailyDraftNavigation>{children(<DailyDraftOutlet />)}</DailyDraftNavigation>
    </DailyDraftProvider>
  )
}

function DailyDraftNavigation({ children }: { children: ReactNode }) {
  const ctx = useDailyDraftContext()
  const navigate = useNavigate()
  const busy = useRef(false)

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!ctx.isDirty && !ctx.isSaving) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [ctx.isDirty, ctx.isSaving])

  const captureNavigation = (event: MouseEvent<HTMLDivElement>) => {
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
      .then(() => navigate(destination.pathname + destination.search + destination.hash))
      .catch(() => {
        // El coordinador conserva borrador y error; la ruta sigue en la nota original.
      })
      .finally(() => {
        busy.current = false
      })
  }

  return <div onClickCapture={captureNavigation}>{children}</div>
}

function DailyDraftOutlet() {
  const ctx = useDailyDraftContext()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const date = routeDate(pathname)
  const onActiveNote = date === ctx.activeDate
  const pending = (ctx.isDirty || ctx.isSaving || ctx.navigationLocked) && !onActiveNote
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (!pending && date && date !== ctx.activeDate) {
      void ctx.navigateToDate(date).catch(() => {})
    }
    if (pathname === '/notes' && onActiveNote) {
      void navigate(`/notes/${ctx.activeDate}`, { replace: true })
    }
  }, [ctx, date, pending, pathname, onActiveNote, navigate])

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
