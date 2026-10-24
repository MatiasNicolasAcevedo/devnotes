import { mergeAttributes, Node } from '@tiptap/core'

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
})
