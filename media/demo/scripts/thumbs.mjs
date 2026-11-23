// Miniaturas de YouTube (1280×720) del tráiler v2 y de la demo narrada (T-096), con la identidad del tráiler.
// Toma un fotograma de cada video con ffmpeg, compone thumb.html y lo captura con el Edge del sistema mediante
// el Playwright ya instalado en e2e/. Escribe PNG en build/youtube y JPG livianos versionados en youtube/.
// Requiere: media/trailer-v2/renders/devnotes-trailer-v2-16x9.mp4, media/demo/build/demo.mp4,
// npm ci --prefix e2e y Microsoft Edge. Uso, desde la raíz: node media/demo/scripts/thumbs.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(ROOT, '..', '..')
const BUILD = path.join(ROOT, 'build', 'youtube')
const OUT = path.join(ROOT, 'youtube')
const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args])
fs.mkdirSync(BUILD, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })

// Fotogramas: la IA del tráiler (33,5 s, recortada a la tarjeta) y la lectura al lado de la demo (escena S16).
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'timeline.json'), 'utf8'))
const side = timeline.scenes.find((s) => s.id === 'S16-lectura-al-lado')
ffmpeg(['-ss', '33.5', '-i', path.join(REPO, 'media', 'trailer-v2', 'renders', 'devnotes-trailer-v2-16x9.mp4'),
  '-frames:v', '1', '-vf', 'crop=980:640:900:110', path.join(BUILD, 'trailer-frame.png')])
ffmpeg(['-ss', (side.voiceStart + side.voice - 0.5).toFixed(2), '-i', path.join(ROOT, 'build', 'demo.mp4'),
  '-frames:v', '1', path.join(BUILD, 'demo-frame.png')])

const items = [
  { name: 'miniatura-trailer', img: 'trailer-frame.png', kicker: 'TRÁILER · 46 s',
    title: 'Tu cuaderno<br>de trabajo<br><em>diario.</em>', pills: 'Notas|Voz|Imagen|IA' },
  { name: 'miniatura-demo', img: 'demo-frame.png', kicker: 'DEMO GUIADA · 6 min',
    title: 'Todas las<br>funciones,<br><em>paso a paso.</em>', pills: 'Narrada|Subtítulos ES|Escritorio y móvil' },
]
fs.copyFileSync(path.join(ROOT, 'scripts', 'thumb.html'), path.join(BUILD, 'thumb.html'))
const { chromium } = await import(pathToFileURL(path.join(REPO, 'e2e', 'node_modules', '@playwright', 'test', 'index.mjs')).href)
const browser = await chromium.launch({ channel: 'msedge' })
const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } })
for (const item of items) {
  const query = new URLSearchParams({ img: item.img, kicker: item.kicker, title: item.title, pills: item.pills })
  await tab.goto(`${pathToFileURL(path.join(BUILD, 'thumb.html')).href}?${query}`)
  await tab.waitForLoadState('networkidle')
  await tab.evaluate(() => document.fonts.ready)
  const png = path.join(BUILD, `${item.name}.png`)
  await tab.screenshot({ path: png })
  ffmpeg(['-i', png, '-q:v', '3', path.join(OUT, `${item.name}.jpg`)])
  console.log(`ok ${item.name}: ${path.relative(REPO, png)} y ${path.relative(REPO, path.join(OUT, item.name + '.jpg'))}`)
}
await browser.close()
