import type { Editor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import type { Transaction } from '@tiptap/pm/state'

export function dispatchFreeNoteChange(editor: Editor, transaction: Transaction) {
  editor.view.dispatch(closeHistory(transaction))
  editor.view.dispatch(closeHistory(editor.state.tr))
}
