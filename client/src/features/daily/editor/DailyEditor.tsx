import '@fontsource/roboto-mono'
import './dailyEditor.css'

import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { Fragment, Slice } from '@tiptap/pm/model'
import { closeHistory } from '@tiptap/pm/history'
import { UndoRedo } from '@tiptap/extensions'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { plainTextToDocument, validateDailyContent, type DailyContent } from './dailyDocument'
import { LinkDialog } from './LinkDialog'
import { Link } from './link'
import { ReferencePicker } from './ReferencePicker'
import { Reference } from './reference'
import { Separator } from './separator'
import type { ReferenceItem } from '../../reference/api'
import { LinkIcon } from '../../../shared/ui/icons'
import { useIsNarrow } from '../../../shared/ui/useIsNarrow'

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
  /** Controles al inicio de la barra de herramientas, antes del botón de enlace. */
  toolbarStart?: ReactNode
  /** Controles al final de la barra, tras un espacio flexible. Un hijo de ancho completo ocupa una fila propia. */
  toolbarEnd?: ReactNode
  /** Franja contextual entre la barra y el área de escritura. */
  beforeContent?: ReactNode
  /** Documento confirmado por un POST de copia, que debe entrar al historial sin programar un PUT. */
  confirmedCopyContent?: DailyContent
  /** El área de escritura ocupa el alto libre del contenedor en lugar de una altura fija redimensionable. */
  fillHeight?: boolean
}

export function DailyEditor({
  initialContent,
  readOnly = false,
  onChange,
  'aria-label': ariaLabel = 'Editor de nota diaria',
  children,
  toolbarStart,
  toolbarEnd,
  beforeContent,
  confirmedCopyContent,
  fillHeight = false,
}: DailyEditorProps) {
  const narrow = useIsNarrow()
  const onChangeRef = useRef(onChange)
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const linkSelectionRef = useRef<{ from: number; to: number } | null>(null)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const lastCopyRef = useRef<DailyContent>(undefined)

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [existingHref, setExistingHref] = useState<string | undefined>(undefined)
  const [pasteError, setPasteError] = useState(false)

  // Reference picker state
  const [refPickerOpen, setRefPickerOpen] = useState(false)
  const [refQuery, setRefQuery] = useState('')
  const [refAnchor, setRefAnchor] = useState<{ from: number; to: number } | null>(null)
  const imeComposingRef = useRef(false)
  const refPickerOpenRef = useRef(refPickerOpen)
  const refAnchorRef = useRef(refAnchor)

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
      Reference,
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
      clipboardTextSerializer: (slice) => {
        const lines: string[] = []
        slice.content.forEach((block) => lines.push(block.textContent))
        return lines.join('\n')
      },
      handlePaste: (view, event) => {
        // Pegar como texto plano: HTML se trata como texto
        const text = event.clipboardData?.getData('text/plain')
        if (text != null) {
          event.preventDefault()
          if (!text) return true
          const blocks = plainTextToDocument(text).content.map((block) =>
            view.state.schema.nodeFromJSON(block),
          )
          // Abrir los extremos permite unir la primera y última línea al texto alrededor.
          const slice = new Slice(Fragment.fromArray(blocks), 1, 1)
          const tr = view.state.tr.replaceSelection(slice)
          if (!validateDailyContent(tr.doc.toJSON()).valid) {
            setPasteError(true)
            return true
          }
          setPasteError(false)
          view.dispatch(tr)
          return true
        }
        return false
      },
    },
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON()
      const result = validateDailyContent(json)
      if (result.valid && result.data) {
        onChangeRef.current?.(result.data)
      }
      // Detectar @ tras cada actualización del editor
      const { selection } = ed.state
      if (!selection.empty || imeComposingRef.current) return
      const { $from } = selection
      const paragraph = $from.parent
      if (paragraph.type.name !== 'paragraph') return
      const posInPara = $from.parentOffset
      if (posInPara < 1 || ed.isActive('link')) return
      const textBefore = paragraph.textBetween(0, posInPara, '', '')
      const atIndex = textBefore.lastIndexOf('@')
      if (atIndex === -1 || (atIndex > 0 && textBefore[atIndex - 1] !== ' ')) return

      const queryAfter = textBefore.slice(atIndex + 1)
      const atAbsPos = $from.start() + atIndex
      const queryEndPos = $from.pos

      if (refPickerOpenRef.current) {
        // Picker ya abierto: actualizar consulta y ancla
        setRefQuery(queryAfter)
        setRefAnchor({ from: atAbsPos, to: queryEndPos })
      } else {
        // Abrir picker
        setRefQuery(queryAfter)
        setRefAnchor({ from: atAbsPos, to: queryEndPos })
        setRefPickerOpen(true)
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

  // Actualizar editable antes de aplicar un ACK que devuelva el foco.
  useEffect(() => {
    if (editor && editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly, false)
    }
  }, [editor, readOnly])

  // La nota remota puede llegar después del montaje. Hidratar no es una edición
  // y no debe programar un PUT ni cambiar la selección en cada pulsación.
  useEffect(() => {
    if (!editor || !initialContent) return
    const result = validateDailyContent(initialContent)
    if (!result.valid || !result.data) return
    const replacement = editor.schema.nodeFromJSON(result.data)
    if (editor.state.doc.eq(replacement)) return
    if (initialContent === confirmedCopyContent && lastCopyRef.current !== confirmedCopyContent) {
      lastCopyRef.current = confirmedCopyContent
      const transaction = editor.state.tr.replaceWith(
        0,
        editor.state.doc.content.size,
        replacement.content,
      )
      // La copia y la siguiente pulsación pertenecen a operaciones distintas de undo.
      editor.view.dispatch(closeHistory(transaction).setMeta('preventUpdate', true))
      editor.view.dispatch(closeHistory(editor.state.tr))
      if (!window.matchMedia('(pointer: coarse)').matches) editor.commands.focus()
    } else {
      editor.view.dispatch(
        editor.state.tr
          .replaceWith(0, editor.state.doc.content.size, replacement.content)
          .setMeta('preventUpdate', true)
          .setMeta('addToHistory', false),
      )
    }
  }, [editor, initialContent, confirmedCopyContent])

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
    if (initialSelection.empty && ed.isActive('link')) ed.commands.extendMarkRange('link')
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

  // Detect @ trigger y actualizar consulta
  const checkReferenceTrigger = useCallback(() => {
    const ed = editorRef.current
    if (!ed?.isEditable || refPickerOpen || imeComposingRef.current) return

    const { selection } = ed.state
    if (!selection.empty) return

    const { $from } = selection
    const paragraph = $from.parent
    if (paragraph.type.name !== 'paragraph') return

    // No activar dentro de enlace
    if (ed.isActive('link')) return

    const posInPara = $from.parentOffset
    if (posInPara < 1) return

    // Buscar @ al inicio o tras un espacio
    const textBefore = paragraph.textBetween(0, posInPara, '', '')
    const atIndex = textBefore.lastIndexOf('@')
    if (atIndex === -1) return

    // El @ debe estar al inicio o tras un espacio
    if (atIndex > 0 && textBefore[atIndex - 1] !== ' ') return

    const queryAfter = textBefore.slice(atIndex + 1)
    const atAbsPos = $from.start() + atIndex
    const queryEndPos = $from.pos

    setRefQuery(queryAfter)
    setRefAnchor({ from: atAbsPos, to: queryEndPos })
    setRefPickerOpen(true)
  }, [refPickerOpen])

  // Insertar referencia seleccionada
  const handleReferenceSelect = useCallback(
    (item: ReferenceItem) => {
      const ed = editorRef.current
      if (!ed || !refAnchor) return

      // Reemplazar @consulta por el átomo en un solo paso: insertar en `to` tras borrar
      // usaría una posición ya desplazada (fuera de rango al final del documento).
      ed.chain()
        .focus()
        .insertContentAt(refAnchor, {
          type: 'reference',
          attrs: { id: item.id },
        })
        .run()

      setRefPickerOpen(false)
      setRefQuery('')
      setRefAnchor(null)
    },
    [refAnchor],
  )

  const handleReferenceClose = useCallback(() => {
    setRefPickerOpen(false)
    setRefQuery('')
    setRefAnchor(null)
  }, [])

  // Shortcut Mod-k para abrir diálogo de enlace + detección de @
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openLinkDialog()
      }
      // Si el picker está abierto, dejar que lo maneje
      if (refPickerOpen) return
    }

    const handleCompositionStart = () => {
      imeComposingRef.current = true
    }
    const handleCompositionEnd = () => {
      imeComposingRef.current = false
      // Revisar trigger tras composición IME
      setTimeout(() => checkReferenceTrigger(), 0)
    }

    editor.view.dom.addEventListener('keydown', handleKeyDown)
    editor.view.dom.addEventListener('compositionstart', handleCompositionStart)
    editor.view.dom.addEventListener('compositionend', handleCompositionEnd)
    return () => {
      editor.view.dom.removeEventListener('keydown', handleKeyDown)
      editor.view.dom.removeEventListener('compositionstart', handleCompositionStart)
      editor.view.dom.removeEventListener('compositionend', handleCompositionEnd)
    }
  }, [editor, openLinkDialog, refPickerOpen, checkReferenceTrigger])

  useEffect(() => {
    refPickerOpenRef.current = refPickerOpen
    refAnchorRef.current = refAnchor
  })

  // Cerrar picker cuando hay una selección activa (no se usa checkReferenceTrigger aquí
  // porque la detección de @ se hace en onUpdate del editor)
  useEffect(() => {
    if (!editor) return
    const { selection } = editor.state
    if (!selection.empty && refPickerOpenRef.current && refAnchorRef.current) {
      setRefPickerOpen(false)
      setRefQuery('')
      setRefAnchor(null)
    }
  }, [editor])

  if (!editor) {
    return null
  }

  const hasToolbarSlots = toolbarStart != null || toolbarEnd != null
  const linkLabel = linkState?.isLink ? 'Editar enlace' : 'Agregar enlace'

  return (
    <div
      className={
        fillHeight ? 'daily-editor-wrapper daily-editor-wrapper--fill' : 'daily-editor-wrapper'
      }
      data-readonly={readOnly}
    >
      {(!readOnly || hasToolbarSlots) && (
        <div className="daily-editor-toolbar" role="group" aria-label="Herramientas del editor">
          {toolbarStart}
          {/* El span recibe el puntero cuando el botón está deshabilitado, así el tooltip sigue disponible. */}
          <Tooltip title="Seleccioná texto y agregá un enlace (Ctrl+K)." describeChild>
            <span className="daily-editor-tool">
              <Button
                size="small"
                variant="outlined"
                disabled={readOnly || !linkState?.canLink}
                aria-label={linkLabel}
                onMouseDown={(event) => event.preventDefault()}
                onClick={openLinkDialog}
                startIcon={narrow ? undefined : <LinkIcon />}
                sx={narrow ? { minWidth: 0, px: 0.75 } : undefined}
              >
                {narrow ? <LinkIcon /> : linkState?.isLink ? 'Editar enlace' : 'Enlace'}
              </Button>
            </span>
          </Tooltip>
          <span className="daily-editor-toolbar-spacer" />
          {toolbarEnd}
        </div>
      )}
      {beforeContent}
      {pasteError && (
        <div role="alert" className="daily-editor-error">
          El texto supera los límites de la nota y no se pegó.
        </div>
      )}
      <div
        className="daily-editor-viewport"
        aria-label={fillHeight ? 'Área de escritura' : 'Área de escritura redimensionable'}
      >
        <div
          className="daily-editor-main"
          onMouseDown={(event) => {
            pointerDownRef.current = { x: event.clientX, y: event.clientY }
          }}
          onClick={(event) => {
            const anchor = event.target instanceof Element ? event.target.closest('a') : null
            const start = pointerDownRef.current
            pointerDownRef.current = null
            if (anchor) {
              event.preventDefault()
              const href = anchor.getAttribute('href')
              const dragged =
                start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4
              if (href && !dragged) handleOpenLink(href)
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
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
      {refPickerOpen && refAnchor && (
        <ReferencePicker
          anchorPosition={refAnchor}
          query={refQuery}
          onSelect={handleReferenceSelect}
          onClose={handleReferenceClose}
        />
      )}
    </div>
  )
}
