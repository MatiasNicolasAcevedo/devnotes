import { Extension, Node, type Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { canSplit } from '@tiptap/pm/transform'
import { dispatchFreeNoteChange } from './freeNoteHistory'

export const listOptions = [
  ['bulletList', 'Viñetas'],
  ['taskList', 'Casillas'],
  ['orderedList', 'Numerada'],
  ['paragraph', 'Sin lista'],
] as const

type BlockType = (typeof listOptions)[number][0]

const bulletList = Node.create({
  name: 'bulletList',
  group: 'block',
  content: 'listItem+',
  parseHTML: () => [{ tag: 'ul:not([data-type="taskList"])' }],
  renderHTML: () => ['ul', 0],
})

const orderedList = Node.create({
  name: 'orderedList',
  group: 'block',
  content: 'listItem+',
  addAttributes: () => ({ start: { default: 1, rendered: false, parseHTML: () => 1 } }),
  parseHTML: () => [{ tag: 'ol' }],
  renderHTML: () => ['ol', 0],
})

const taskList = Node.create({
  name: 'taskList',
  group: 'block',
  content: 'taskItem+',
  parseHTML: () => [{ tag: 'ul[data-type="taskList"]' }],
  renderHTML: () => ['ul', { 'data-type': 'taskList' }, 0],
})

const listItem = Node.create({
  name: 'listItem',
  content: 'paragraph',
  defining: true,
  parseHTML: () => [{ tag: 'li:not([data-type="taskItem"])' }],
  renderHTML: () => ['li', 0],
})

function checkboxLabel(item: ProseMirrorNode) {
  const text = item.textContent.trim()
  return text ? `Casilla: ${text}` : 'Casilla sin texto'
}

const taskItem = Node.create({
  name: 'taskItem',
  content: 'paragraph',
  defining: true,
  addAttributes: () => ({
    checked: { default: false, parseHTML: (element) => element.dataset.checked === 'true' },
  }),
  parseHTML: () => [{ tag: 'li[data-type="taskItem"]', contentElement: 'div' }],
  renderHTML: ({ node }) => [
    'li',
    { 'data-type': 'taskItem', 'data-checked': String(node.attrs.checked) },
    [
      'span',
      { contenteditable: 'false' },
      [
        'input',
        {
          type: 'checkbox',
          'aria-label': checkboxLabel(node),
          checked: node.attrs.checked ? '' : null,
        },
      ],
    ],
    ['div', 0],
  ],
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('li')
      dom.dataset.type = 'taskItem'
      const control = document.createElement('span')
      control.contentEditable = 'false'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      control.append(checkbox)
      const contentDOM = document.createElement('div')
      dom.append(control, contentDOM)

      const update = (item: ProseMirrorNode) => {
        if (item.type !== node.type) return false
        checkbox.checked = item.attrs.checked
        checkbox.setAttribute('aria-label', checkboxLabel(item))
        dom.dataset.checked = String(checkbox.checked)
        return true
      }
      update(node)

      const toggle = () => {
        const position = getPos()
        if (position === undefined) return
        const current = editor.state.doc.nodeAt(position)
        if (current?.type !== node.type) return
        if (!editor.isEditable) {
          update(current)
          return
        }
        dispatchFreeNoteChange(
          editor,
          editor.state.tr.setNodeMarkup(position, undefined, { checked: checkbox.checked }),
        )
      }
      checkbox.addEventListener('change', toggle)
      return {
        dom,
        contentDOM,
        update,
        stopEvent: (event) => event.target === checkbox,
        destroy: () => checkbox.removeEventListener('change', toggle),
      }
    }
  },
})

interface Line {
  paragraph: ProseMirrorNode
  position: number
  source: ProseMirrorNode
  sourcePosition: number
  item?: ProseMirrorNode
  selected: boolean
}

export function changeList(editor: Editor, target: BlockType) {
  if (!editor.isEditable) return
  const { doc, selection, schema, tr } = editor.state
  const { from, to, anchor, head } = selection
  let includesCode = false
  doc.nodesBetween(from, to, (node) => {
    if (node.type === schema.nodes.codeBlock) includesCode = true
    return !includesCode
  })
  if (includesCode || selection.$from.parent.type === schema.nodes.codeBlock) {
    editor.commands.focus()
    return
  }
  const lines: Line[] = []
  let replaceFrom = -1
  let replaceTo = -1

  // Include whole list containers so unselected items can stay in their original list type.
  doc.forEach((source, sourcePosition) => {
    if (sourcePosition >= to || sourcePosition + source.nodeSize <= from) return
    if (replaceFrom < 0) replaceFrom = sourcePosition
    replaceTo = sourcePosition + source.nodeSize
    const addLine = (paragraph: ProseMirrorNode, position: number, item?: ProseMirrorNode) => {
      const selected = position < to && position + paragraph.nodeSize > from
      lines.push({ paragraph, position, source, sourcePosition, item, selected })
    }
    if (source.isTextblock) addLine(source, sourcePosition)
    else source.forEach((item, offset) => addLine(item.child(0), sourcePosition + offset + 2, item))
  })

  editor.commands.focus()
  if (
    !lines.some(
      (line) =>
        line.selected &&
        line.source.type.name !== target &&
        !(target === 'paragraph' && line.source.isTextblock),
    )
  )
    return

  const replacement: ProseMirrorNode[] = []
  const mappedPositions: number[] = []
  let cursor = replaceFrom
  for (let index = 0; index < lines.length;) {
    const line = lines[index]
    const type = line.selected ? schema.nodes[target] : line.source.type
    if (type.isTextblock) {
      mappedPositions.push(cursor)
      replacement.push(line.paragraph)
      cursor += line.paragraph.nodeSize
      index += 1
      continue
    }

    const items: ProseMirrorNode[] = []
    const itemType = type === schema.nodes.taskList ? schema.nodes.taskItem : schema.nodes.listItem
    let itemPosition = cursor + 1
    while (index < lines.length) {
      const next = lines[index]
      if (
        next.selected !== line.selected ||
        (!line.selected && next.sourcePosition !== line.sourcePosition)
      )
        break
      const paragraph =
        next.paragraph.type === schema.nodes.paragraph
          ? next.paragraph
          : schema.nodes.paragraph.create(null, next.paragraph.content)
      const item = next.item?.type === itemType ? next.item : itemType.create(null, paragraph)
      items.push(item)
      mappedPositions.push(itemPosition + 1)
      itemPosition += item.nodeSize
      index += 1
    }
    const list = type.create(null, items)
    replacement.push(list)
    cursor += list.nodeSize
  }

  const mapPosition = (position: number) => {
    const index = lines.findIndex(
      (line) => position > line.position && position < line.position + line.paragraph.nodeSize,
    )
    if (index >= 0) return mappedPositions[index] + position - lines[index].position
    return position === from ? replaceFrom : cursor
  }
  tr.replaceWith(replaceFrom, replaceTo, replacement)
  tr.setSelection(
    TextSelection.between(tr.doc.resolve(mapPosition(anchor)), tr.doc.resolve(mapPosition(head))),
  )
  dispatchFreeNoteChange(editor, tr.scrollIntoView())
}

const listKeyboard = Extension.create({
  name: 'freeNoteListKeyboard',
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { editor } = this
        const { selection, tr } = editor.state
        const { $from, $to } = selection
        if ($from.depth !== 3 || !$from.sameParent($to)) return false
        if ($from.parent.content.size === 0) {
          changeList(editor, 'paragraph')
          return true
        }
        const item = $from.node(-1)
        tr.deleteSelection()
        const types = [{ type: item.type }, { type: $from.parent.type }]
        if (!canSplit(tr.doc, $from.pos, 2, types)) return false
        editor.view.dispatch(tr.split($from.pos, 2, types).scrollIntoView())
        return true
      },
    }
  },
})

export const freeNoteLists = [bulletList, orderedList, taskList, listItem, taskItem, listKeyboard]
