import { describe, expect, it } from 'vitest'
import {
  emptyDocument,
  documentToPlainText,
  isValidSeparatorWidth,
  MAX_BLOCKS,
  MAX_HREF_LENGTH,
  MAX_HREF_TOTAL,
  MAX_TEXT_NODES,
  MAX_TEXT_TOTAL,
  plainTextToDocument,
  validateDailyContent,
  type DailyContent,
} from './dailyDocument'

describe('emptyDocument', () => {
  it('devuelve el vacío canónico', () => {
    const doc = emptyDocument()
    expect(doc).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })
})

describe('validateDailyContent', () => {
  it('acepta documento vacío canónico', () => {
    const result = validateDailyContent({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(result.valid).toBe(true)
  })

  it('acepta paragraphs con texto', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] },
        { type: 'paragraph' },
      ],
    }
    const result = validateDailyContent(doc)
    expect(result.valid).toBe(true)
  })

  it('acepta separator con ancho válido', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph' },
        { type: 'separator', attrs: { width: 50 } },
        { type: 'paragraph' },
      ],
    }
    const result = validateDailyContent(doc)
    expect(result.valid).toBe(true)
  })

  it('acepta link mark con href válido', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'JIRA-1279',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://jira.ejemplo.test/browse/JIRA-1279' },
                },
              ],
            },
          ],
        },
      ],
    }
    const result = validateDailyContent(doc)
    expect(result.valid).toBe(true)
  })

  it('rechaza root sin type=doc', () => {
    const result = validateDailyContent({ type: 'paragraph', content: [] })
    expect(result.valid).toBe(false)
  })

  it('rechaza content vacío', () => {
    const result = validateDailyContent({ type: 'doc', content: [] })
    expect(result.valid).toBe(false)
  })

  it('rechaza más de MAX_BLOCKS bloques', () => {
    const blocks = Array.from({ length: MAX_BLOCKS + 1 }, () => ({ type: 'paragraph' }))
    const result = validateDailyContent({ type: 'doc', content: blocks })
    expect(result.valid).toBe(false)
  })

  it('rechaza nodo desconocido', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [{ type: 'heading', content: [] }],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza mark desconocida', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bold',
              marks: [{ type: 'bold' }],
            },
          ],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza más de un mark por text node', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'dos',
              marks: [
                { type: 'link', attrs: { href: 'https://a.com' } },
                { type: 'link', attrs: { href: 'https://b.com' } },
              ],
            },
          ],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza separator con ancho inválido', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [{ type: 'separator', attrs: { width: 33 } }],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza href no HTTP/HTTPS', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'ftp',
              marks: [{ type: 'link', attrs: { href: 'ftp://host/file' } }],
            },
          ],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza href con credenciales', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'auth',
              marks: [{ type: 'link', attrs: { href: 'https://user:pass@host/path' } }],
            },
          ],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza href con espacios', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'space',
              marks: [{ type: 'link', attrs: { href: 'https://host/path with space' } }],
            },
          ],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza href que excede MAX_HREF_LENGTH', () => {
    const longHref = 'https://host/' + 'a'.repeat(MAX_HREF_LENGTH)
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: longHref } }],
            },
          ],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza texto con CR', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'line\rbreak' }],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza texto con LF', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'line\nbreak' }],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza campos extra en root', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [{ type: 'paragraph' }],
      extra: 'field',
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza campos extra en paragraph', () => {
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {},
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('acepta texto HTML literal como texto válido', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '<script>alert(1)</script>' }],
        },
      ],
    }
    const result = validateDailyContent(doc)
    expect(result.valid).toBe(true)
  })

  it('acepta content omitido equivalente a []', () => {
    const result1 = validateDailyContent({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
    const result2 = validateDailyContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    })
    expect(result1.valid).toBe(true)
    expect(result2.valid).toBe(true)
  })

  // Límites agregados
  it('rechaza texto total que excede MAX_TEXT_TOTAL', () => {
    const longText = 'a'.repeat(MAX_TEXT_TOTAL + 1)
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: longText }],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza más de MAX_TEXT_NODES nodos text', () => {
    const nodes = Array.from({ length: MAX_TEXT_NODES + 1 }, () => ({ type: 'text', text: 'x' }))
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: nodes,
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('rechaza href total que excede MAX_HREF_TOTAL', () => {
    const href = 'https://host/' + 'a'.repeat(100)
    const count = Math.ceil(MAX_HREF_TOTAL / href.length) + 1
    const nodes = Array.from({ length: count }, () => ({
      type: 'text',
      text: 'x',
      marks: [{ type: 'link', attrs: { href } }],
    }))
    const result = validateDailyContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: nodes,
        },
      ],
    })
    expect(result.valid).toBe(false)
  })

  it('acepta JSON con link y separator (roundtrip fixture)', () => {
    const doc: DailyContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '1279',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://jira.ejemplo.test/browse/ABC-1279' },
                },
              ],
            },
          ],
        },
        { type: 'separator', attrs: { width: 50 } },
        { type: 'paragraph' },
      ],
    }
    const result = validateDailyContent(doc)
    expect(result.valid).toBe(true)
    expect(result.data).toEqual(doc)
  })
})

describe('plainTextToDocument', () => {
  it('convierte texto simple a paragraphs', () => {
    const doc = plainTextToDocument('Hola\nMundo')
    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Mundo' }] },
      ],
    })
  })

  it('conserva líneas vacías', () => {
    const doc = plainTextToDocument('A\n\nB')
    expect(doc.content.length).toBe(3)
    expect(doc.content[1]).toEqual({ type: 'paragraph' })
  })

  it('normaliza CRLF a LF', () => {
    const doc = plainTextToDocument('A\r\nB')
    expect(doc.content.length).toBe(2)
  })

  it('normaliza CR a LF', () => {
    const doc = plainTextToDocument('A\rB')
    expect(doc.content.length).toBe(2)
  })

  it('conserva líneas vacías iniciales y finales', () => {
    const doc = plainTextToDocument('\nA\n')
    expect(doc.content.length).toBe(3)
    expect(doc.content[0]).toEqual({ type: 'paragraph' })
    expect(doc.content[2]).toEqual({ type: 'paragraph' })
  })

  it('vacío produce un paragraph', () => {
    const doc = plainTextToDocument('')
    expect(doc).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })
})

describe('documentToPlainText', () => {
  it('extrae texto de paragraphs', () => {
    const doc: DailyContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Mundo' }] },
      ],
    }
    expect(documentToPlainText(doc)).toBe('Hola\nMundo')
  })

  it('separator produce línea vacía', () => {
    const doc: DailyContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'A' }] },
        { type: 'separator', attrs: { width: 50 } },
        { type: 'paragraph', content: [{ type: 'text', text: 'B' }] },
      ],
    }
    expect(documentToPlainText(doc)).toBe('A\n\nB')
  })

  it('paragraph vacío produce línea vacía', () => {
    const doc: DailyContent = {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }
    expect(documentToPlainText(doc)).toBe('')
  })
})

describe('isValidSeparatorWidth', () => {
  it('acepta 25, 50, 75, 100', () => {
    expect(isValidSeparatorWidth(25)).toBe(true)
    expect(isValidSeparatorWidth(50)).toBe(true)
    expect(isValidSeparatorWidth(75)).toBe(true)
    expect(isValidSeparatorWidth(100)).toBe(true)
  })

  it('rechaza otros valores', () => {
    expect(isValidSeparatorWidth(33)).toBe(false)
    expect(isValidSeparatorWidth(0)).toBe(false)
    expect(isValidSeparatorWidth('50')).toBe(false)
    expect(isValidSeparatorWidth(null)).toBe(false)
  })
})
