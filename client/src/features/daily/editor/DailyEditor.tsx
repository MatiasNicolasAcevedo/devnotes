import '@fontsource/roboto-mono'
import './dailyEditor.css'

import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import Button from '@mui/material/Button'
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
  const linkSelectionRef = useRef<{ from: number; to: number } | null>(null)

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
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel,
        'aria-readonly': String(readOnly),
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
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const result = validateDailyContent(json)
      if (result.valid && result.data) {
        onChangeRef.current?.(result.data)
      }
    },
  })

  const linkState = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return { canLink: false, isLink: false }
      const { empty, $from, $to } = ed.state.selection
      const isLink = ed.isActive('link')
      return {
        isLink,
        canLink: isLink || (!empty && $from.sameParent($to)),
      }
    },
  })

  // La nota remota puede llegar después del montaje. Hidratar no es una edición
  // y no debe programar un PUT ni cambiar la selección en cada pulsación.
  useEffect(() => {
    if (!editor || !initialContent) return
    const result = validateDailyContent(initialContent)
    if (
      result.valid &&
      result.data &&
      !editor.state.doc.eq(editor.schema.nodeFromJSON(result.data))
    ) {
      editor.commands.setContent(result.data, { emitUpdate: false })
    }
  }, [editor, initialContent])

  // Actualizar editable cuando cambia readOnly
  useEffect(() => {
    if (editor && editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly, false)
    }
  }, [editor, readOnly])

  // Sincronizar editorRef después de crear el editor
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const openLinkDialog = useCallback(() => {
    const ed = editorRef.current
    if (!ed || !ed.isEditable) return

    const initialSelection = ed.state.selection
    if (!initialSelection.$from.sameParent(initialSelection.$to)) return
    if (initialSelection.empty && !ed.isActive('link')) return

    // Expandir el enlace existente también cuando solo hay un cursor dentro de él.
    if (ed.isActive('link')) ed.commands.extendMarkRange('link')
    const { from, to } = ed.state.selection
    const text = ed.state.doc.textBetween(from, to, '')
    if (!text) return
    const href: unknown = ed.getAttributes('link').href
    linkSelectionRef.current = { from, to }

    setSelectedText(text)
    setExistingHref(typeof href === 'string' ? href : undefined)
    setLinkDialogOpen(true)
  }, [])

  const handleSaveLink = useCallback((href: string) => {
    const ed = editorRef.current
    const selection = linkSelectionRef.current
    if (!ed?.isEditable || !selection) return
    ed.chain().focus().setTextSelection(selection).setMark('link', { href }).run()
  }, [])

  const handleRemoveLink = useCallback(() => {
    const ed = editorRef.current
    const selection = linkSelectionRef.current
    if (!ed?.isEditable || !selection) return
    ed.chain().focus().setTextSelection(selection).unsetMark('link').run()
  }, [])

  const handleOpenLink = useCallback((href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }, [])

  const handleCloseDialog = useCallback(() => {
    setLinkDialogOpen(false)
    setSelectedText('')
    setExistingHref(undefined)
  }, [])

  const handleDialogExited = useCallback(() => {
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
    <div className="daily-editor-wrapper" data-readonly={readOnly}>
      {!readOnly && (
        <div className="daily-editor-toolbar" role="group" aria-label="Herramientas del editor">
          <Button
            size="small"
            variant="outlined"
            disabled={!linkState?.canLink}
            onMouseDown={(event) => event.preventDefault()}
            onClick={openLinkDialog}
          >
            {linkState?.isLink ? 'Editar enlace' : 'Agregar enlace'}
          </Button>
          <span className="daily-editor-help">Seleccioná texto y agregá un enlace (Ctrl+K).</span>
        </div>
      )}
      <div className="daily-editor-viewport" aria-label="Área de escritura redimensionable">
        <div
          className="daily-editor-main"
          onClick={(event) => {
            const anchor = event.target instanceof Element ? event.target.closest('a') : null
            if (anchor) {
              event.preventDefault()
              const href = anchor.getAttribute('href')
              if (href) handleOpenLink(href)
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
      {!readOnly && (
        <div className="daily-editor-footer">
          Arrastrá la esquina inferior derecha para cambiar la altura.
        </div>
      )}
      {children}
      <LinkDialog
        open={linkDialogOpen}
        selectedText={selectedText}
        existingHref={existingHref}
        onClose={handleCloseDialog}
        onExited={handleDialogExited}
        onSave={handleSaveLink}
        onRemove={handleRemoveLink}
        onOpen={handleOpenLink}
      />
    </div>
  )
}
