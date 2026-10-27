import { mergeAttributes, Node } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'

/** Comandos de teclado que producen separadores y su ancho correspondiente. */
export const SEPARATOR_COMMANDS: Record<string, 25 | 50 | 75 | 100> = {
  '--25': 25,
  '--50': 50,
  '--75': 75,
  '---': 100,
}

/**
 * Intenta convertir el paragraph actual en un separador si su texto es un comando exacto.
 * Retorna true si se realizó la conversión, false de lo contrario.
 */
export function tryConvertToSeparator(
  state: EditorState,
  dispatch: (tr: any) => void,
  isEditable: boolean,
): boolean {
  const { selection } = state
  const { $from, empty } = selection

  if (!empty) return false
  if (!isEditable) return false

  const paragraph = $from.parent
  if (paragraph.type.name !== 'paragraph') return false

  const text = paragraph.textBetween(0, paragraph.content.size, '', '')
  const width = SEPARATOR_COMMANDS[text]
  if (width === undefined) return false

  // Cursor debe estar al final
  if ($from.parentOffset < paragraph.content.size) return false

  // No convertir si hay marcas
  if (paragraph.content.size > 0) {
    const hasMarks = paragraph.content.content.some((node: any) => {
      return node.type.name === 'text' && node.marks && node.marks.length > 0
    })
    if (hasMarks) return false
  }

  const pos = $from.before()
  const sepNode = state.schema.nodes.separator.create({ width })
  dispatch(
    state.tr
      .replaceWith(pos, pos + paragraph.nodeSize, sepNode)
      .insert(pos + sepNode.nodeSize, state.schema.nodes.paragraph.create()),
  )
  return true
}

/**
 * Intenta borrar el separador anterior desde un paragraph vacío.
 */
export function tryDeletePreviousSeparator(
  state: EditorState,
  dispatch: (tr: any) => void,
  isEditable: boolean,
): boolean {
  const { selection } = state
  const { $from } = selection

  if (!isEditable) return false

  const paragraph = $from.parent
  if (paragraph.type.name !== 'paragraph') return false
  if (paragraph.content.size > 0) return false
  if ($from.parentOffset > 0) return false

  // Position of the start of the current paragraph
  const paraStart = $from.before()
  if (paraStart < 1) return false

  // The node immediately before this paragraph
  const prevPos = paraStart - 1
  const prevNode = state.doc.nodeAt(prevPos)
  if (!prevNode || prevNode.type.name !== 'separator') return false

  // Delete the separator (from prevPos to paraStart)
  // This removes the separator and leaves the empty paragraph
  dispatch(state.tr.delete(prevPos, paraStart))
  return true
}

export const Separator = Node.create({
  name: 'separator',

  addAttributes() {
    return {
      width: {
        default: 50,
        parseHTML: (el) => {
          const w = el.getAttribute('data-width')
          return w ? Number(w) : 50
        },
        renderHTML: (attrs) => ({ 'data-width': attrs.width }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'hr[data-type="separator"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-type': 'separator' })]
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor
        return tryConvertToSeparator(state, view.dispatch.bind(view), this.editor.isEditable)
      },

      Backspace: () => {
        const { state, view } = this.editor
        return tryDeletePreviousSeparator(state, view.dispatch.bind(view), this.editor.isEditable)
      },
    }
  },
})
