/** Anchos de referencia de las pruebas: «ancho» (≥ 600 px) y «angosto» (< 600 px). */
export const WIDE_VIEWPORT = 1280
export const NARROW_VIEWPORT = 375

let viewportWidth = WIDE_VIEWPORT

function matches(query: string): boolean {
  const min = /\(min-width:\s*([\d.]+)px\)/.exec(query)
  const max = /\(max-width:\s*([\d.]+)px\)/.exec(query)
  if (!min && !max) return false
  return (!min || viewportWidth >= Number(min[1])) && (!max || viewportWidth <= Number(max[1]))
}

/**
 * jsdom no implementa `matchMedia`: se resuelve contra un ancho simulado para que los componentes que distinguen
 * angosto y ancho se prueben en ambos. Las consultas que no son de ancho (p. ej. `prefers-reduced-motion`) no coinciden.
 */
export function installMatchMedia() {
  window.matchMedia = (query: string): MediaQueryList => ({
    get matches() {
      return matches(query)
    },
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

/** Fija el ancho simulado; llamar antes de renderizar. `setup.ts` lo restablece a ancho tras cada test. */
export function setViewportWidth(width: number) {
  viewportWidth = width
}

export function resetViewportWidth() {
  viewportWidth = WIDE_VIEWPORT
}
