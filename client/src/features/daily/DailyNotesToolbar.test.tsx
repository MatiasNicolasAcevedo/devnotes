import { screen, waitFor, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { NARROW_VIEWPORT, setViewportWidth } from '../../test/viewport'
import { emptyDocument } from './editor/dailyDocument'
import { SaveStatusIndicator } from './SaveStatusIndicator'

const DATE = '2024-06-15'
const DETAIL = `/api/v1/daily-notes/${DATE}`
const LIST = '/api/v1/daily-notes'
const VERSION_CHECK = `/api/v1/daily-versions/${DATE}`
const VERSION_SAVE = `${DETAIL}/version`

function detail(revision = 2) {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    date: DATE,
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'nota del día' }] }],
    },
    revision,
    updatedAt: `${DATE}T10:00:00Z`,
  }
}

function version() {
  return {
    id: '01900000-0000-7000-8000-000000000004',
    date: DATE,
    content: emptyDocument(),
    sourceRevision: 2,
    savedAt: `${DATE}T14:00:00Z`,
  }
}

async function renderNotes() {
  installAuthBackend({ user: buildAuthUser() })
  server.use(
    mock.get(DETAIL, () => HttpResponse.json(detail())),
    mock.get(LIST, () =>
      HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 1 }),
    ),
  )
  const view = renderWithProviders(<AppRoutes />, { route: `/notes/${DATE}` })
  await waitFor(() =>
    expect(screen.getByLabelText('Editor de nota diaria')).toHaveTextContent('nota del día'),
  )
  const toolbar = screen.getByRole('group', { name: 'Herramientas del editor' })
  return { ...view, toolbar }
}

/** `a` aparece antes que `b` en el documento. */
function precedes(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(HTMLInputElement.prototype, 'showPicker')
})

describe('Notas · una sola barra de herramientas (UI-05)', () => {
  it('en ancho reúne fecha, Hoy, enlace, estado, copiar y guardar versión, en ese orden', async () => {
    const { toolbar } = await renderNotes()

    const date = within(toolbar).getByRole('button', { name: 'Cambiar fecha (15/06)' })
    expect(date).toHaveTextContent('15/06')
    const today = within(toolbar).getByRole('link', { name: 'Hoy' })
    expect(today).toHaveAttribute('href', '/notes?space=work')
    const link = within(toolbar).getByRole('button', { name: 'Agregar enlace' })
    expect(link).toHaveTextContent('Enlace')
    const status = within(toolbar).getByRole('status', { name: 'Estado de guardado' })
    expect(status).toHaveAttribute('aria-live', 'polite')
    const copy = within(toolbar).getByRole('button', { name: 'Copiar nota' })
    expect(copy).toHaveTextContent('')
    const save = await within(toolbar).findByRole('button', { name: 'Guardar versión' })
    expect(save).toHaveTextContent('')

    const order = [date, today, link, status, copy, save]
    for (let index = 1; index < order.length; index++) {
      expect(precedes(order[index - 1], order[index])).toBe(true)
    }
    // El selector nativo queda dentro de la barra, operable y con su etiqueta, sin fila propia.
    const input = within(toolbar).getByLabelText('Fecha')
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveValue(DATE)
    expect(input).toBeEnabled()
    expect(getComputedStyle(input).display).not.toBe('none')
  })

  it('el título queda solo para lectores de pantalla y no hay textos de ayuda', async () => {
    await renderNotes()

    const heading = screen.getByRole('heading', { level: 1, name: 'Notas diarias' })
    expect(heading).toHaveStyle({ position: 'absolute', width: '1px', height: '1px' })
    expect(screen.queryByText(/Seleccioná texto y agregá un enlace/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Arrastrá la esquina inferior derecha/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Notas guardadas' })).toBeVisible()
  })

  it('el botón de fecha abre el selector nativo del input', async () => {
    const showPicker = vi.fn()
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      value: showPicker,
    })
    const { user, toolbar } = await renderNotes()

    await user.click(within(toolbar).getByRole('button', { name: 'Cambiar fecha (15/06)' }))

    expect(showPicker).toHaveBeenCalledOnce()
    expect(showPicker.mock.instances[0]).toBe(within(toolbar).getByLabelText('Fecha'))
  })

  it('sin selector nativo, el botón de fecha lleva el foco al input', async () => {
    const { user, toolbar } = await renderNotes()

    await user.click(within(toolbar).getByRole('button', { name: 'Cambiar fecha (15/06)' }))

    expect(within(toolbar).getByLabelText('Fecha')).toHaveFocus()
  })

  it('el botón de enlace explica su uso en un tooltip', async () => {
    const { user, toolbar } = await renderNotes()

    // Sin selección el botón está deshabilitado y no recibe el puntero: el tooltip cuelga de su contenedor.
    const link = within(toolbar).getByRole('button', { name: 'Agregar enlace' })
    expect(link).toBeDisabled()
    await user.hover(link.parentElement!)

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Seleccioná texto y agregá un enlace (Ctrl+K).',
    )
  })

  it('en angosto Hoy, enlace y copiar son iconos con nombre accesible', async () => {
    setViewportWidth(NARROW_VIEWPORT)
    const { toolbar } = await renderNotes()

    const today = within(toolbar).getByRole('link', { name: 'Ir a hoy' })
    expect(today).toHaveAttribute('href', '/notes?space=work')
    expect(today).toHaveTextContent('')
    expect(within(toolbar).queryByRole('link', { name: 'Hoy' })).not.toBeInTheDocument()
    const link = within(toolbar).getByRole('button', { name: 'Agregar enlace' })
    expect(link).toHaveTextContent('')
    expect(
      within(toolbar).getByRole('button', { name: 'Cambiar fecha (15/06)' }),
    ).toHaveTextContent('15/06')
    expect(within(toolbar).getByRole('button', { name: 'Copiar nota' })).toHaveTextContent('')
    expect(await within(toolbar).findByRole('button', { name: 'Guardar versión' })).toBeEnabled()
  })

  it('el disquete confirma el reemplazo, guarda la versión y avisa en la fila inferior de la barra', async () => {
    let posted = 0
    const { user, toolbar } = await renderNotes()
    server.use(
      mock.get(VERSION_CHECK, () => HttpResponse.json(version())),
      mock.post(VERSION_SAVE, () => {
        posted++
        return HttpResponse.json(version())
      }),
    )

    const save = await within(toolbar).findByRole('button', { name: 'Guardar versión' })
    await user.click(save)
    const dialog = await screen.findByRole('dialog', { name: 'Reemplazar versión existente' })
    expect(dialog).toHaveTextContent('15/06/2024')
    expect(posted).toBe(0)
    await user.click(within(dialog).getByRole('button', { name: 'Reemplazar' }))

    const notice = await within(toolbar).findByText('Versión guardada correctamente.')
    expect(posted).toBe(1)
    expect(precedes(save, notice)).toBe(true)
    await waitFor(() =>
      expect(within(toolbar).getByRole('button', { name: 'Guardar versión' })).toBeDisabled(),
    )
  })

  it('un conflicto al guardar la versión se explica debajo de la barra, con el mismo texto', async () => {
    const { user, toolbar } = await renderNotes()
    server.use(
      mock.get(VERSION_CHECK, () => problemResponse(404, { title: 'Not Found' })),
      mock.post(VERSION_SAVE, () => problemResponse(409)),
    )

    await user.click(await within(toolbar).findByRole('button', { name: 'Guardar versión' }))

    const alert = await within(toolbar).findByRole('alert')
    expect(alert).toHaveTextContent('Conflicto de revisión')
    expect(alert).toHaveTextContent(
      'La revisión del trabajo ha cambiado. Recarga la página y vuelve a intentarlo.',
    )
  })
})

describe('Estado de guardado (UI-05)', () => {
  it.each([
    ['saving', false, 'Guardando…'],
    ['saved', false, 'Guardado'],
    ['idle', true, 'Sin guardar'],
  ] as const)('en ancho %s muestra icono y texto', (status, isDirty, text) => {
    renderWithProviders(<SaveStatusIndicator status={status} isDirty={isDirty} />)

    const region = screen.getByRole('status', { name: 'Estado de guardado' })
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(within(region).getByText(text)).toBeVisible()
    expect(region.querySelector('svg, [role="progressbar"]')).not.toBeNull()
  })

  it.each([
    ['saving', false, 'Guardando…'],
    ['saved', false, 'Guardado'],
    ['idle', true, 'Sin guardar'],
  ] as const)(
    'en angosto %s muestra solo el icono, con nombre accesible',
    (status, isDirty, text) => {
      setViewportWidth(NARROW_VIEWPORT)
      renderWithProviders(<SaveStatusIndicator status={status} isDirty={isDirty} />)

      const region = screen.getByRole('status', { name: 'Estado de guardado' })
      expect(within(region).getByRole('img', { name: text })).toBeVisible()
      expect(region).toHaveTextContent('')
    },
  )

  it.each([
    ['idle', false],
    ['error', true],
    ['conflict', true],
  ] as const)(
    'con %s la región queda vacía: los avisos largos van en la fila inferior',
    (status, isDirty) => {
      renderWithProviders(<SaveStatusIndicator status={status} isDirty={isDirty} />)

      const region = screen.getByRole('status', { name: 'Estado de guardado' })
      expect(region).toBeEmptyDOMElement()
    },
  )
})
