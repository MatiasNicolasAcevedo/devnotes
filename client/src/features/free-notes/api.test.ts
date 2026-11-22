import { describe, expect, it } from 'vitest'
import { freeNoteInput } from './api'

const paragraph = { type: 'paragraph', content: [{ type: 'text', text: 'Preparar' }] }
const listItem = { type: 'listItem', content: [paragraph] }
const taskItem = { type: 'taskItem', attrs: { checked: true }, content: [paragraph] }

function parse(...content: unknown[]) {
  return freeNoteInput.safeParse({ title: 'Listas', document: { type: 'doc', content } })
}

describe('free note document', () => {
  it('keeps earlier paragraphs and preserves each supported list structure', () => {
    const content = [
      paragraph,
      { type: 'bulletList', content: [listItem] },
      { type: 'orderedList', attrs: { start: 1 }, content: [listItem] },
      { type: 'taskList', content: [taskItem] },
    ]
    expect(parse(...content)).toMatchObject({ success: true, data: { document: { content } } })
    expect(parse(paragraph).success).toBe(true)
  })

  it.each([
    { type: 'orderedList', attrs: { start: 2 }, content: [listItem] },
    { type: 'bulletList', content: [taskItem] },
    { type: 'taskList', content: [{ ...taskItem, attrs: { checked: 'true' } }] },
    {
      type: 'bulletList',
      content: [{ ...listItem, content: [paragraph, { type: 'bulletList', content: [listItem] }] }],
    },
  ])('rejects invalid list structure and attributes: %j', (list) => {
    expect(parse(list).success).toBe(false)
  })

  it('counts text across paragraphs and list items', () => {
    const longParagraph = {
      type: 'paragraph',
      content: [{ type: 'text', text: '🧪'.repeat(60_000) }],
    }
    const list = { type: 'bulletList', content: [{ ...listItem, content: [longParagraph] }] }
    expect(parse(list).success).toBe(true)
    expect(parse(list, paragraph).success).toBe(false)
  })
})
