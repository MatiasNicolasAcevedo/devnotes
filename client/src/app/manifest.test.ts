import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import manifestSource from '../../public/manifest.json?raw'
import { theme } from './theme'

/** UI-09: la aplicación es instalable desde Chrome. Sin service worker ni modo sin conexión. */
describe('manifiesto de la aplicación', () => {
  const page = new DOMParser().parseFromString(indexHtml, 'text/html')

  it('public/manifest.json es JSON válido con los datos de instalación acordados', () => {
    expect(JSON.parse(manifestSource)).toEqual({
      name: 'DevNotes',
      short_name: 'DevNotes',
      start_url: '/notes',
      scope: '/',
      display: 'standalone',
      background_color: '#181a1b',
      theme_color: '#212324',
      icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
    })
  })

  it('los colores coinciden con el tema oscuro', () => {
    const manifest = JSON.parse(manifestSource) as Record<string, string>
    expect(manifest.background_color).toBe(theme.palette.background.default)
    expect(manifest.theme_color).toBe(theme.palette.background.paper)
  })

  it('index.html enlaza el manifiesto y declara el color del tema', () => {
    expect(page.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/manifest.json')
    expect(page.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#212324')
    // El icono del manifiesto es el mismo favicon que ya sirve la página.
    expect(page.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.svg')
  })

  it('no registra un service worker', () => {
    expect(indexHtml).not.toMatch(/serviceWorker/)
  })
})
