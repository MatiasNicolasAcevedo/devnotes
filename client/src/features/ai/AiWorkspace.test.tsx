import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'

const options = [
  {
    id: 'groq',
    label: 'GroqCloud',
    available: true,
    models: [
      { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B', category: 'light', available: true },
      {
        id: 'openai/gpt-oss-120b',
        label: 'GPT OSS 120B',
        category: 'alternative',
        available: true,
      },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    available: true,
    models: [
      {
        id: 'gemini-3.1-flash-lite',
        label: 'Gemini 3.1 Flash-Lite',
        category: 'light',
        available: true,
      },
    ],
  },
]

function initial() {
  installAuthBackend({ user: buildAuthUser() })
  server.use(http.get('/api/ai/options', () => HttpResponse.json(options)))
  return renderWithProviders(<AppRoutes />, { route: '/ai?space=work' })
}

describe('IA', () => {
  it('confirma el modelo elegido sin enviar hasta pulsar Enviar y conserva el borrador ante un límite temporal', async () => {
    const turns: unknown[] = []
    server.use(
      http.post('/api/spaces/work/ai/messages', async ({ request }) => {
        expect(request.headers.get('X-XSRF-TOKEN')).toMatch(/^csrf-ficticio-/)
        turns.push(await request.json())
        return HttpResponse.json(
          {
            status: 429,
            code: 'ai-rate-limit',
            detail: 'El proveedor limitó temporalmente la consulta.',
            retryAfter: 17,
          },
          { status: 429, headers: { 'Content-Type': 'application/problem+json' } },
        )
      }),
    )
    const { user } = initial()
    const draft = await screen.findByRole('textbox', { name: 'Mensaje' })
    await user.type(draft, 'Prueba ficticia 🧪')
    await user.click(await screen.findByRole('button', { name: /^Elegir proveedor y modelo$/ }))
    const selector = within(screen.getByRole('dialog', { name: 'Proveedor y modelo' }))
    expect(selector.getByRole('combobox', { name: 'Modelo' })).toHaveValue('openai/gpt-oss-20b')
    await user.selectOptions(selector.getByRole('combobox', { name: 'Proveedor' }), 'gemini')
    expect(selector.getByRole('combobox', { name: 'Modelo' })).toHaveValue('gemini-3.1-flash-lite')
    await user.click(selector.getByRole('button', { name: 'Aplicar' }))
    expect(screen.queryByRole('dialog', { name: 'Proveedor y modelo' })).not.toBeInTheDocument()
    expect(screen.getByText('Se enviará a Gemini · Gemini 3.1 Flash-Lite')).toBeVisible()
    expect(turns).toEqual([])
    await user.click(screen.getByRole('button', { name: /^Enviar$/ }))
    expect(await screen.findByText('Límite temporal del proveedor')).toBeVisible()
    expect(screen.getByRole('status', { name: 'Estado del destino de IA' })).toHaveTextContent(
      'Esperá 17 s',
    )
    expect(draft).toHaveValue('Prueba ficticia 🧪')
    expect(screen.getByRole('button', { name: /^Enviar$/ })).toBeDisabled()
    expect(turns).toEqual([
      { provider: 'gemini', model: 'gemini-3.1-flash-lite', message: 'Prueba ficticia 🧪' },
    ])
  })

  it.each([
    ['ai-rate-limit', 'Límite temporal del proveedor'],
    ['ai-quota', 'Cuota agotada'],
  ])('conserva el aviso %s con Retry-After: 0 y solo reenvía con Enviar', async (code, label) => {
    const turns: unknown[] = []
    server.use(
      http.post('/api/spaces/work/ai/messages', async ({ request }) => {
        turns.push(await request.json())
        return HttpResponse.json(
          { status: 429, code, detail: 'El proveedor limitó la consulta.', retryAfter: 0 },
          {
            status: 429,
            headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '0' },
          },
        )
      }),
    )
    const { user } = initial()
    const draft = await screen.findByRole('textbox', { name: 'Mensaje' })
    await user.type(draft, 'Borrador ficticio')
    const send = screen.getByRole('button', { name: /^Enviar$/ })
    await user.click(send)
    const state = screen.getByRole('status', { name: 'Estado del destino de IA' })
    await waitFor(() => expect(state).toHaveTextContent(label))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(state).toHaveTextContent(label)
    expect(send).toBeEnabled()
    expect(draft).toHaveValue('Borrador ficticio')
    expect(turns).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Elegir otro modelo' }))
    const selector = within(screen.getByRole('dialog', { name: 'Proveedor y modelo' }))
    expect(selector.getByRole('status')).toHaveTextContent(label)
    await user.keyboard('{Escape}')
    expect(turns).toHaveLength(1)
    await user.click(send)
    await waitFor(() => expect(turns).toHaveLength(2))
    expect(draft).toHaveValue('Borrador ficticio')
  })

  it.each([
    [504, 'ai-timeout', 'No responde'],
    [429, 'ai-quota', 'Cuota agotada'],
    [429, 'ai-rate-limit', 'Límite temporal del proveedor'],
    [429, 'ai-busy', 'Ya hay una consulta en curso.'],
  ])('recupera un fallo %s %s sin reenviar', async (status, code, label) => {
    let sends = 0
    server.use(
      http.post('/api/spaces/work/ai/messages', () => {
        sends++
        if (sends === 1)
          return HttpResponse.json(
            { status, code, detail: code === 'ai-busy' ? label : 'El proveedor demoró.' },
            { status, headers: { 'Content-Type': 'application/problem+json' } },
          )
        return HttpResponse.json({
          text: 'Resultado',
          provider: 'groq',
          requestedModel: 'openai/gpt-oss-20b',
        })
      }),
    )
    const { user } = initial()
    const draft = await screen.findByRole('textbox', { name: 'Mensaje' })
    const send = screen.getByRole('button', { name: /^Enviar$/ })
    await user.type(draft, 'Borrador ficticio')
    await user.click(send)
    const state = screen.getByRole('status', { name: 'Estado del destino de IA' })
    await waitFor(() => expect(state).toHaveTextContent(label))
    expect(draft).toHaveValue('Borrador ficticio')
    if (code !== 'ai-busy') {
      expect(send).toBeDisabled()
      const choose = screen.getByRole('button', { name: 'Elegir otro modelo' })
      choose.focus()
      await user.keyboard('{Enter}')
      const selector = within(screen.getByRole('dialog', { name: 'Proveedor y modelo' }))
      expect(selector.getByRole('status')).toHaveTextContent(label)
      await user.keyboard('{Escape}')
      expect(choose).toHaveFocus()
      if (status === 429) expect(state).toHaveTextContent('Consultá su consola')
      await user.click(screen.getByRole('button', { name: 'Volver a intentar' }))
    } else {
      expect(screen.queryByText('Cuota agotada')).not.toBeInTheDocument()
      expect(screen.queryByText('Límite temporal del proveedor')).not.toBeInTheDocument()
    }
    expect(send).toBeEnabled()
    expect(sends).toBe(1)
    await user.click(send)
    expect(await screen.findByText('Resultado')).toBeVisible()
    expect(sends).toBe(2)
  })

  it.each([
    [
      {
        remainingRequestsPerDay: 12,
        remainingTokensPerMinute: 500,
        observedAtEpochMillis: 1795391400000,
      },
      '12 solicitudes restantes por día. 500 tokens restantes por minuto.',
    ],
    [
      { remainingRequestsPerDay: 0, observedAtEpochMillis: 1795391400000 },
      '0 solicitudes restantes por día.',
    ],
    [
      { remainingTokensPerMinute: 0, observedAtEpochMillis: 1795391400000 },
      '0 tokens restantes por minuto.',
    ],
    [{ inputTokens: 12, outputTokens: 500 }, null],
  ])('muestra únicamente cuota observada para %j', async (quota, expected) => {
    server.use(
      http.post('/api/spaces/work/ai/messages', () =>
        HttpResponse.json({
          text: 'Resultado',
          provider: 'groq',
          requestedModel: 'openai/gpt-oss-20b',
          quota,
        }),
      ),
    )
    const { user } = initial()
    await user.type(await screen.findByRole('textbox', { name: 'Mensaje' }), 'Borrador')
    await user.click(screen.getByRole('button', { name: /^Enviar$/ }))
    await screen.findByText('Resultado')
    if (expected) {
      const observation = screen.getByText(/Cuota observada a las/)
      expect(observation).toHaveTextContent(expected)
      expect(observation.querySelector('time')).toHaveAttribute(
        'datetime',
        new Date(1795391400000).toISOString(),
      )
      if (!('remainingRequestsPerDay' in quota))
        expect(observation).not.toHaveTextContent('solicitudes')
      if (!('remainingTokensPerMinute' in quota))
        expect(observation).not.toHaveTextContent('tokens')
    } else {
      expect(screen.queryByText(/Cuota observada a las/)).not.toBeInTheDocument()
    }
  })

  it('cancela por cambio de destino e ignora la respuesta tardía del envío anterior', async () => {
    let releaseReply = () => {}
    const delay = new Promise<void>((resolve) => {
      releaseReply = resolve
    })
    server.use(
      http.post('/api/spaces/work/ai/messages', async () => {
        await delay
        return HttpResponse.json({
          text: '<b>Respuesta tardía</b>',
          provider: 'groq',
          requestedModel: 'openai/gpt-oss-20b',
        })
      }),
    )
    const { user } = initial()
    await screen.findByText('Se enviará a GroqCloud · GPT OSS 20B')
    const draft = screen.getByRole('textbox', { name: 'Mensaje' })
    await user.type(draft, 'Conservar borrador')
    await user.click(screen.getByRole('button', { name: /^Enviar$/ }))
    expect(await screen.findByRole('button', { name: 'Cancelar consulta' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /^Elegir proveedor y modelo$/ }))
    const selector = within(screen.getByRole('dialog', { name: 'Proveedor y modelo' }))
    await user.selectOptions(selector.getByRole('combobox', { name: 'Proveedor' }), 'gemini')
    await user.click(selector.getByRole('button', { name: 'Aplicar' }))
    expect(
      await screen.findByText('Consulta cancelada. Podés volver a enviar el borrador.'),
    ).toBeVisible()
    releaseReply()
    expect(draft).toHaveValue('Conservar borrador')
    expect(screen.queryByText(/Respuesta tardía/)).not.toBeInTheDocument()
  })
})
