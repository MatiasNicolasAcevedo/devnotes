import '@fontsource/roboto-mono'
import './dailyEditor.css'

import { EditorContent, useEditor } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { useEffect, useRef, type ReactNode } from 'react'
import { plainTextToDocument, validateDailyContent, type DailyContent } from './dailyDocument'
import { Link } from './link'
import { Separator } from './separator'

// Document extiende content a (paragraph|separator)+
const DailyDocument = Document.extend({
  content: '(paragraph|separator)+',
})

export interface DailyEditorProps {
  /** Documento inicial; si no se pasa, se usa el vacío canónico. */
  initialContent?: DailyContent
  /** Si true, el editor es solo lectura sin callbacks de edición. */
  readOnly?: boolean
  /** Se llama con el JSON actualizado tras cada transacción válida. */
  onChange?: (content: DailyContent) => void
  /** Label accesible para el editor. */
  'aria-label'?: string
  /** Children adicionales (p. ej. toolbar). */
  children?: ReactNode
}

export function DailyEditor({
  initialContent,
  readOnly = false,
  onChange,
  'aria-label': ariaLabel = 'Editor de nota diaria',
  children,
}: DailyEditorProps) {
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      DailyDocument,
      Paragraph,
      Text,
      UndoRedo,
      Separator,
      Link.configure({
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'daily-editor-content',
        spellcheck: 'false',
      },
      handlePaste: (view, event) => {
        // Pegar como texto plano: HTML se trata como texto
        const text = event.clipboardData?.getData('text/plain')
        if (text != null) {
          event.preventDefault()
          const doc = plainTextToDocument(text)
          const tr = view.state.tr
          // Insertar los párrafos del documento pegado
          for (const block of doc.content) {
            if (block.type === 'paragraph') {
              const schema = view.state.schema
              const textNodes = (block.content ?? []).map((n) => {
                if (n.marks && n.marks.length > 0) {
                  const linkMark = schema.marks.link?.create({ href: n.marks[0].attrs.href })
                  return schema.text(n.text ?? '', [linkMark])
                }
                return schema.text(n.text ?? '')
              })
              const para = schema.nodes.paragraph.create(
                undefined,
                textNodes.length > 0 ? textNodes[0] : undefined,
              )
              tr.replaceSelectionWith(para)
              break // Solo el primer bloque se inserta en la selección
            }
          }
          view.dispatch(tr)
          return true
        }
        return false
      },
    },
    editable: !readOnly,
    onCreate: ({ editor }) => {
      // Hidratar con contenido inicial si existe
      if (initialContent) {
        const result = validateDailyContent(initialContent)
        if (result.valid && result.data) {
          editor.commands.setContent(result.data)
        }
      }
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const result = validateDailyContent(json)
      if (result.valid && result.data) {
        onChangeRef.current?.(result.data)
      }
    },
  })

  // Actualizar editable cuando cambia readOnly
  useEffect(() => {
    if (editor && editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly)
    }
  }, [editor, readOnly])

  if (!editor) {
    return null
  }

  return (
    <div className="daily-editor-wrapper">
      <div className="daily-editor-gutter" aria-hidden="true">
        {/* Los números se generan por CSS counter */}
      </div>
      <div className="daily-editor-main">
        <label className="daily-editor-label visually-hidden">{ariaLabel}</label>
        <EditorContent
          editor={editor}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
        />
      </div>
      {children}
    </div>
  )
}
