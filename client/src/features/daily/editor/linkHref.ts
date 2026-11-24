import { MAX_HREF_LENGTH } from './dailyDocument'

export const LINK_HREF_MESSAGES = {
  empty: 'Ingresá una dirección web.',
  scheme: 'Solo se aceptan direcciones web (http o https).',
  invalid: 'Ingresá una dirección web válida, por ejemplo google.com.',
  credentials: 'La URL no puede contener credenciales.',
  tooLong: 'La URL no puede exceder 2048 caracteres.',
} as const

export type LinkHrefResult = { ok: true; href: string } | { ok: false; error: string }

/** Esquema explícito al inicio (RFC 3986), salvo `host:puerto` como `localhost:5173`. */
const SCHEME = /^([a-z][a-z0-9+.-]*):/i
const HOST_PORT = /^[a-z][a-z0-9+.-]*:\d+(?:[/?#]|$)/i
const WEB_SCHEME = /^https?$/i

/** Caracteres que `java.net.URI` admite literalmente en ruta, consulta y fragmento. */
const URI_SAFE = /[A-Za-z0-9\-._~!$&'()*+,;=:@/?]/
const HEX_PAIR = /^[0-9A-Fa-f]{2}$/

/** Gramática de host de `java.net.URI`: nombre de dominio, IPv4 o IPv6 entre corchetes. */
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/

function isJavaUriHost(hostname: string): boolean {
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true
  if (IPV4.test(hostname)) return true
  const labels = hostname.split('.')
  if (!labels.every((label) => DOMAIN_LABEL.test(label))) return false
  return /^[a-z]/i.test(labels[labels.length - 1])
}

function percentEncode(char: string): string {
  return Array.from(
    new TextEncoder().encode(char),
    (byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`,
  ).join('')
}

/** Codifica lo que `URL` deja pasar y `java.net.URI` rechaza: `%` suelto, `#` extra y caracteres fuera de RFC 3986. */
function encodeForJavaUri(rest: string): string {
  let out = ''
  let fragmentSeen = false
  for (let i = 0; i < rest.length;) {
    const char = String.fromCodePoint(rest.codePointAt(i) ?? 0)
    i += char.length
    if (char === '%') {
      out += HEX_PAIR.test(rest.slice(i, i + 2)) ? '%' : '%25'
    } else if (char === '#') {
      out += fragmentSeen ? '%23' : '#'
      fragmentSeen = true
    } else {
      out += URI_SAFE.test(char) ? char : percentEncode(char)
    }
  }
  return out
}

/**
 * Normaliza lo escrito en el diálogo de enlace a un href HTTP/HTTPS absoluto que aceptan
 * `validateDailyContent` del cliente y `DailyContent` del servidor (T-100, S-102).
 */
export function normalizeLinkHref(input: string): LinkHrefResult {
  const value = input.trim()
  if (value === '') return { ok: false, error: LINK_HREF_MESSAGES.empty }

  let candidate: string
  const scheme = SCHEME.exec(value)
  if (value.startsWith('//')) {
    candidate = `https:${value}`
  } else if (value.startsWith('/')) {
    return { ok: false, error: LINK_HREF_MESSAGES.invalid }
  } else if (scheme && !HOST_PORT.test(value)) {
    if (!WEB_SCHEME.test(scheme[1])) return { ok: false, error: LINK_HREF_MESSAGES.scheme }
    candidate = value
  } else {
    candidate = `https://${value}`
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return { ok: false, error: LINK_HREF_MESSAGES.invalid }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: LINK_HREF_MESSAGES.scheme }
  }
  if (url.username !== '' || url.password !== '') {
    return { ok: false, error: LINK_HREF_MESSAGES.credentials }
  }
  if (!isJavaUriHost(url.hostname)) return { ok: false, error: LINK_HREF_MESSAGES.invalid }

  const href = url.origin + encodeForJavaUri(url.href.slice(url.origin.length))
  if (href.length > MAX_HREF_LENGTH) return { ok: false, error: LINK_HREF_MESSAGES.tooLong }
  return { ok: true, href }
}
