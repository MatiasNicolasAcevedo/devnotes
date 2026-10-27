import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { Link } from './link'
import { Separator } from './separator'

// Document extiende content a (paragraph|separator)+
const DailyDocument = Document.extend({
  content: '(paragraph|separator)+',
})

/** Extensiones del editor, exportadas para pruebas y uso externo. */
export const editorExtensions = [
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
]
