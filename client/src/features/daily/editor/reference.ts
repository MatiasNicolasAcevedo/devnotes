import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ReferenceView } from './ReferenceView'

export interface ReferenceOptions {
  HTML: string
}

const defaultOptions: ReferenceOptions = {
  HTML: 'span',
}

export const Reference = Node.create<ReferenceOptions>({
  name: 'reference',

  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return defaultOptions
  },

  addAttributes() {
    return {
      id: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'reference',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'reference-atom',
        'data-type': 'reference',
      }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReferenceView)
  },
})
