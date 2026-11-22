import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLayoutEffect, useRef, useState } from 'react'
import { ApiError } from '../../services/http'
import { sessionEvents } from '../../services/sessionEvents'
import { authQueryKeys, type AuthUser } from '../auth/api'
import { useSession } from '../auth/sessionContext'
import { SPACE_LABELS } from '../spaces/space'
import { dailyNoteKeys, getPreviousDailyNote, isCopySourceConflict } from './api'
import { useDailyDraftContext } from './DailyDraftProvider'
import { formatDateLocal } from './dateUtils'

const reloadMessage = 'No se pudo confirmar la copia. Revisá la nota de destino antes de repetirla.'

export function CopyPreviousNote() {
  const ctx = useDailyDraftContext()
  const { activeDate, owner, space, isCopyingPrevious, confirmedCopy, copyTargetNeedsReload } = ctx
  const { csrfReady, logoutPending } = useSession()
  const queryClient = useQueryClient()
  const mounted = useRef(false)
  const logoutGeneration = useRef(0)
  const [message, setMessage] = useState<string | null>(null)
  useLayoutEffect(() => {
    mounted.current = true
    const unsubscribe = sessionEvents.onLogoutStarted(() => {
      logoutGeneration.current++
    })
    return () => {
      mounted.current = false
      unsubscribe()
    }
  }, [])

  const isCurrentOwner = () =>
    mounted.current &&
    queryClient.getQueryData<AuthUser | null>(authQueryKeys.session)?.id === owner
  const showOffer = ctx.canCopyPrevious && !logoutPending
  const suggestion = useQuery({
    queryKey: dailyNoteKeys(owner, space).previous(activeDate),
    queryFn: ({ signal }) => getPreviousDailyNote(space, activeDate, signal, isCurrentOwner),
    enabled: showOffer && !ctx.navigationLocked,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const source = suggestion.data
  const spaceLabel = SPACE_LABELS[space]
  const sourceLabel = source ? formatDateLocal(source.sourceDate) : ''

  const reloadTarget = async () => {
    const generation = logoutGeneration.current
    const isCurrent = () => isCurrentOwner() && generation === logoutGeneration.current
    if (await ctx.reloadCopyTarget(isCurrent)) {
      setMessage(null)
    } else if (isCurrent()) {
      setMessage('No se pudo cargar la nota de destino. Volvé a intentarlo.')
    }
  }

  const copy = async () => {
    if (!source || !showOffer || !csrfReady || ctx.navigationLocked) return
    const generation = logoutGeneration.current
    const isCurrent = () => isCurrentOwner() && generation === logoutGeneration.current
    setMessage(null)
    try {
      await ctx.copyPrevious(source, ctx.revision, isCurrent)
    } catch (error) {
      if (!isCurrent()) return
      const code = error instanceof ApiError ? error.problem?.code : undefined
      if (isCopySourceConflict(error)) {
        setMessage(
          code === 'COPY_SOURCE_CHANGED'
            ? 'La nota de origen cambió. Volvé a revisar la sugerencia.'
            : 'La nota de origen ya no está disponible. Revisá la nueva sugerencia.',
        )
        void suggestion.refetch()
      } else {
        if (code === 'COPY_TARGET_NOT_EMPTY') {
          setMessage('La nota de destino ya tiene contenido. Recargala para revisarla.')
        } else if (code === 'COPY_TARGET_CHANGED') {
          setMessage('La nota de destino cambió. Recargala para revisarla.')
        } else {
          setMessage(reloadMessage)
        }
      }
    }
  }

  const copied =
    confirmedCopy && !ctx.isDirty && ctx.revision === confirmedCopy.note.revision && !logoutPending
  if (!showOffer && !isCopyingPrevious && !copied && !copyTargetNeedsReload) return null

  return (
    <Box sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
      {(message || copyTargetNeedsReload) && (
        <Alert
          severity="warning"
          action={
            copyTargetNeedsReload && (
              <Button
                color="inherit"
                disabled={ctx.isReloadingCopyTarget || logoutPending || ctx.navigationLocked}
                onClick={reloadTarget}
              >
                Recargar nota
              </Button>
            )
          }
        >
          {message ?? reloadMessage}
        </Alert>
      )}
      {copied && (
        <Typography role="status" variant="body2" color="success.main">
          Copiada del {formatDateLocal(confirmedCopy.sourceDate)}
        </Typography>
      )}
      {(showOffer || isCopyingPrevious) &&
        (isCopyingPrevious || (!suggestion.isFetching && !suggestion.isError && source) ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.25, sm: 2 }}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="body2">
              Empezar con tu última nota de {spaceLabel}
              {sourceLabel && ` · Copiar del ${sourceLabel}`}
            </Typography>
            <Button
              variant="outlined"
              sx={{ minHeight: 44, flexShrink: 0 }}
              aria-label={
                isCopyingPrevious
                  ? undefined
                  : `Copiar nota del ${sourceLabel} a ${formatDateLocal(activeDate)} en ${spaceLabel}`
              }
              disabled={ctx.navigationLocked || !csrfReady}
              onClick={copy}
            >
              {isCopyingPrevious ? 'Copiando…' : 'Copiar nota anterior'}
            </Button>
          </Stack>
        ) : suggestion.isError && !suggestion.isFetching ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => void suggestion.refetch()}>
                Reintentar
              </Button>
            }
          >
            No se pudo buscar la nota anterior.
          </Alert>
        ) : (
          <Typography role="status" variant="body2" color="text.secondary">
            {suggestion.isFetching || suggestion.isPending
              ? 'Buscando la nota anterior…'
              : `Todavía no hay una nota anterior en ${spaceLabel}`}
          </Typography>
        ))}
    </Box>
  )
}
