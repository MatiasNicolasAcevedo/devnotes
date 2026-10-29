import { z } from 'zod'

// Límites idénticos al backend (DailyContent.java)
export const MAX_BLOCKS = 2000
export const MAX_TEXT_NODES = 4000
export const MAX_TEXT_TOTAL = 100_000
export const MAX_TEXT_PER_NODE = 100_000
export const MAX_HREF_LENGTH = 2048
export const MAX_HREF_TOTAL = 100_000
export const MAX_REFERENCES = 100

// ——— Schema Zod ———

const LinkMarkSchema = z
  .object({
    type: z.literal('link'),
    attrs: z.object({ href: z.string().max(MAX_HREF_LENGTH) }),
  })
  .strict()

const TextNodeSchema = z
  .object({
    type: z.literal('text'),
    text: z.string().max(MAX_TEXT_PER_NODE),
    marks: z.array(LinkMarkSchema).max(1).optional(),
  })
  .strict()

const ReferenceAtomSchema = z
  .object({
    type: z.literal('reference'),
    attrs: z.object({
      id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
    }),
  })
  .strict()

const InlineNodeSchema = z.union([TextNodeSchema, ReferenceAtomSchema])

const ParagraphSchema = z
  .object({
    type: z.literal('paragraph'),
    content: z.array(InlineNodeSchema).optional(),
  })
  .strict()

const SeparatorSchema = z
  .object({
    type: z.literal('separator'),
    attrs: z.object({
      width: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]),
    }),
  })
  .strict()

export const DailyContentBlockSchema = z.union([ParagraphSchema, SeparatorSchema])

export const DailyContentSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(DailyContentBlockSchema).min(1).max(MAX_BLOCKS),
  })
  .strict()

// ——— Tipos derivados ———

export type DailyContent = z.infer<typeof DailyContentSchema>
export type DailyContentBlock = z.infer<typeof DailyContentBlockSchema>
export type ParagraphBlock = z.infer<typeof ParagraphSchema>
export type SeparatorBlock = z.infer<typeof SeparatorSchema>
export type TextNode = z.infer<typeof TextNodeSchema>
export type ReferenceAtom = z.infer<typeof ReferenceAtomSchema>
export type InlineNode = z.infer<typeof InlineNodeSchema>

// ——— Factory ———

export function emptyDocument(): DailyContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

// ——— Validación con conteo agregado ———

export interface ValidationResult {
  valid: boolean
  data?: DailyContent
  error?: string
}

/**
 * Valida el árbol completo, incluyendo límites agregados que Zod no puede expresar
 * en el schema estático (texto total, nodos text, href total).
 */
export function validateDailyContent(input: unknown): ValidationResult {
  // 1. Schema estructural
  const parsed = DailyContentSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((issue) => issue.message).join('; ')
    return { valid: false, error: msg }
  }

  const doc = parsed.data
  let textNodes = 0
  let textTotal = 0
  let hrefTotal = 0
  let referenceCount = 0

  for (const block of doc.content) {
    if (block.type === 'paragraph') {
      const inlines = block.content ?? []
      for (const node of inlines) {
        textNodes++
        if (node.type === 'reference') {
          referenceCount++
          if (referenceCount > MAX_REFERENCES) {
            return { valid: false, error: 'Too many reference atoms' }
          }
        } else {
          if (node.text) {
            textTotal += node.text.length
            if (textTotal > MAX_TEXT_TOTAL) {
              return {
                valid: false,
                error: 'Text content exceeds maximum length',
              }
            }
          }
          if (node.marks) {
            for (const mark of node.marks) {
              hrefTotal += mark.attrs.href.length
              if (hrefTotal > MAX_HREF_TOTAL) {
                return {
                  valid: false,
                  error: 'Link URLs exceed maximum total length',
                }
              }
            }
          }
        }
      }
    }
  }

  if (textNodes > MAX_TEXT_NODES) {
    return { valid: false, error: 'Too many text nodes' }
  }

  // 2. Validación de href (HTTP/HTTPS, host, sin credenciales) — solo text nodes
  for (const block of doc.content) {
    if (block.type === 'paragraph') {
      const inlines = block.content ?? []
      for (const node of inlines) {
        if (node.type === 'text' && node.marks) {
          for (const mark of node.marks) {
            const hrefErr = validateHref(mark.attrs.href)
            if (hrefErr) return { valid: false, error: hrefErr }
          }
        }
      }
    }
  }

  // 3. Text no debe contener CR/LF — solo text nodes
  for (const block of doc.content) {
    if (block.type === 'paragraph') {
      const inlines = block.content ?? []
      for (const node of inlines) {
        if (
          node.type === 'text' &&
          node.text &&
          (node.text.includes('\r') || node.text.includes('\n'))
        ) {
          return { valid: false, error: 'Text must not contain line breaks' }
        }
      }
    }
  }

  return { valid: true, data: doc }
}

function validateHref(href: string): string | undefined {
  // No spaces or control chars
  for (let i = 0; i < href.length; i++) {
    const c = href.charCodeAt(i)
    if (c <= 0x1f || c === 0x7f || c === 0x20) {
      return 'Link URL must not contain spaces or control characters'
    }
  }
  let uri: URL
  try {
    uri = new URL(href)
  } catch {
    return 'Link URL is not valid'
  }
  if (uri.protocol !== 'http:' && uri.protocol !== 'https:') {
    return 'Link URL must use HTTP or HTTPS'
  }
  if (!uri.hostname) {
    return 'Link URL must have a host'
  }
  if (uri.username || uri.password) {
    return 'Link URL must not contain credentials'
  }
  return undefined
}

// ——— Transformaciones texto plano ↔ JSON ———

/**
 * Convierte texto plano con saltos de línea a documento DailyContent.
 * CRLF y CR se normalizan a LF antes de dividir.
 * Las líneas vacías se conservan como paragraphs vacíos.
 */
export function plainTextToDocument(text: string): DailyContent {
  // Normalizar CRLF y CR a LF
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')

  const blocks: ParagraphBlock[] = lines.map((line) => ({
    type: 'paragraph' as const,
    content: line.length > 0 ? [{ type: 'text' as const, text: line }] : undefined,
  }))

  // El documento vacío debe tener al menos un paragraph
  if (blocks.length === 0) {
    blocks.push({ type: 'paragraph' })
  }

  return { type: 'doc' as const, content: blocks }
}

/**
 * Extrae texto plano del documento, conservando líneas vacías.
 * Cada bloque (paragraph o separator) produce una línea.
 * Los separadores se convierten en líneas vacías.
 * Las referencias disponibles aportan @Título; las no disponibles, [Referencia no disponible].
 */
export function documentToPlainText(
  doc: DailyContent,
  options?: {
    /** Mapa de ID → título resuelto. Si falta, se usa el placeholder de no disponible. */
    referenceTitles?: Map<string, string>
  },
): string {
  const lines: string[] = []
  const titles = options?.referenceTitles ?? new Map()

  for (const block of doc.content) {
    if (block.type === 'paragraph') {
      const inlines = block.content ?? []
      const text = inlines
        .map((n) => {
          if (n.type === 'reference') {
            const title = titles.get(n.attrs.id)
            return title ? `@${title}` : '[Referencia no disponible]'
          }
          return n.text ?? ''
        })
        .join('')
      lines.push(text)
    } else {
      // separator → línea vacía
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Verifica si un ancho de separador es válido.
 */
export function isValidSeparatorWidth(width: unknown): width is 25 | 50 | 75 | 100 {
  return (
    typeof width === 'number' && (width === 25 || width === 50 || width === 75 || width === 100)
  )
}
