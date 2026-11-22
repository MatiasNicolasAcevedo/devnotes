import { z } from 'zod'
import { http, type RequestOptions } from '../../services/http'
import type { Space } from '../spaces/space'

const cursorSchema = z.object({ id: z.uuidv7(), createdAt: z.iso.datetime() })
const detailSchema = cursorSchema.extend({ text: z.string() })
const pageSchema = z.object({
  items: z.array(cursorSchema.extend({ excerpt: z.string() })),
  next: cursorSchema.nullable(),
})

export type ImageTextCursor = z.infer<typeof cursorSchema>
export type ImageTextItem = z.infer<typeof pageSchema>['items'][number]
export type ImageTextAttempt = { attemptId: string; text: string }
type Options = Pick<RequestOptions, 'signal' | 'sessionIsCurrent'>

function path(space: Space, id?: string) {
  const collection = `/api/spaces/${space}/image-texts`
  return id ? `${collection}/${encodeURIComponent(id)}` : collection
}

export function fetchImageTexts(space: Space, after: ImageTextCursor | null, options: Options) {
  const query = after
    ? '?' + new URLSearchParams({ afterCreatedAt: after.createdAt, afterId: after.id })
    : ''
  return http.request(path(space) + query, pageSchema, options)
}

export function fetchImageText(space: Space, id: string, options: Options) {
  return http.request(path(space, id), detailSchema, options)
}

export function saveImageText(space: Space, body: ImageTextAttempt, options: Options) {
  return http.request(path(space), detailSchema, { ...options, method: 'POST', body })
}

export function deleteImageText(space: Space, id: string, options: Options) {
  return http.requestVoid(path(space, id), { ...options, method: 'DELETE' })
}

export function newImageTextAttempt(text: string): ImageTextAttempt {
  const timestamp = Date.now().toString(16).padStart(12, '0')
  const random = crypto.randomUUID()
  return {
    attemptId: `${timestamp.slice(0, 8)}-${timestamp.slice(8)}-7${random.slice(15)}`,
    text,
  }
}
