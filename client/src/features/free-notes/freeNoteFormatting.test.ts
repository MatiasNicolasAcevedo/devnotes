import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { TextSelection } from '@tiptap/pm/state'
import { expect, it } from 'vitest'
import { applyFormat, freeNoteFormatting } from './freeNoteFormatting'
import { freeNoteLists } from './freeNoteLists'

it('preserves older multiline text and backward selection when converting mixed blocks', () => {
  const editor = new Editor({
    extensions: [Document, Paragraph, Text, ...freeNoteFormatting, ...freeNoteLists],
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'uno\n dos' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'tres' }] }],
            },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'cuatro' }] },
      ],
    },
  })
  try {
    const { doc, tr } = editor.state
    const anchor = doc.content.size - 2
    const head = 2
    editor.view.dispatch(tr.setSelection(TextSelection.create(doc, anchor, head)))

    applyFormat(editor, 3)
    const formatted = editor.state.doc
    expect(formatted.child(0).type.name).toBe('heading')
    expect(formatted.child(0).attrs.level).toBe(3)
    expect(formatted.child(0).textContent).toBe('uno\n dos')
    expect(formatted.child(1).eq(doc.child(1))).toBe(true)
    expect(formatted.child(2).type.name).toBe('heading')
    expect(editor.state.selection).toMatchObject({ anchor, head })

    applyFormat(editor, 'clear')
    expect(editor.state.doc.eq(doc)).toBe(true)
    expect(editor.state.selection).toMatchObject({ anchor, head })
  } finally {
    editor.destroy()
  }
})
