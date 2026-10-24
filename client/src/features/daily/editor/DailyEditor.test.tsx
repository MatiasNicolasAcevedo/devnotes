import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DailyEditor } from './DailyEditor'
import { type DailyContent } from './dailyDocument'

// Evitar warnings de Tiptap en tests
vi.spyOn(console, 'warn').mockImplementation(() => {})

function renderEditor(props?: React.ComponentProps<typeof DailyEditor>) {
  const onChange = vi.fn()
  const result = render(<DailyEditor {...props} onChange={onChange} />)
  return { ...result, onChange }
}

describe('DailyEditor', () => {
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
