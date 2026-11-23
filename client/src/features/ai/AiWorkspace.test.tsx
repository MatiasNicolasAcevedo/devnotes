import { screen, within } from '@testing-library/react'
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
  it('confirma el modelo elegido sin enviar hasta pulsar Enviar y conserva el borrador al agotar la cuota', async () => {
    const turns: unknown[] = []
    server.use(
      http.post('/api/spaces/work/ai/messages', async ({ request }) => {
        expect(request.headers.get('X-XSRF-TOKEN')).toMatch(/^csrf-ficticio-/)
        turns.push(await request.json())
        return HttpResponse.json(
          { status: 429, detail: 'Cuota agotada.', retryAfter: 17 },
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
    expect(
      await screen.findByText('Cuota agotada. Esperá 17 s para volver a enviar.'),
    ).toBeVisible()
    expect(draft).toHaveValue('Prueba ficticia 🧪')
    expect(turns).toEqual([
      { provider: 'gemini', model: 'gemini-3.1-flash-lite', message: 'Prueba ficticia 🧪' },
    ])
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
