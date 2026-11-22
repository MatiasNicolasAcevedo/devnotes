import { z } from 'zod'
import { http, type RequestOptions } from '../../services/http'
import type { Space } from '../spaces/space'
import { codeLanguages } from './codeLanguages'

const storableText = z.string().refine((text) => {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    if (code === 0 || (code >= 0xd800 && code <= 0xdfff)) return false
  }
  return true
})
const textContent = z.array(z.strictObject({ type: z.literal('text'), text: storableText.min(1) }))
const paragraph = z.strictObject({ type: z.literal('paragraph'), content: textContent.optional() })
const itemParagraph = z.tuple([paragraph])
const listItem = z.strictObject({ type: z.literal('listItem'), content: itemParagraph })
const taskItem = z.strictObject({
  type: z.literal('taskItem'),
  attrs: z.strictObject({ checked: z.boolean() }).optional(),
  content: itemParagraph,
})
const block = z.discriminatedUnion('type', [
  paragraph,
  z.strictObject({
    type: z.literal('codeBlock'),
    attrs: z.strictObject({ language: z.enum(codeLanguages) }),
    content: textContent.optional(),
  }),
  z.strictObject({ type: z.literal('bulletList'), content: z.array(listItem).min(1) }),
  z.strictObject({
    type: z.literal('orderedList'),
    attrs: z.strictObject({ start: z.literal(1) }).optional(),
    content: z.array(listItem).min(1),
  }),
  z.strictObject({ type: z.literal('taskList'), content: z.array(taskItem).min(1) }),
])
const documentSchema = z
  .strictObject({
    type: z.literal('doc'),
    content: z.array(block).min(1),
  })
  .refine((document) => {
    let length = 0
    for (const block of document.content) {
      const textBlocks =
        block.type === 'paragraph' || block.type === 'codeBlock'
          ? [block]
          : block.content.map((item) => item.content[0])
      for (const textBlock of textBlocks) {
        for (const node of textBlock.content ?? []) length += Array.from(node.text).length
      }
    }
    return (
      length <= 60_000 && new TextEncoder().encode(JSON.stringify(document)).length <= 512 * 1024
    )
  }, 'El contenido supera el tamaño permitido.')

const titleSchema = storableText
  .transform((title) => title.replace(/^[\p{Z}\t\n\v\f\r\u0085]+|[\p{Z}\t\n\v\f\r\u0085]+$/gu, ''))
  .refine(
    (title) => Array.from(title).length >= 1 && Array.from(title).length <= 160,
    'Escribí un título de 1 a 160 caracteres.',
  )

export const freeNoteInput = z.object({ title: titleSchema, document: documentSchema })
export type FreeNoteInput = z.infer<typeof freeNoteInput>
export type FreeNoteDocument = FreeNoteInput['document']

const itemSchema = z.object({
  id: z.uuidv7(),
  title: z.string(),
  revision: z.int().positive(),
  updatedAt: z.iso.datetime(),
})
const noteSchema = itemSchema.extend({ document: documentSchema, createdAt: z.iso.datetime() })
const pageSchema = z.object({ items: z.array(itemSchema), next: z.string().nullable() })
export type FreeNoteItem = z.infer<typeof itemSchema>
export type FreeNote = z.infer<typeof noteSchema>

type Options = Pick<RequestOptions, 'signal' | 'sessionIsCurrent'>

function path(space: Space, id?: string) {
  const collection = `/api/spaces/${space}/free-notes`
  return id ? `${collection}/${encodeURIComponent(id)}` : collection
}

export function fetchFreeNotes(space: Space, cursor: string | null, options: Options) {
  return http.request(
    path(space) + (cursor ? '?' + new URLSearchParams({ cursor }) : ''),
    pageSchema,
    options,
  )
}

export function fetchFreeNote(space: Space, id: string, options: Options) {
  return http.request(path(space, id), noteSchema, options)
}

export function createFreeNote(
  space: Space,
  payload: FreeNoteInput,
  attemptId: string,
  options: Options,
) {
  return http.request(path(space), noteSchema, {
    ...options,
    method: 'POST',
    body: { ...payload, attemptId },
  })
}

export function updateFreeNote(
  space: Space,
  id: string,
  payload: FreeNoteInput,
  expectedRevision: number,
  options: Options,
) {
  return http.request(path(space, id), noteSchema, {
    ...options,
    method: 'PUT',
    body: { ...payload, expectedRevision },
  })
}

export function deleteFreeNote(space: Space, { id, revision }: FreeNoteItem, options: Options) {
  return http.requestVoid(`${path(space, id)}?expectedRevision=${revision}`, {
    ...options,
    method: 'DELETE',
  })
}
