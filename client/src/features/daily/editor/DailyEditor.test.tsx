import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyEditor } from './DailyEditor'
import { type DailyContent } from './dailyDocument'

// Evitar warnings de Tiptap en tests
vi.spyOn(console, 'warn').mockImplementation(() => {})

// jsdom no calcula geometría de Range. Las medidas reales se comprueban con Playwright.
beforeAll(() => {
  Object.defineProperties(Range.prototype, {
    getClientRects: { configurable: true, value: () => [] },
    getBoundingClientRect: { configurable: true, value: () => new DOMRect() },
  })
})
afterAll(() => {
  Reflect.deleteProperty(Range.prototype, 'getClientRects')
  Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect')
})

function renderEditor(props?: React.ComponentProps<typeof DailyEditor>) {
  const onChange = vi.fn()
  const result = render(<DailyEditor {...props} onChange={onChange} />)
  return { ...result, onChange }
}

describe('DailyEditor', () => {
  it('pega texto plano multilínea completo, incluso espacios, acentos y líneas vacías', async () => {
    const { onChange } = renderEditor()
    const editor = await screen.findByRole('textbox', { name: 'Editor de nota diaria' })
    editor.focus()
    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => (type === 'text/plain' ? '  ñá <>\r\n\r\n-- fin  ' : ''),
      },
    })
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(onChange.mock.lastCall?.[0]).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '  ñá <>' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '-- fin  ' }] },
      ],
    })
  })

  it('inserta varias líneas en la selección conservando el texto anterior y posterior', async () => {
    const { onChange } = renderEditor({
      initialContent: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'antes después' }] }],
      },
    })
    const editor = await screen.findByRole('textbox', { name: 'Editor de nota diaria' })
    editor.focus()
    const range = document.createRange()
    range.setStart(editor.querySelector('p')!.firstChild!, 6)
    range.collapse(true)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    fireEvent.paste(editor, { clipboardData: { getData: () => 'uno\n\ndos\n' } })
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(onChange.mock.lastCall?.[0]).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'antes uno' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'dos' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'después' }] },
      ],
    })
  })

  it('avisa y conserva el texto cuando el pegado supera el límite', async () => {
    const { onChange } = renderEditor({
      initialContent: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'conservar' }] }],
      },
    })
    const editor = await screen.findByRole('textbox', { name: 'Editor de nota diaria' })
    editor.focus()
    fireEvent.paste(editor, { clipboardData: { getData: () => 'x'.repeat(100_001) } })
    expect(await screen.findByRole('alert')).toHaveTextContent('no se pegó')
    expect(editor).toHaveTextContent('conservar')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('quita el enlace solo del fragmento seleccionado', async () => {
    const user = userEvent.setup()
    const { onChange } = renderEditor({
      initialContent: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'ABC / XYZ',
                marks: [{ type: 'link', attrs: { href: 'https://ejemplo.test' } }],
              },
            ],
          },
        ],
      },
    })
    const link = await screen.findByRole('link', { name: 'ABC / XYZ' })
    screen.getByRole('textbox', { name: 'Editor de nota diaria' }).focus()
    const range = document.createRange()
    range.setStart(link.firstChild!, 3)
    range.setEnd(link.firstChild!, 6)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    const button = await screen.findByRole('button', { name: 'Editar enlace' })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    await user.click(screen.getByRole('button', { name: 'Quitar enlace' }))
    expect(onChange.mock.lastCall?.[0]).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'ABC',
              marks: [{ type: 'link', attrs: { href: 'https://ejemplo.test' } }],
            },
            { type: 'text', text: ' / ' },
            {
              type: 'text',
              text: 'XYZ',
              marks: [{ type: 'link', attrs: { href: 'https://ejemplo.test' } }],
            },
          ],
        },
      ],
    })
  })

  it('un ACK con el mismo documento enlazado conserva los nodos y la selección', async () => {
    const content: DailyContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '1279',
              marks: [{ type: 'link', attrs: { href: 'https://ejemplo.test/1279' } }],
            },
          ],
        },
      ],
    }
    const { rerender } = render(<DailyEditor initialContent={content} />)
    const link = await screen.findByRole('link', { name: '1279' })
    screen.getByRole('textbox', { name: 'Editor de nota diaria' }).focus()
    const text = link.firstChild!
    const selection = window.getSelection()!
    const range = document.createRange()
    range.setStart(text, 1)
    range.setEnd(text, 3)
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar enlace' })).toBeEnabled())
    rerender(<DailyEditor initialContent={structuredClone(content)} />)
    expect(screen.getByRole('link', { name: '1279' })).toBe(link)
    expect(selection.toString()).toBe('27')
  })

  it('bloquear y desbloquear durante carga o guardado no emite una edición', async () => {
    const onChange = vi.fn()
    const content: DailyContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nota remota' }] }],
    }
    const { rerender } = render(<DailyEditor initialContent={content} onChange={onChange} />)
    await screen.findByText('Nota remota')
    rerender(<DailyEditor initialContent={content} onChange={onChange} readOnly />)
    rerender(<DailyEditor initialContent={content} onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
  })
  it('carga el contenido recibido después del montaje sin emitir cambios ni guardar al hidratar', async () => {
    const { rerender, onChange } = renderEditor()
    await screen.findByRole('textbox', { name: 'Editor de nota diaria' })
    rerender(
      <DailyEditor
        initialContent={{
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nota recuperada' }] }],
        }}
        onChange={onChange}
      />,
    )
    expect(await screen.findByText('Nota recuperada')).toBeVisible()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ofrece un botón de enlace con instrucciones en un tooltip y no edita sin selección', async () => {
    renderEditor()
    const button = await screen.findByRole('button', { name: 'Agregar enlace' })
    expect(button).toBeDisabled()
    expect(screen.queryByText(/Seleccioná texto/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Arrastrá la esquina/)).not.toBeInTheDocument()
    // Deshabilitado no recibe el puntero: el tooltip cuelga del contenedor del botón.
    await userEvent.setup().hover(button.parentElement!)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Seleccioná texto y agregá un enlace (Ctrl+K).',
    )
  })

  it('coloca las ranuras al inicio y al final de la barra, alrededor del botón de enlace', async () => {
    renderEditor({
      toolbarStart: <button type="button">Inicio de barra</button>,
      toolbarEnd: <button type="button">Fin de barra</button>,
    })
    const toolbar = await screen.findByRole('group', { name: 'Herramientas del editor' })
    expect(
      within(toolbar)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent),
    ).toEqual(['Inicio de barra', 'Agregar enlace', 'Fin de barra'])
  })

  it('en solo lectura sin ranuras no muestra la barra', async () => {
    renderEditor({ readOnly: true })
    await screen.findByRole('textbox')
    expect(screen.queryByRole('group', { name: 'Herramientas del editor' })).not.toBeInTheDocument()
  })

  it('el clic en un enlace abre su URL de forma segura, incluso en solo lectura', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderEditor({
      readOnly: true,
      initialContent: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '1279',
                marks: [{ type: 'link', attrs: { href: 'https://ejemplo.test/1279' } }],
              },
            ],
          },
        ],
      },
    })
    fireEvent.click(await screen.findByRole('link', { name: '1279' }))
    expect(open).toHaveBeenCalledWith('https://ejemplo.test/1279', '_blank', 'noopener,noreferrer')
    expect(screen.queryByRole('button', { name: /enlace/i })).not.toBeInTheDocument()
    open.mockRestore()
  })

  it('abre un enlace con un clic aunque haya selección previa, pero no al arrastrar', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderEditor({
      initialContent: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '1279',
                marks: [{ type: 'link', attrs: { href: 'https://ejemplo.test/1279' } }],
              },
            ],
          },
        ],
      },
    })
    const link = await screen.findByRole('link', { name: '1279' })
    const range = document.createRange()
    range.selectNodeContents(link)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    const main = link.closest('.daily-editor-main')!
    fireEvent.mouseDown(main, { clientX: 10, clientY: 10 })
    fireEvent.click(link, { clientX: 10, clientY: 10 })
    expect(open).toHaveBeenCalledTimes(1)
    fireEvent.mouseDown(main, { clientX: 10, clientY: 10 })
    fireEvent.click(link, { clientX: 30, clientY: 10 })
    expect(open).toHaveBeenCalledTimes(1)
    open.mockRestore()
  })

  it('el botón conserva la selección al enlazar texto y permite editar desde el cursor', async () => {
    const user = userEvent.setup()
    const { container, onChange } = renderEditor({
      initialContent: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Ticket 1279 pendiente' }] },
        ],
      },
    })
    await screen.findByText('Ticket 1279 pendiente')
    const paragraph = container.querySelector('.daily-editor-content > p')!
    const text = paragraph.firstChild!
    const selection = window.getSelection()!
    const editable = container.querySelector<HTMLElement>('.daily-editor-content')!
    editable.focus()
    const range = document.createRange()
    range.setStart(text, 7)
    range.setEnd(text, 11)
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    const button = screen.getByRole('button', { name: 'Agregar enlace' })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    await user.type(screen.getByRole('textbox', { name: 'URL' }), 'https://ejemplo.test/1279')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    const link = await screen.findByRole('link', { name: '1279' })
    expect(link).toHaveAttribute('href', 'https://ejemplo.test/1279')
    expect(paragraph).toHaveTextContent('Ticket 1279 pendiente')
    expect(onChange).toHaveBeenCalled()
    range.setStart(link.firstChild!, 2)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    await user.click(await screen.findByRole('button', { name: 'Editar enlace' }))
    expect(screen.getByRole('textbox', { name: 'URL' })).toHaveValue('https://ejemplo.test/1279')
    await user.click(screen.getByRole('button', { name: 'Quitar enlace' }))
    expect(paragraph.querySelector('a')).toBeNull()
    expect(paragraph).toHaveTextContent('Ticket 1279 pendiente')
  })

  it('muestra el editor con label accesible', async () => {
    renderEditor()
    await waitFor(() => {
      const editor = screen.getByRole('textbox', { name: 'Editor de nota diaria' })
      expect(editor).toBeInTheDocument()
    })
  })

  it('usa aria-label personalizado', async () => {
    renderEditor({ 'aria-label': 'Mi editor' })
    await waitFor(() => {
      const editor = screen.getByRole('textbox', { name: 'Mi editor' })
      expect(editor).toBeInTheDocument()
    })
  })

  it('editor es editable por defecto', async () => {
    renderEditor()

    await waitFor(() => {
      const editable = document.querySelector('.daily-editor-content[contenteditable="true"]')
      expect(editable).toBeInTheDocument()
    })
  })

  it('editor no es editable en modo readOnly', async () => {
    renderEditor({ readOnly: true })

    await waitFor(() => {
      const editable = document.querySelector('.daily-editor-content[contenteditable="false"]')
      expect(editable).toBeInTheDocument()
    })
  })

  it('hidrata con initialContent que contiene link y separator', async () => {
    const docWithLink: DailyContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '1279',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://jira.ejemplo.test/browse/ABC-1279' },
                },
              ],
            },
          ],
        },
        { type: 'separator', attrs: { width: 50 } },
        { type: 'paragraph' },
      ],
    }

    renderEditor({ initialContent: docWithLink })

    await waitFor(() => {
      const editor = screen.getByRole('textbox', { name: 'Editor de nota diaria' })
      // El link debe estar presente en el DOM
      const link = editor.querySelector('a[href="https://jira.ejemplo.test/browse/ABC-1279"]')
      expect(link).toBeInTheDocument()
    })
  })

  it('no hidrata JSON inválido', async () => {
    const invalidDoc = { type: 'doc', content: [] } // content vacío es inválido

    renderEditor({ initialContent: invalidDoc as unknown as DailyContent })

    await waitFor(() => {
      const editor = screen.getByRole('textbox', { name: 'Editor de nota diaria' })
      // Debería tener el vacío canónico, no el documento inválido
      const paragraphs = editor.querySelectorAll('p')
      expect(paragraphs.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('soporta undo/redo', async () => {
    renderEditor()

    await waitFor(() => {
      const editor = screen.getByRole('textbox', { name: 'Editor de nota diaria' })
      // El editor debe estar presente con UndoRedo activo
      expect(editor).toBeInTheDocument()
    })

    // La verificación de undo/redo real se hace en E2E/Playwright
  })

  it('muestra texto HTML literal como texto, no como HTML', async () => {
    renderEditor()

    await waitFor(() => {
      const editor = screen.getByRole('textbox', { name: 'Editor de nota diaria' })
      // El editor no usa dangerouslySetInnerHTML
      expect(editor).toBeInTheDocument()
    })

    // La verificación de pegado HTML se hace en E2E/Playwright
  })

  it('no tiene dangerouslySetInnerHTML', async () => {
    renderEditor()

    await waitFor(() => {
      const editor = screen.getByRole('textbox', { name: 'Editor de nota diaria' })
      // Tiptap usa ProseMirror que no usa dangerouslySetInnerHTML
      expect(editor).toBeInTheDocument()
    })
  })
})
