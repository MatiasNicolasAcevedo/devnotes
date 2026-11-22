import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useSession } from '../auth/sessionContext'
import { formatDateLocal } from '../daily/dateUtils'
import { useFreeNotesLinks } from '../free-notes/freeNotesContext'
import { useSpaceHref } from '../spaces/spaceContext'
import { DailyReading, FreeReading } from './ReadingContent'
import { ReadingSelector } from './ReadingSelector'
import { SideReadingContext, type ReadingSource } from './sideReadingContext'

const minimumWidth = 1100

export type ReadingTools = {
  label: string
  href?: string
  open: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}

export function ReadingWorkspace({
  excludeFreeId,
  children,
}: {
  excludeFreeId?: string
  children: (tools: ReadingTools | null) => ReactNode
}) {
  const context = useContext(SideReadingContext)
  const { logoutPending } = useSession()
  const href = useSpaceHref()
  const { noteHref } = useFreeNotesLinks()
  const layout = useRef<HTMLDivElement>(null)
  const writing = useRef<HTMLDivElement>(null)
  const reader = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const changeButton = useRef<HTMLButtonElement>(null)
  const nextFocus = useRef<'heading' | 'tools' | 'change' | null>(null)
  const selectorOrigin = useRef<'tools' | 'change'>('tools')
  const readerId = useId()
  const [wide, setWide] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const selectorOpen = useRef(false)
  useLayoutEffect(() => {
    selectorOpen.current = choosing
  }, [choosing])
  const source = context?.source
  const available = !!context && !logoutPending
  const selected = source?.kind === 'free' && source.id === excludeFreeId ? null : source
  const split = available && wide && !!selected

  useLayoutEffect(() => {
    const element = layout.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const update = (width: number) => {
      if (width < minimumWidth) {
        if (selectorOpen.current || reader.current?.contains(document.activeElement))
          nextFocus.current = 'tools'
        setChoosing(false)
      }
      setWide(width >= minimumWidth)
    }
    update(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!nextFocus.current) return
    const target = nextFocus.current
    nextFocus.current = null
    const control =
      target === 'heading'
        ? heading.current
        : target === 'change'
          ? changeButton.current
          : trigger.current
    if (!control) {
      writing.current
        ?.querySelector<HTMLElement>('[contenteditable="true"][role="textbox"]')
        ?.focus({ preventScroll: true })
    } else {
      control.focus({ preventScroll: true })
    }
  })

  const startChoosing = (origin: 'tools' | 'change') => {
    selectorOrigin.current = origin
    setChoosing(true)
  }
  const change = () => startChoosing('change')
  const closeSelector = () => {
    nextFocus.current = selectorOrigin.current
    setChoosing(false)
  }
  const select = (choice: ReadingSource) => {
    nextFocus.current = 'heading'
    context?.setSource(choice)
    setChoosing(false)
  }
  const close = () => {
    nextFocus.current = 'tools'
    context?.setSource(null)
  }
  const tools: ReadingTools | null =
    available && (wide || selected)
      ? {
          label: wide ? 'Abrir al lado' : 'Ver consulta',
          href:
            wide || !selected
              ? undefined
              : selected.kind === 'daily'
                ? href(`/history/${selected.date}`)
                : noteHref(`/free-notes/${selected.id}`),
          open: () => startChoosing('tools'),
          triggerRef: trigger,
        }
      : null

  const header = (title: string) => (
    <Stack
      direction="row"
      useFlexGap
      sx={{
        alignItems: 'flex-start',
        flexShrink: 0,
        gap: 0.5,
        p: 1,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          id={readerId}
          ref={heading}
          tabIndex={-1}
          component="h2"
          variant="subtitle2"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {title}
        </Typography>
        <Button
          size="small"
          onClick={() =>
            writing.current
              ?.querySelector<HTMLElement>('[contenteditable="true"][role="textbox"]')
              ?.focus({ preventScroll: true })
          }
        >
          Volver a escribir
        </Button>
      </Box>
      <Button size="small" ref={changeButton} onClick={change}>
        Cambiar
      </Button>
      <IconButton aria-label="Cerrar consulta" size="small" onClick={close}>
        <span aria-hidden="true">×</span>
      </IconButton>
    </Stack>
  )

  return (
    <Box
      ref={layout}
      sx={{
        flex: '1 1 auto',
        minWidth: 0,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: split ? 'minmax(440px, 3fr) minmax(320px, 2fr)' : 'minmax(0, 1fr)',
      }}
    >
      <Box
        ref={writing}
        sx={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {children(tools)}
      </Box>
      {split && selected && (
        <Box
          component="aside"
          ref={reader}
          aria-labelledby={readerId}
          sx={{
            minWidth: 0,
            minHeight: 0,
            contain: 'size',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            borderInlineStart: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {selected.kind === 'daily' ? (
            <>
              {header(`Versión del ${formatDateLocal(selected.date)}`)}
              <DailyReading key={selected.date} date={selected.date} onChange={change} />
            </>
          ) : (
            <FreeReading
              key={selected.id}
              id={selected.id}
              onChange={change}
              header={header}
              fallbackTitle={selected.title}
            />
          )}
        </Box>
      )}
      {available && wide && choosing && (
        <ReadingSelector excludeFreeId={excludeFreeId} onSelect={select} onClose={closeSelector} />
      )}
    </Box>
  )
}
