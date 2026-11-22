import { Node, type Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CodeBlockView } from './CodeBlockView'
import { codeLanguages, type CodeLanguage } from './codeLanguages'
import { dispatchFreeNoteChange } from './freeNoteHistory'

const jsonTokens =
  /(?<string>"(?:\\[^\r\n]|[^"\\\r\n])*"?)|(?<number>-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?)|(?<keyword>\b(?:true|false|null)\b)/g
const sqlTokens =
  /(?<comment>--[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$))|(?<string>'(?:''|[^'\r\n])*'?|"(?:""|[^"\r\n])*"?)|(?<number>\b\d+(?:\.\d+)?\b)|(?<keyword>\b(?:as|asc|by|case|create|delete|desc|distinct|else|end|exists|from|group|having|in|insert|into|is|join|left|limit|not|null|offset|on|or|order|right|select|set|table|then|union|update|values|when|where|with|and|true|false)\b)/gi

function highlight(doc: ProseMirrorNode) {
  const decorations: Decoration[] = []
  doc.forEach((block, position) => {
    if (block.type.name !== 'codeBlock') return
    const tokens =
      block.attrs.language === 'json'
        ? jsonTokens
        : block.attrs.language === 'sql'
          ? sqlTokens
          : null
    if (!tokens) return
    for (const match of block.textContent.matchAll(tokens)) {
      const kind = Object.keys(match.groups ?? {}).find(
        (name) => match.groups?.[name] !== undefined,
      )
      if (!kind) continue
      const start = position + 1 + match.index
      decorations.push(Decoration.inline(start, start + match[0].length, { class: 'code-' + kind }))
    }
  })
  return DecorationSet.create(doc, decorations)
}

export function setCodeLanguage(editor: Editor, language: CodeLanguage) {
  if (!editor.isEditable) return
  const { selection, schema, tr } = editor.state
  const { $from, $to } = selection
  const { codeBlock, paragraph } = schema.nodes
  if (
    $from.depth === 1 &&
    $from.sameParent($to) &&
    ($from.parent.type === paragraph || $from.parent.type === codeBlock)
  ) {
    tr.setBlockType($from.pos, $to.pos, codeBlock, { language })
  } else {
    const position = $to.depth > 0 ? $to.after(1) : $to.pos
    tr.insert(position, codeBlock.create({ language }))
    tr.setSelection(TextSelection.create(tr.doc, position + 1))
  }
  if (tr.docChanged) dispatchFreeNoteChange(editor, tr.scrollIntoView())
  editor.commands.focus()
}

export const freeNoteCodeBlock = Node.create({
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  addAttributes: () => ({
    language: {
      default: 'text',
      parseHTML: (element) =>
        codeLanguages.find((language) => language === element.getAttribute('data-language')) ??
        'text',
      renderHTML: (attributes) => ({ 'data-language': attributes.language }),
    },
  }),
  parseHTML: () => [{ tag: 'pre', preserveWhitespace: 'full' }],
  renderHTML: ({ HTMLAttributes }) => ['pre', HTMLAttributes, ['code', 0]],
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView, { contentDOMElementTag: 'code' })
  },
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        state: {
          init: (_, state) => highlight(state.doc),
          apply: (transaction, old) => (transaction.docChanged ? highlight(transaction.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
