import { Mark, Node, type Editor } from '@tiptap/core'
import { toggleMark } from '@tiptap/pm/commands'
import { dispatchFreeNoteChange } from './freeNoteHistory'

export const formatOptions = [
  ['paragraph', 'Párrafo'],
  [1, 'Título 1'],
  [2, 'Título 2'],
  [3, 'Título 3'],
  ['bold', 'Negrita'],
  ['clear', 'Quitar formato'],
] as const

type Format = (typeof formatOptions)[number][0]
const headingTags = ['h1', 'h2', 'h3'] as const

const heading = Node.create({
  name: 'heading',
  group: 'block',
  content: 'text*',
  defining: true,
  addAttributes: () => ({ level: { default: 1, rendered: false } }),
  parseHTML: () => headingTags.map((tag, index) => ({ tag, attrs: { level: index + 1 } })),
  renderHTML: ({ node }) => [headingTags[node.attrs.level - 1], 0],
})

function toggleBold(editor: Editor) {
  if (!editor.isEditable) return false
  toggleMark(editor.schema.marks.bold, undefined, {
    includeWhitespace: true,
    removeWhenPresent: false,
  })(editor.state, (tr) => editor.view.dispatch(tr))
  return true
}

const bold = Mark.create({
  name: 'bold',
  parseHTML: () => [{ tag: 'strong' }, { tag: 'b' }],
  renderHTML: () => ['strong', 0],
  addKeyboardShortcuts() {
    return { 'Mod-b': () => toggleBold(this.editor) }
  },
})

export const freeNoteFormatting = [heading, bold]

export function applyFormat(editor: Editor, format: Format) {
  if (!editor.isEditable) return
  if (format === 'bold') {
    toggleBold(editor)
    editor.commands.focus()
    return
  }

  const { doc, schema, selection, storedMarks, tr } = editor.state
  const { from, to, empty } = selection
  const target = typeof format === 'number' ? schema.nodes.heading : schema.nodes.paragraph
  const attrs = typeof format === 'number' ? { level: format } : null
  // Only top-level prose can change block type. List items must remain paragraphs.
  doc.nodesBetween(from, to, (node, position) => {
    if (
      (node.type === schema.nodes.paragraph || node.type === schema.nodes.heading) &&
      !node.hasMarkup(target, attrs)
    ) {
      tr.setNodeMarkup(position, target, attrs)
    }
    return false
  })

  // The block conversions leave each text offset unchanged.
  if (format === 'clear') {
    if (empty) tr.removeStoredMark(schema.marks.bold)
    else tr.removeMark(from, to, schema.marks.bold)
  } else if (empty && storedMarks) {
    tr.setStoredMarks(storedMarks)
  }

  if (tr.docChanged) dispatchFreeNoteChange(editor, tr.scrollIntoView())
  else if (tr.storedMarksSet) editor.view.dispatch(tr)
  editor.commands.focus()
}
