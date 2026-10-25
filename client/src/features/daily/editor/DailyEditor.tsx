import '@fontsource/roboto-mono'
import './dailyEditor.css'

import { EditorContent, useEditor } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { plainTextToDocument, validateDailyContent, type DailyContent } from './dailyDocument'
import { LinkDialog } from './LinkDialog'
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
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [existingHref, setExistingHref] = useState<string | undefined>(undefined)

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

  // Sincronizar editorRef después de crear el editor
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const openLinkDialog = useCallback(() => {
    const ed = editorRef.current
    if (!ed || !ed.isEditable) return

    const { selection } = ed.state
    const { empty, from, to } = selection

    // Si la selección cruza bloques, se rechaza
    if (!empty) {
      const $from = ed.state.doc.resolve(from)
      const $to = ed.state.doc.resolve(to)
      if (!$from.sameParent($to)) {
        return
      }
    }

    let text = ''
    let href: string | undefined

    if (empty) {
      // Cursor sin selección: verificar si está dentro de un link
      const mark = ed.state.storedMarks?.find((m) => m.type.name === 'link')
      if (mark) {
        href = mark.attrs.href
        const { $from } = ed.state.selection
        $from.parent.content.forEach((node: any) => {
          if (node.type.name === 'text' && node.marks) {
            for (const m of node.marks) {
              if (m.type.name === 'link' && m.attrs.href === href) {
                text = node.text ?? ''
                break
              }
            }
          }
        })
      } else {
        return
      }
    } else {
      text = ed.state.doc.textBetween(from, to, '')
      if (!text) return

      const linkMark = ed.state.schema.marks.link
      const hasLink = ed.state.doc.rangeHasMark(from, to, linkMark)
      if (hasLink) {
        ed.state.doc.nodesBetween(from, to, (node: any) => {
          if (node.type.name === 'text' && node.marks) {
            for (const m of node.marks) {
              if (m.type.name === 'link') {
                href = m.attrs.href
                return false
              }
            }
          }
        })
      }
    }

    setSelectedText(text)
    setExistingHref(href)
    setLinkDialogOpen(true)
  }, [])

  const handleSaveLink = useCallback((href: string) => {
    const ed = editorRef.current
    if (!ed) return
    ed.chain().focus().setMark('link', { href }).run()
  }, [])

  const handleRemoveLink = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    ed.chain().focus().unsetMark('link').run()
  }, [])

  const handleOpenLink = useCallback((href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }, [])

  const handleCloseDialog = useCallback(() => {
    setLinkDialogOpen(false)
    setSelectedText('')
    setExistingHref(undefined)
    editorRef.current?.commands.focus()
  }, [])

  // Shortcut Mod-k para abrir diálogo de enlace
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openLinkDialog()
      }
    }

    editor.view.dom.addEventListener('keydown', handleKeyDown)
    return () => {
      editor.view.dom.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, openLinkDialog])

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
      <LinkDialog
        open={linkDialogOpen}
        selectedText={selectedText}
        existingHref={existingHref}
        onClose={handleCloseDialog}
        onSave={handleSaveLink}
        onRemove={handleRemoveLink}
        onOpen={handleOpenLink}
      />
    </div>
  )
}
