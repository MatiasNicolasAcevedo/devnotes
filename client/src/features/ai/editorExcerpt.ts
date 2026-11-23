import type { Editor } from '@tiptap/react'
import { countPoints } from './api'

/** Project the same logical lines as the backend, using visible titles for inline references. */
export function editorExcerpt(editor: Editor) {
  const { doc, selection } = editor.state
  if (selection.empty) return null

  const lines: string[] = []
  const prefixes: string[][] = [[], []]
  doc.descendants((node, pos) => {
    if (!node.isTextblock && node.type.name !== 'separator') return true
    const start = pos + 1
    const boundaries = [selection.from, selection.to]
    let line = ''
    const partial = ['', '']
    node.forEach((inline, offset) => {
      let value = inline.text ?? ''
      if (inline.type.name === 'reference') {
        const view = editor.view.nodeDOM(start + offset)
        value =
          view instanceof HTMLElement
            ? (view.querySelector('.reference-atom')?.textContent ?? 'Referencia no disponible')
            : 'Referencia no disponible'
      }
      line += value
      boundaries.forEach((bound, index) => {
        const length = bound - start - offset
        if (length > 0) partial[index] += inline.isText ? value.slice(0, length) : value
      })
    })
    lines.push(line)
    boundaries.forEach((bound, index) => {
      if (bound >= start || (node.type.name === 'separator' && bound > pos)) {
        prefixes[index].push(partial[index])
      }
    })
    return false
  })
  const text = lines.join('\n')
  const from = prefixes[0].join('\n').length
  const to = prefixes[1].join('\n').length
  const selected = text.slice(from, to)
  if (!selected.trim()) return null
  return { start: countPoints(text.slice(0, from)), text: selected }
}
