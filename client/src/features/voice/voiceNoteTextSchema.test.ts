import { describe, expect, it } from 'vitest'
import { voiceNoteTextSchema } from './useVoiceDraft'

describe('voiceNoteTextSchema', () => {
  it('rechaza texto vacío', () => {
    const result = voiceNoteTextSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('rechaza solo espacios', () => {
    const result = voiceNoteTextSchema.safeParse('   \n  ')
    expect(result.success).toBe(false)
  })

  it('acepta texto válido', () => {
    const result = voiceNoteTextSchema.safeParse('Hola mundo')
    expect(result.success).toBe(true)
  })

  it('normaliza CRLF a LF', () => {
    const result = voiceNoteTextSchema.safeParse('Línea 1\r\nLínea 2')
    expect(result.success).toBe(true)
  })

  it('rechaza texto con U+0000', () => {
    const result = voiceNoteTextSchema.safeParse('texto\u0000nulo')
    expect(result.success).toBe(false)
  })

  it('rechaza texto excesivamente largo', () => {
    const result = voiceNoteTextSchema.safeParse('a'.repeat(50001))
    expect(result.success).toBe(false)
  })

  it('acepta texto de 50000 caracteres', () => {
    const result = voiceNoteTextSchema.safeParse('a'.repeat(50000))
    expect(result.success).toBe(true)
  })
})
