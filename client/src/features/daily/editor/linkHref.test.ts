import { describe, expect, it } from 'vitest'
import { validateDailyContent } from './dailyDocument'
import { LINK_HREF_MESSAGES, normalizeLinkHref } from './linkHref'

/** Tabla de T-100: entrada escrita en el diálogo → href guardado. */
const ACCEPTED: Array<[string, string]> = [
  ['google.com', 'https://google.com/'],
  ['www.google.com', 'https://www.google.com/'],
  ['  WWW.Ejemplo.test/Ruta?q=a b  ', 'https://www.ejemplo.test/Ruta?q=a%20b'],
  ['http://ejemplo.test', 'http://ejemplo.test/'],
  ['HTTPS://jira.ejemplo.test/browse/ABC-1279', 'https://jira.ejemplo.test/browse/ABC-1279'],
  ['//ejemplo.test/a', 'https://ejemplo.test/a'],
  ['localhost:5173/notas', 'https://localhost:5173/notas'],
  ['ñandú.test', 'https://xn--and-6ma2c.test/'],
  ['ejemplo.test/100%', 'https://ejemplo.test/100%25'],
  ['ejemplo.test/a|b', 'https://ejemplo.test/a%7Cb'],
  ['ejemplo.test/a#b#c', 'https://ejemplo.test/a#b%23c'],
]

const REJECTED: Array<[string, string]> = [
  ['', LINK_HREF_MESSAGES.empty],
  ['   ', LINK_HREF_MESSAGES.empty],
  ['javascript:alert(1)', LINK_HREF_MESSAGES.scheme],
  ['data:text/html,x', LINK_HREF_MESSAGES.scheme],
  ['mailto:a@ejemplo.test', LINK_HREF_MESSAGES.scheme],
  ['ftp://ejemplo.test', LINK_HREF_MESSAGES.scheme],
  ['https://usuario:clave@ejemplo.test', LINK_HREF_MESSAGES.credentials],
  ['usuario@ejemplo.test', LINK_HREF_MESSAGES.credentials],
  ['mi_sitio.test', LINK_HREF_MESSAGES.invalid],
  ['ejemplo.123', LINK_HREF_MESSAGES.invalid],
  ['ejemplo .test', LINK_HREF_MESSAGES.invalid],
  ['/ruta/relativa', LINK_HREF_MESSAGES.invalid],
  ['https://ejemplo.test/' + 'a'.repeat(2048), LINK_HREF_MESSAGES.tooLong],
]

function documentWithLink(href: string) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'enlace', marks: [{ type: 'link', attrs: { href } }] }],
      },
    ],
  }
}

describe('normalizeLinkHref', () => {
  it('mantiene los mensajes acordados en T-100', () => {
    expect(LINK_HREF_MESSAGES).toEqual({
      empty: 'Ingresá una dirección web.',
      scheme: 'Solo se aceptan direcciones web (http o https).',
      invalid: 'Ingresá una dirección web válida, por ejemplo google.com.',
      credentials: 'La URL no puede contener credenciales.',
      tooLong: 'La URL no puede exceder 2048 caracteres.',
    })
  })

  it.each(ACCEPTED)('normaliza %j como %j', (input, expected) => {
    expect(normalizeLinkHref(input)).toEqual({ ok: true, href: expected })
  })

  it.each(ACCEPTED)('el href normalizado de %j pasa la validación del documento', (input) => {
    const result = normalizeLinkHref(input)
    if (!result.ok) throw new Error(result.error)
    expect(validateDailyContent(documentWithLink(result.href))).toMatchObject({ valid: true })
  })

  it.each(REJECTED)('rechaza %j con su mensaje', (input, message) => {
    expect(normalizeLinkHref(input)).toEqual({ ok: false, error: message })
  })
})
