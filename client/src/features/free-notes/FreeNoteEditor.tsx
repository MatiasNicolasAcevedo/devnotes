import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import SvgIcon from '@mui/material/SvgIcon'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { Fragment, Slice } from '@tiptap/pm/model'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../../services/http'
import { CopyButton } from '../../shared/ui/CopyButton'
import { newUuidV7 } from '../../shared/uuidV7'

import {
  createFreeNote,
  fetchFreeNote,
  freeNoteInput,
  updateFreeNote,
  type FreeNote,
  type FreeNoteInput,
} from './api'
import { codeLanguageLabels, codeLanguages } from './codeLanguages'
import { freeNoteCodeBlock, setCodeLanguage } from './freeNoteCodeBlock'
import { changeList, freeNoteLists, listOptions } from './freeNoteLists'
import {
  FREE_NOTE_CREATED_INTENT,
  useFreeNotesContext,
  useFreeNotesLinks,
} from './freeNotesContext'
import { useFreeNotesScope } from './useFreeNotesScope'

const emptyDocument: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }
const extensions = [Document, Paragraph, Text, UndoRedo, freeNoteCodeBlock, ...freeNoteLists]
type Fields = { title: string; document: JSONContent }

export function FreeNoteEditor({
  note,
  reload,
}: {
  note?: FreeNote
  reload?: () => Promise<FreeNote | undefined>
}) {
  const scope = useFreeNotesScope()
  const { noteHref } = useFreeNotesLinks()
  const navigate = useNavigate()
  const context = useFreeNotesContext()
  const setDraft = context?.setDraft
  const contentLabel = useId()
  const contentErrorId = useId()
  const listMenuId = useId()
  const toolsMenuId = useId()
  const reloadTitle = useId()
  const stored = useRef(note ? { id: note.id, revision: note.revision } : null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [destination, setDestination] = useState<string | null>(null)
  const [failure, setFailure] = useState<'conflict' | 'save' | 'reload' | null>(null)
  const [confirmReload, setConfirmReload] = useState(false)
  const [listAnchor, setListAnchor] = useState<HTMLElement | null>(null)
  const [toolsAnchor, setToolsAnchor] = useState<HTMLElement | null>(null)
  const [choosingLanguage, setChoosingLanguage] = useState(false)
  const inFlight = useRef(false)
  const attempt = useRef<{ id: string; input: FreeNoteInput; fingerprint: string } | null>(null)
  const {
    register,
    setValue,
    setError,
    clearErrors,
    reset,
    getValues,
    setFocus,
    formState: { isDirty, errors },
  } = useForm<Fields>({
    defaultValues: { title: note?.title ?? '', document: note?.document ?? emptyDocument },
  })

  const editor = useEditor({
    extensions,
    content: note?.document ?? emptyDocument,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': contentLabel },
      transformCopied(slice) {
        // Preserve the list wrapper in HTML even when copying part of a single item.
        return slice.openStart > 1 && slice.openEnd > 1 ? new Slice(slice.content, 0, 0) : slice
      },
      clipboardTextSerializer(slice) {
        const lines: string[] = []
        slice.content.descendants((node) => {
          if (node.type.name !== 'paragraph' && node.type.name !== 'codeBlock') return true
          lines.push(node.textContent)
          return false
        })
        return lines.join('\n')
      },
      handlePaste(view, event) {
        const clipboard = event.clipboardData
        if (!clipboard?.types.includes('text/plain')) return true
        const text = clipboard.getData('text/plain')
        if (!text) return true
        const { schema, selection, tr } = view.state
        if (
          selection.$from.parent.type === schema.nodes.codeBlock &&
          selection.$from.sameParent(selection.$to)
        ) {
          view.dispatch(tr.insertText(text).scrollIntoView())
          return true
        }
        const paragraphs = text
          .split(/\r\n|\r|\n/)
          .map((line) => schema.nodes.paragraph.create(null, line ? schema.text(line) : null))
        const slice = Slice.maxOpen(Fragment.fromArray(paragraphs))
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView())
        return true
      },
    },
    onUpdate: ({ editor }) => setValue('document', editor.getJSON(), { shouldDirty: true }),
  })

  useEffect(() => {
    editor?.setEditable(!busy, false)
  }, [busy, editor])

  const save = async (openSaved = false) => {
    if (!scope.canWrite || inFlight.current || !editor) return false
    clearErrors()
    const parsed = freeNoteInput.safeParse(getValues())
    if (!parsed.success) {
      const titleError = parsed.error.issues.some((issue) => issue.path[0] === 'title')
      const documentError = parsed.error.issues.some((issue) => issue.path[0] === 'document')
      if (titleError)
        setError('title', { message: 'Escribí un título válido de 1 a 160 caracteres.' })
      if (documentError)
        setError('document', {
          message:
            'El formato o los caracteres del contenido son inválidos, o supera el tamaño permitido.',
        })
      if (titleError) setFocus('title')
      else editor.commands.focus()
      return false
    }
    inFlight.current = true
    setBusy(true)
    setFailure(null)
    try {
      const input = parsed.data
      let result: FreeNote
      if (stored.current) {
        const { id, revision } = stored.current
        result = await scope.mutate((options) =>
          updateFreeNote(scope.space, id, input, revision, options),
        )
      } else {
        const fingerprint = JSON.stringify(input)
        const creation = attempt.current ?? { id: newUuidV7(), input, fingerprint }
        attempt.current = creation
        result = await scope.mutate((options) =>
          createFreeNote(scope.space, creation.input, creation.id, options),
        )
        if (!scope.isCurrent()) return false
        // Resolve a possible lost POST response before persisting edits made since that attempt.
        if (creation.fingerprint !== fingerprint) {
          const { id, revision } = result
          stored.current = { id, revision }
          result = await scope.mutate((options) =>
            updateFreeNote(scope.space, id, input, revision, options),
          )
        }
      }
      if (!scope.isCurrent()) return false
      stored.current = { id: result.id, revision: result.revision }
      reset({ title: result.title, document: result.document })
      setSaved(true)
      scope.invalidate(result.id)
      if (!note && openSaved) setDestination(result.id)
      return true
    } catch (error) {
      if (scope.isCurrent()) {
        setFailure(
          error instanceof ApiError && error.status === 409 && stored.current ? 'conflict' : 'save',
        )
        if (!stored.current && error instanceof ApiError && [400, 409].includes(error.status))
          attempt.current = null
      }
      return false
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const saveRef = useRef(save)
  useLayoutEffect(() => {
    saveRef.current = save
  })
  const saveBeforeExit = useCallback(() => saveRef.current(), [])
  const pending = isDirty || busy
  useLayoutEffect(() => {
    if (!setDraft || !pending) return
    setDraft({ save: saveBeforeExit, busy })
    return () => setDraft(null)
  }, [setDraft, pending, saveBeforeExit, busy])

  useEffect(() => {
    if (destination && !context?.draft)
      void navigate(noteHref(`/free-notes/${destination}`), {
        replace: true,
        state: FREE_NOTE_CREATED_INTENT,
      })
  }, [context?.draft, destination, noteHref, navigate])

  useEffect(() => {
    if (!pending) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pending])

  const loadLatest = async () => {
    setConfirmReload(false)
    const id = stored.current?.id
    if (!id || busy) return
    setBusy(true)
    try {
      const latest = reload
        ? await reload()
        : await fetchFreeNote(scope.space, id, { sessionIsCurrent: scope.isCurrent })
      if (!latest || !scope.isCurrent()) return
      stored.current = { id: latest.id, revision: latest.revision }
      reset({ title: latest.title, document: latest.document })
      editor?.commands.setContent(latest.document, { emitUpdate: false })
      setFailure(null)
      setSaved(false)
    } catch {
      if (scope.isCurrent()) setFailure('reload')
    } finally {
      setBusy(false)
    }
  }

  const { ref: titleRef, ...titleField } = register('title')
  const contentError =
    typeof errors.document?.message === 'string' ? errors.document.message : undefined
  return (
    <Stack
      component="form"
      noValidate
      spacing={1.5}
      onSubmit={(event) => {
        event.preventDefault()
        void save(true)
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button component={Link} to={noteHref('/free-notes')}>
          Libres
        </Button>
        <Typography component="h1" variant="h6" sx={{ flexGrow: 1 }}>
          {note ? 'Editar nota' : 'Nueva nota'}
        </Typography>
        <IconButton
          aria-label="Lista"
          aria-haspopup="menu"
          aria-controls={listAnchor ? listMenuId : undefined}
          aria-expanded={!!listAnchor}
          disabled={!editor || !scope.canWrite || busy}
          onClick={(event) => setListAnchor(event.currentTarget)}
        >
          <SvgIcon aria-hidden="true">
            <path d="M8 5h13v2H8zm0 6h13v2H8zm0 6h13v2H8zM3 5h2v2H3zm0 6h2v2H3zm0 6h2v2H3z" />
          </SvgIcon>
        </IconButton>
        <Menu
          anchorEl={listAnchor}
          open={!!listAnchor}
          onClose={() => setListAnchor(null)}
          slotProps={{ list: { id: listMenuId, 'aria-label': 'Lista' } }}
        >
          {listOptions.map(([type, label]) => (
            <MenuItem
              key={type}
              onClick={() => {
                setListAnchor(null)
                if (editor) changeList(editor, type)
              }}
            >
              {label}
            </MenuItem>
          ))}
        </Menu>
        <Button
          aria-haspopup="menu"
          aria-controls={toolsAnchor ? toolsMenuId : undefined}
          aria-expanded={!!toolsAnchor}
          disabled={!editor || !scope.canWrite || busy}
          onClick={(event) => {
            setChoosingLanguage(false)
            setToolsAnchor(event.currentTarget)
          }}
        >
          Herramientas
        </Button>
        <Menu
          anchorEl={toolsAnchor}
          open={!!toolsAnchor}
          onClose={() => setToolsAnchor(null)}
          slotProps={{
            list: {
              id: toolsMenuId,
              'aria-label': choosingLanguage ? 'Bloque de código' : 'Herramientas',
            },
          }}
        >
          {choosingLanguage ? (
            codeLanguages.map((language, index) => (
              <MenuItem
                key={language}
                autoFocus={index === 0}
                onClick={() => {
                  setToolsAnchor(null)
                  if (editor) setCodeLanguage(editor, language)
                }}
              >
                {codeLanguageLabels[language]}
              </MenuItem>
            ))
          ) : (
            <MenuItem onClick={() => setChoosingLanguage(true)}>Bloque de código</MenuItem>
          )}
        </Menu>
        <Button
          type="submit"
          variant="contained"
          disabled={!scope.canWrite || busy || (!!note && !isDirty)}
        >
          Guardar
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" role="status">
        {busy ? 'Guardando…' : isDirty ? 'Cambios sin guardar' : saved || note ? 'Guardada' : ''}
      </Typography>
      {failure && (
        <Alert severity={failure === 'conflict' ? 'warning' : 'error'}>
          {failure === 'conflict'
            ? 'La nota cambió en otra sesión.'
            : failure === 'reload'
              ? 'No se pudo abrir la versión reciente.'
              : 'No se pudo guardar la nota libre.'}
          {(failure === 'conflict' || failure === 'reload') && (
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Button onClick={() => setConfirmReload(true)}>Abrir versión reciente</Button>
              <CopyButton
                text={() => editor?.getText({ blockSeparator: '\n' }) ?? ''}
                aria-label="Copiar texto local"
              />
            </Stack>
          )}
        </Alert>
      )}
      <TextField
        {...titleField}
        inputRef={titleRef}
        label="Título"
        autoFocus={!note}
        disabled={busy}
        error={!!errors.title}
        helperText={errors.title?.message}
        fullWidth
      />
      <Box>
        <Typography
          id={contentLabel}
          component="div"
          variant="body2"
          color="text.secondary"
          sx={{ mb: 0.5 }}
        >
          Contenido
        </Typography>
        <Paper
          variant="outlined"
          aria-describedby={contentError ? contentErrorId : undefined}
          sx={{
            minWidth: 0,
            borderColor: contentError ? 'error.main' : 'divider',
            '&:focus-within': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: -1,
            },
            '& .tiptap': {
              minHeight: 'min(38dvh, 320px)',
              px: 1.5,
              py: 1,
              fontSize: '1rem',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              outline: 'none',
            },
            '& p': { my: 0, minHeight: '1.5em' },
            '& .free-note-code': {
              minWidth: 0,
              maxWidth: '100%',
              my: 0.75,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'action.hover',
            },
            '& .free-note-code-content': {
              px: 1,
              pb: 0.75,
              overflowX: 'auto',
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              fontFamily: '"Roboto Mono", monospace',
              fontSize: '0.875rem',
              '& code': { font: 'inherit', display: 'block', minHeight: '1.5em' },
              '& .code-keyword': { color: 'primary.light', fontWeight: 600 },
              '& .code-string': { color: 'success.light' },
              '& .code-number': { color: 'warning.light' },
              '& .code-comment': { color: 'text.secondary', fontStyle: 'italic' },
            },
            '& ul, & ol': { my: 0, paddingInlineStart: 3 },
            '& ul[data-type="taskList"]': { paddingInlineStart: 0, listStyle: 'none' },
            '& li[data-type="taskItem"]': {
              display: 'flex',
              alignItems: 'flex-start',
              '& > span': { display: 'grid', placeItems: 'center', flexShrink: 0 },
              '& > div': { flex: 1, minWidth: 0, pt: '0.25rem' },
              '& input': {
                width: 28,
                height: 28,
                margin: 0,
                marginInlineEnd: 1,
                cursor: 'pointer',
              },
            },
          }}
        >
          <EditorContent editor={editor} />
        </Paper>
        {contentError && (
          <Typography id={contentErrorId} role="alert" variant="caption" color="error">
            {contentError}
          </Typography>
        )}
      </Box>
      <Dialog
        open={confirmReload}
        aria-labelledby={reloadTitle}
        onClose={() => setConfirmReload(false)}
      >
        <DialogTitle id={reloadTitle}>
          ¿Descartar el borrador y abrir la versión reciente?
        </DialogTitle>
        <DialogActions>
          <Button autoFocus onClick={() => setConfirmReload(false)}>
            Seguir editando
          </Button>
          <Button color="warning" onClick={() => void loadLatest()}>
            Descartar y abrir
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
