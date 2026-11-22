import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { CopyButton } from '../../shared/ui/CopyButton'
import { codeLanguageLabels, codeLanguages } from './codeLanguages'
import { dispatchFreeNoteChange } from './freeNoteHistory'

function exitCodeBlock(editor: Editor, position: number) {
  if (!editor.isEditable) return
  const { doc, schema, tr } = editor.state
  const block = doc.nodeAt(position)
  if (block?.type !== schema.nodes.codeBlock) return
  const next = position + block.nodeSize
  if (doc.nodeAt(next)?.type === schema.nodes.paragraph) {
    // Record an undoable cursor move while preserving the existing document.
    tr.setNodeAttribute(position, 'language', block.attrs.language)
  } else {
    tr.insert(next, schema.nodes.paragraph.create())
  }
  tr.setSelection(TextSelection.create(tr.doc, next + 1))
  dispatchFreeNoteChange(editor, tr.scrollIntoView())
  editor.commands.focus()
}

export function CodeBlockView({ editor, getPos, node }: NodeViewProps) {
  const language = codeLanguages.find((value) => value === node.attrs.language) ?? 'text'
  return (
    <NodeViewWrapper className="free-note-code" data-language={language}>
      <Box
        contentEditable={false}
        sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', px: 0.75 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
          {codeLanguageLabels[language]}
        </Typography>
        <CopyButton aria-label="Copiar código" iconOnly text={node.textContent} />
        <Button
          size="small"
          onClick={() => {
            const position = getPos()
            if (position !== undefined) exitCodeBlock(editor, position)
          }}
        >
          Salir del bloque
        </Button>
      </Box>
      <NodeViewContent as="div" className="free-note-code-content" />
    </NodeViewWrapper>
  )
}
