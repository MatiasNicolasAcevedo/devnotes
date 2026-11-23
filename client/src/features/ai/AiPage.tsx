import { Alert, Box, Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { ApiError, NetworkError } from '../../services/http'
import { CopyButton } from '../../shared/ui/CopyButton'
import { useSession } from '../auth/sessionContext'
import { useOptionalActiveSpace } from '../spaces/spaceContext'
import { AI_ACCENT, AI_INK, destinationKey, modelStatus, useAi, type ModelIssue } from './aiContext'
import {
  countPoints,
  MAX_POINTS,
  sendAiMessage,
  type AiOutput,
  type Destination,
  type Excerpt,
} from './api'
import { AiFragmentDialog } from './AiFragmentDialog'
import { AiModelStatus } from './AiModelStatus'

type Turn = { message: string; excerpt: Excerpt | null; answer: AiOutput; key: string }

function issueFrom(error: unknown): ModelIssue | null {
  const api = error instanceof ApiError ? error : null
  const reason = api?.problem?.detail
  switch (api?.problem?.code) {
    case 'ai-quota':
    case 'ai-rate-limit': {
      const wait = api.problem.retryAfter
      const validWait = typeof wait === 'number' && Number.isInteger(wait) && wait >= 0
      return {
        kind: 'limited',
        quotaExhausted: api.problem.code === 'ai-quota',
        retryAt: validWait ? Date.now() + wait * 1000 : null,
        reason: validWait
          ? `Esperá ${wait} s desde el aviso para volver a enviar.`
          : 'El proveedor limitó la consulta. Consultá su consola o habilitá un intento manual.',
      }
    }
    case 'ai-model':
      return { kind: 'unavailable', reason: 'Actualizá el catálogo o elegí otro modelo.' }
  }
  if (error instanceof NetworkError || (api && api.status >= 500)) {
    return {
      kind: 'unresponsive',
      reason: `${reason ?? 'La consulta falló temporalmente.'} Podés elegir otro modelo y confirmar Enviar.`,
    }
  }
  return null
}

export function AiPage() {
  const { user } = useSession()
  const space = useOptionalActiveSpace()
  if (!user) return <Alert severity="info">Iniciá sesión para acceder a IA.</Alert>
  if (!space) return null
  return <Composer key={`${user.id}/${space}`} />
}

function Composer() {
  const ai = useAi()
  const { state } = useLocation()
  const space = useOptionalActiveSpace()
  const { csrfReady, logoutPending } = useSession()
  const excerptKey = state && typeof state.excerptKey === 'string' ? state.excerptKey : null
  const incoming = ai?.pending
  const [excerpt, setExcerpt] = useState<Excerpt | null>(() =>
    incoming && incoming.key === excerptKey ? incoming.excerpt : null,
  )
  const [message, setMessage] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState('')
  const [inFlight, setInFlight] = useState(false)
  const pendingRequest = useRef<{ controller: AbortController; destination: Destination }>(null)
  const currentSession = useRef(false)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (incoming && incoming.key === excerptKey) ai?.clearExcerpt(incoming.key)
  }, [ai, excerptKey, incoming])

  useLayoutEffect(() => {
    currentSession.current = true
    return () => {
      currentSession.current = false
      pendingRequest.current?.controller.abort()
      pendingRequest.current = null
    }
  }, [])

  const destination = ai?.destination
  const provider = ai?.options?.find((item) => item.id === destination?.provider)
  const model = provider?.models.find((item) => item.id === destination?.model)
  const issue = destination ? ai?.issues[destinationKey(destination)] : undefined
  const status = modelStatus(ai?.options, Boolean(ai?.failed), destination ?? null, issue)
  const allowed = status.tone === 'success'
  useLayoutEffect(() => {
    const request = pendingRequest.current
    if (request && (request.destination !== destination || !allowed || logoutPending)) {
      request.controller.abort()
    }
  }, [destination, allowed, logoutPending])

  if (!ai || !space) return null

  function cancel() {
    pendingRequest.current?.controller.abort()
    pendingRequest.current = null
    setInFlight(false)
    setNotice('Consulta cancelada. Podés volver a enviar el borrador.')
  }

  const size = countPoints(message) + countPoints(excerpt?.text ?? '')
  async function send() {
    if (
      !space ||
      !destination ||
      !allowed ||
      !csrfReady ||
      logoutPending ||
      pendingRequest.current ||
      size > MAX_POINTS ||
      !(message.trim() || excerpt?.text.trim())
    )
      return
    const controller = new AbortController()
    const request = { controller, destination }
    pendingRequest.current = request
    setInFlight(true)
    setNotice('Enviando consulta…')
    try {
      const answer = await sendAiMessage(
        space,
        destination,
        message,
        excerpt,
        controller.signal,
        () => currentSession.current && !controller.signal.aborted,
      )
      if (pendingRequest.current !== request) return
      controller.signal.throwIfAborted()
      setTurns((previous) => [...previous, { message, excerpt, answer, key: crypto.randomUUID() }])
      setMessage('')
      setExcerpt(null)
      setNotice('Respuesta lista.')
    } catch (error) {
      if (pendingRequest.current !== request) return
      if (controller.signal.aborted) {
        setNotice('Consulta cancelada. Podés volver a enviar el borrador.')
        return
      }
      const issue = issueFrom(error)
      if (issue) ai?.setIssue(destination, issue)
      setNotice(
        issue
          ? ''
          : (error instanceof ApiError && error.problem?.detail) ||
              'No se pudo completar la consulta. El borrador sigue disponible.',
      )
    } finally {
      if (pendingRequest.current === request) {
        pendingRequest.current = null
        setInFlight(false)
      }
    }
  }

  function reuse(turn: Turn) {
    setMessage(turn.message)
    setExcerpt(turn.excerpt)
    input.current?.focus()
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 780, mx: 'auto', my: { xs: 1, sm: 2.5 }, minWidth: 0 }}>
      <Stack
        direction="row"
        sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
          IA
        </Typography>
        <Button
          aria-haspopup="dialog"
          onClick={(event) => ai.open(event.currentTarget)}
          sx={{
            color: AI_ACCENT,
            minHeight: 44,
            maxWidth: '100%',
            textAlign: 'left',
            overflowWrap: 'anywhere',
          }}
        >
          {provider && model ? `${provider.label} · ${model.label}` : 'Elegir proveedor y modelo'}
        </Button>
      </Stack>
      {turns.map((turn) => (
        <Paper
          key={turn.key}
          variant="outlined"
          sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, overflowWrap: 'anywhere' }}
        >
          <Stack spacing={1}>
            <Stack
              direction="row"
              sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', flex: '1 1 250px' }}>
                {turn.message}
              </Typography>
              <Button onClick={() => reuse(turn)} disabled={inFlight}>
                Usar mensaje
              </Button>
            </Stack>
            {turn.excerpt && (
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {turn.excerpt.text}
              </Typography>
            )}
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Pedido {turn.answer.requestedModel}
              {turn.answer.servedModel ? ` · Servido ${turn.answer.servedModel}` : ''}
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{turn.answer.text}</Typography>
            {turn.answer.provider === 'groq' && <GroqQuota quota={turn.answer.quota} />}
            <Box>
              <CopyButton text={turn.answer.text} aria-label="Copiar texto">
                Copiar texto
              </CopyButton>
            </Box>
          </Stack>
        </Paper>
      ))}
      <Paper
        component="form"
        variant="outlined"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
        sx={{ p: { xs: 1.25, sm: 2 }, borderTop: `2px solid ${AI_ACCENT}`, minWidth: 0 }}
      >
        <Stack spacing={1.5}>
          <TextField
            label="Mensaje"
            placeholder="Escribí un mensaje…"
            inputRef={input}
            multiline
            minRows={4}
            maxRows={12}
            fullWidth
            value={message}
            disabled={inFlight}
            onChange={(event) => setMessage(event.target.value)}
            error={size > MAX_POINTS}
            helperText={`${size} / ${MAX_POINTS} caracteres Unicode`}
          />
          {excerpt && (
            <FragmentPreview excerpt={excerpt} setExcerpt={setExcerpt} disabled={inFlight} />
          )}
          <Button
            disabled={inFlight}
            sx={{ alignSelf: 'flex-start', minHeight: 44 }}
            onClick={() => setPicking(true)}
          >
            Añadir fragmento
          </Button>
          <Divider />
          <Stack
            direction="row"
            sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {allowed && `Se enviará a ${provider?.label} · ${model?.label}`}
            </Typography>
            {inFlight ? (
              <Button onClick={cancel}>Cancelar consulta</Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                disabled={
                  !allowed ||
                  !csrfReady ||
                  logoutPending ||
                  size > MAX_POINTS ||
                  !(message.trim() || excerpt?.text.trim())
                }
                sx={{
                  minHeight: 44,
                  ml: 'auto',
                  bgcolor: AI_ACCENT,
                  color: AI_INK,
                  '&:hover': { bgcolor: '#ddcaff' },
                }}
              >
                <span aria-hidden="true">✦&nbsp;</span>Enviar
              </Button>
            )}
          </Stack>
          <Stack
            role="status"
            aria-label="Estado del destino de IA"
            aria-live="polite"
            aria-atomic="true"
            spacing={0.5}
          >
            <AiModelStatus status={status} />
            {notice && <Typography variant="body2">{notice}</Typography>}
          </Stack>
          {(issue || ai.failed || (ai.options && !allowed)) && (
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Button aria-haspopup="dialog" onClick={(event) => ai.open(event.currentTarget)}>
                Elegir otro modelo
              </Button>
              {(ai.failed || issue?.kind === 'unavailable') && (
                <Button loading={ai.refreshing} onClick={() => void ai.refresh()}>
                  Actualizar catálogo
                </Button>
              )}
              {destination &&
                !ai.failed &&
                provider?.available &&
                model?.available &&
                (issue?.kind === 'unresponsive' ||
                  (issue?.kind === 'limited' && issue.retryAt === null)) && (
                  <Button
                    onClick={() => {
                      ai.setIssue(destination, null)
                      setNotice(
                        'Destino habilitado. Confirmá con Enviar para compartir el borrador.',
                      )
                      input.current?.focus()
                    }}
                  >
                    Volver a intentar
                  </Button>
                )}
            </Stack>
          )}
        </Stack>
      </Paper>
      {picking && (
        <AiFragmentDialog
          close={() => setPicking(false)}
          attach={(value) => {
            setExcerpt(value)
            setPicking(false)
          }}
        />
      )}
    </Stack>
  )
}

function GroqQuota({ quota }: { quota: AiOutput['quota'] }) {
  const observed = quota?.observedAtEpochMillis
  const requests = quota?.remainingRequestsPerDay
  const tokens = quota?.remainingTokensPerMinute
  if (observed === undefined || (requests === undefined && tokens === undefined)) return null
  const date = new Date(observed)
  if (Number.isNaN(date.getTime())) return null
  return (
    <Typography variant="caption" color="text.secondary">
      {requests !== undefined && `${requests} solicitudes restantes por día. `}
      {tokens !== undefined && `${tokens} tokens restantes por minuto. `}
      Cuota observada a las{' '}
      <time dateTime={date.toISOString()} title={date.toLocaleString()}>
        {date.toLocaleTimeString()}
      </time>
      .
    </Typography>
  )
}

function FragmentPreview({
  excerpt,
  setExcerpt,
  disabled,
}: {
  excerpt: Excerpt
  setExcerpt: (excerpt: Excerpt | null) => void
  disabled: boolean
}) {
  const [range, setRange] = useState({ from: 0, to: 0 })
  const available = range.to > range.from && range.to <= excerpt.text.length
  return (
    <Box sx={{ borderLeft: `2px solid ${AI_ACCENT}`, pl: 1, minWidth: 0 }}>
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={7}
        label="Fragmento a compartir"
        value={excerpt.text}
        slotProps={{ input: { readOnly: true } }}
        onSelect={(event) => {
          const field = event.target
          if (field instanceof HTMLTextAreaElement)
            setRange({ from: field.selectionStart, to: field.selectionEnd })
        }}
      />
      <Button
        size="small"
        disabled={!available || disabled}
        onClick={() => {
          setExcerpt({
            ...excerpt,
            start: excerpt.start + countPoints(excerpt.text.slice(0, range.from)),
            text: excerpt.text.slice(range.from, range.to),
          })
          setRange({ from: 0, to: 0 })
        }}
      >
        Usar solo la selección
      </Button>
      <Button size="small" disabled={disabled} onClick={() => setExcerpt(null)}>
        Quitar fragmento
      </Button>
    </Box>
  )
}
