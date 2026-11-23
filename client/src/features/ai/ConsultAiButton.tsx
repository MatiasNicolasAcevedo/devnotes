import { Button, Stack, Typography } from '@mui/material'
import { useEditorState, type Editor } from '@tiptap/react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSpaceHref } from '../spaces/spaceContext'
import { AI_ACCENT, useAi } from './aiContext'
import type { Excerpt } from './api'
import { editorExcerpt } from './editorExcerpt'

export type SavedExcerptSource = Pick<Excerpt, 'source' | 'id' | 'revision'>

export function ConsultAiButton({
  editor,
  save,
}: {
  editor: Editor | null
  save: () => Promise<SavedExcerptSource | null>
}) {
  const ai = useAi()
  const navigate = useNavigate()
  const href = useSpaceHref()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const active = useRef(false)
  const selected = useEditorState({
    editor,
    selector: ({ editor }) => Boolean(editor && !editor.state.selection.empty),
  })

  if (!ai?.options || !editor || (!selected && !notice)) return null
  const submit = async () => {
    if (active.current) return
    const excerpt = editorExcerpt(editor)
    if (!excerpt) return
    const original = editor.state.doc
    const spaceHref = href('/ai')
    active.current = true
    setBusy(true)
    setNotice('')
    try {
      const source = await save()
      if (editor.isDestroyed) return
      if (!source || !editor.state.doc.eq(original)) {
        setNotice('Guardá la nota y volvé a seleccionar el fragmento.')
        return
      }
      const excerptKey = ai.stageExcerpt({ ...excerpt, ...source })
      void navigate(spaceHref, { state: { excerptKey } })
    } catch {
      if (!editor.isDestroyed)
        setNotice('No se pudo guardar la nota. El fragmento sigue en el editor.')
    } finally {
      active.current = false
      if (!editor.isDestroyed) setBusy(false)
    }
  }

  return (
    <Stack sx={{ alignItems: 'flex-start' }}>
      {selected && (
        <Button
          size="small"
          loading={busy}
          sx={{ color: AI_ACCENT }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void submit()}
        >
          <span aria-hidden="true">✦&nbsp;</span>Consultar con IA
        </Button>
      )}
      {notice && (
        <Typography variant="caption" role="status">
          {notice}
        </Typography>
      )}
    </Stack>
  )
}
