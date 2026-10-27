import { Mark } from '@tiptap/core'

/**
 * Mark Link con solo href como atributo persistido.
 * target/rel son atributos de render DOM seguros y no campos persistidos.
 * autolink, linkOnPaste, openOnClick deshabilitados en edición (T-005).
 * Shortcut Mod-k y diálogo se manejan en DailyEditor (T-009).
 * Los commands setMark/unsetMark de TipTap se usan directamente en el editor.
 */
export const Link = Mark.create({
  name: 'link',

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (el) => el.getAttribute('href'),
        renderHTML: (attrs) => ({
          href: attrs.href,
          // Render DOM seguro: no persistidos
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[href]:not([data-type])',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      {
        href: HTMLAttributes.href,
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        class: 'daily-editor-link',
      },
      0,
    ]
  },

  // Sin autolink, linkOnPaste, openOnClick en edición
  addProseMirrorPlugins() {
    return []
  },
})
