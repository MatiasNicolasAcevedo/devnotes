import { describe, expect, it } from 'vitest'
import { freeNoteInput } from './api'

const paragraph = { type: 'paragraph', content: [{ type: 'text', text: 'Preparar' }] }
const listItem = { type: 'listItem', content: [paragraph] }
const taskItem = { type: 'taskItem', attrs: { checked: true }, content: [paragraph] }
const codeBlock = {
  type: 'codeBlock',
  attrs: { language: 'json' },
  content: [{ type: 'text', text: '\n  {"incompleto":\t\r\n' }],
}

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

  it.each(['json', 'sql', 'text'])('preserves code text and empty %s blocks', (language) => {
    const attrs = { language }
    const content = [
      { ...codeBlock, attrs },
      { type: 'codeBlock', attrs },
    ]
    expect(parse(...content)).toMatchObject({ success: true, data: { document: { content } } })
  })

  it.each([
    { type: 'codeBlock' },
    { ...codeBlock, attrs: { language: 'javascript' } },
    { ...codeBlock, attrs: { language: 'sql', extra: true } },
    { ...codeBlock, content: [paragraph] },
    { ...codeBlock, content: [{ ...codeBlock.content[0], marks: [] }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [codeBlock] }] },
  ])('rejects invalid code structure: %j', (invalid) => {
    expect(parse(invalid).success).toBe(false)
  })

  it('counts code text towards the shared limit', () => {
    const atLimit = { ...codeBlock, content: [{ type: 'text', text: '🧪'.repeat(60_000) }] }
    expect(parse(atLimit).success).toBe(true)
    expect(parse(atLimit, paragraph).success).toBe(false)
  })
})
