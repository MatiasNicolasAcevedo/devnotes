import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { freeNoteCodeBlock } from './freeNoteCodeBlock'
import { freeNoteFormatting } from './freeNoteFormatting'
import { freeNoteLists } from './freeNoteLists'

export const freeNoteExtensions = [
  Document,
  Paragraph,
  Text,
  UndoRedo,
  ...freeNoteFormatting,
  freeNoteCodeBlock,
  ...freeNoteLists,
]

export const freeNoteContentStyles = {
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
  '& h1, & h2, & h3': { my: 0.5, fontWeight: 650, lineHeight: 1.35 },
  '& h1': { fontSize: '1.25rem' },
  '& h2': { fontSize: '1.125rem' },
  '& h3': { fontSize: '1rem' },
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
} as const
