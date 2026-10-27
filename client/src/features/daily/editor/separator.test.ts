import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { Separator, tryConvertToSeparator, tryDeletePreviousSeparator } from './separator'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'

function createEditor(options?: { content?: string; editable?: boolean }) {
  return new Editor({
    extensions: [
      Document.extend({ content: '(paragraph|separator)+' }),
      Paragraph,
      Text,
      UndoRedo,
      Separator,
    ],
    content: options?.content ?? '<p></p>',
    editable: options?.editable ?? true,
  })
}

describe('Separator keyboard shortcuts', () => {
  describe('tryConvertToSeparator — Enter converts commands', () => {
    it('converts --25 to separator width 25', () => {
      const editor = createEditor({ content: '<p>--25</p>' })
      // --25 is 4 chars; paragraph starts at doc pos 1, text at pos 2
      // End of text is at pos 6 (1 + 1 + 4 = 6), but we need to place cursor at end
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)

      const result = tryConvertToSeparator(
        editor.state,
        editor.view.dispatch.bind(editor.view),
        editor.isEditable,
      )
      expect(result).toBe(true)

      expect(editor.state.doc.content.childCount).toBe(2)
      const first = editor.state.doc.content.firstChild
      expect(first?.type.name).toBe('separator')
      expect(first?.attrs.width).toBe(25)
      const second = editor.state.doc.content.child(1)
      expect(second?.type.name).toBe('paragraph')
      expect(second?.content.size).toBe(0)
    })

    it('converts --50 to separator width 50', () => {
      const editor = createEditor({ content: '<p>--50</p>' })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      tryConvertToSeparator(editor.state, editor.view.dispatch.bind(editor.view), editor.isEditable)

      const first = editor.state.doc.content.firstChild
      expect(first?.type.name).toBe('separator')
      expect(first?.attrs.width).toBe(50)
    })

    it('converts --75 to separator width 75', () => {
      const editor = createEditor({ content: '<p>--75</p>' })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      tryConvertToSeparator(editor.state, editor.view.dispatch.bind(editor.view), editor.isEditable)

      const first = editor.state.doc.content.firstChild
      expect(first?.type.name).toBe('separator')
      expect(first?.attrs.width).toBe(75)
    })

    it('converts --- to separator width 100', () => {
      const editor = createEditor({ content: '<p>---</p>' })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      tryConvertToSeparator(editor.state, editor.view.dispatch.bind(editor.view), editor.isEditable)

      const first = editor.state.doc.content.firstChild
      expect(first?.type.name).toBe('separator')
      expect(first?.attrs.width).toBe(100)
    })

    it('preserves following content after conversion', () => {
      const editor = createEditor({ content: '<p>--25</p><p>hello</p>' })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      tryConvertToSeparator(editor.state, editor.view.dispatch.bind(editor.view), editor.isEditable)

      const children = editor.state.doc.content
      expect(children.childCount).toBe(3)
      expect(children.child(0).type.name).toBe('separator')
      expect(children.child(1).type.name).toBe('paragraph')
      expect(children.child(2).textContent).toBe('hello')
    })
  })

  describe('tryConvertToSeparator — Negative cases', () => {
    it('does not convert with leading spaces', () => {
      // HTML parser collapses leading whitespace in <p>, so we must set content programmatically
      const editor = createEditor()
      editor.commands.setContent({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: ' --25' }] }],
      })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      const result = tryConvertToSeparator(editor.state, () => {}, editor.isEditable)
      expect(result).toBe(false)
    })

    it('does not convert with trailing spaces', () => {
      const editor = createEditor()
      editor.commands.setContent({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '--25 ' }] }],
      })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      const result = tryConvertToSeparator(editor.state, () => {}, editor.isEditable)
      expect(result).toBe(false)
    })

    it('does not convert with cursor in middle', () => {
      const editor = createEditor({ content: '<p>--25</p>' })
      editor.commands.setTextSelection(3) // middle of "--25"
      const result = tryConvertToSeparator(editor.state, () => {}, editor.isEditable)
      expect(result).toBe(false)
    })

    it('does not convert with selection', () => {
      const editor = createEditor({ content: '<p>--25</p>' })
      editor.commands.setTextSelection({ from: 2, to: 4 })
      const result = tryConvertToSeparator(editor.state, () => {}, editor.isEditable)
      expect(result).toBe(false)
    })

    it('does not convert in readonly mode', () => {
      const editor = createEditor({ content: '<p>--25</p>', editable: false })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      const result = tryConvertToSeparator(editor.state, () => {}, false)
      expect(result).toBe(false)
    })

    it('does not convert partial command', () => {
      const editor = createEditor({ content: '<p>--2</p>' })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      const result = tryConvertToSeparator(editor.state, () => {}, editor.isEditable)
      expect(result).toBe(false)
    })

    it('does not convert --25 with extra text', () => {
      const editor = createEditor({ content: '<p>--25extra</p>' })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      const result = tryConvertToSeparator(editor.state, () => {}, editor.isEditable)
      expect(result).toBe(false)
    })
  })

  describe('tryDeletePreviousSeparator — Backspace', () => {
    it('deletes separator from empty following paragraph', () => {
      const editor = createEditor({
        content: '<p></p><hr data-type="separator" data-width="50" /><p></p>',
      })
      // Position cursor at start of last paragraph (child 2)
      // child 0: empty paragraph, child 1: separator, child 2: empty paragraph
      const lastParaPos =
        editor.state.doc.content.child(0).nodeSize + editor.state.doc.content.child(1).nodeSize
      editor.commands.setTextSelection(lastParaPos + 1)

      const result = tryDeletePreviousSeparator(
        editor.state,
        editor.view.dispatch.bind(editor.view),
        editor.isEditable,
      )
      expect(result).toBe(true)

      const children = editor.state.doc.content
      expect(children.childCount).toBe(2)
      expect(children.child(0).type.name).toBe('paragraph')
      expect(children.child(1).type.name).toBe('paragraph')
    })

    it('does not delete if paragraph is not empty', () => {
      const editor = createEditor({
        content: '<p></p><hr data-type="separator" data-width="50" /><p>text</p>',
      })
      const lastParaPos =
        editor.state.doc.content.child(0).nodeSize + editor.state.doc.content.child(1).nodeSize
      editor.commands.setTextSelection(lastParaPos + 1)

      const result = tryDeletePreviousSeparator(editor.state, () => {}, editor.isEditable)
      expect(result).toBe(false)
    })

    it('does not delete in readonly mode', () => {
      const editor = createEditor({
        content: '<p></p><hr data-type="separator" data-width="50" /><p></p>',
        editable: false,
      })
      const lastParaPos =
        editor.state.doc.content.child(0).nodeSize + editor.state.doc.content.child(1).nodeSize
      editor.commands.setTextSelection(lastParaPos + 1)

      const result = tryDeletePreviousSeparator(editor.state, () => {}, false)
      expect(result).toBe(false)
    })
  })

  describe('Undo/Redo', () => {
    it('undo recovers command text after conversion', () => {
      const editor = createEditor({ content: '<p>--25</p>' })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      tryConvertToSeparator(editor.state, editor.view.dispatch.bind(editor.view), editor.isEditable)

      expect(editor.state.doc.content.child(0).type.name).toBe('separator')

      editor.commands.undo()

      const first = editor.state.doc.content.firstChild
      expect(first?.type.name).toBe('paragraph')
      expect(first?.textContent).toBe('--25')
    })

    it('redo re-applies separator conversion', () => {
      const editor = createEditor({ content: '<p>--25</p>' })
      editor.commands.setTextSelection(editor.state.doc.content.child(0).content.size + 1)
      tryConvertToSeparator(editor.state, editor.view.dispatch.bind(editor.view), editor.isEditable)

      editor.commands.undo()
      expect(editor.state.doc.content.firstChild?.type.name).toBe('paragraph')

      editor.commands.redo()
      expect(editor.state.doc.content.firstChild?.type.name).toBe('separator')
    })
  })

  describe('Separator node serialization', () => {
    it('serializes separator with correct width', () => {
      const editor = createEditor({
        content: '<p></p><hr data-type="separator" data-width="25" /><p></p>',
      })
      const json = editor.getJSON()
      expect(json.content?.[1].type).toBe('separator')
      expect(json.content?.[1]?.attrs?.width).toBe(25)
    })
  })
})
