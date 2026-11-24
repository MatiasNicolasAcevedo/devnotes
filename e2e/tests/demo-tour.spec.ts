// T-096 · Recorrido completo de la demo narrada (media/demo/script.json).
// Sin archivo de ritmo es un E2E funcional del recorrido: API, OIDC, DB y dobles externos reales del stack propio,
// sin page.route ni API fabricada. Con /artifacts/control/demo-pacing.json (lo copia media/demo/scripts/capture.sh)
// graba cuadros JPEG con page.screencast, marca escenas, capítulos y cortes, y espera la duración real de cada clip.
// Cuenta y datos ficticios. El formulario del proveedor OIDC de prueba queda dentro de un corte del montaje.
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { control, expect, keyboardActivate, notesUrl, readiness, savedIndicator, test } from './fixtures';
import { fakeMicrophone, prepareVoiceContext } from '../fixtures/voice-fixture';

const PACING = '/artifacts/control/demo-pacing.json';
type Pacing = { lead: number; scenes: Record<string, { voice: number; pause: number }> };
const pacing: Pacing | null = existsSync(PACING) ? JSON.parse(readFileSync(PACING, 'utf8')) : null;
const capture = pacing !== null;

// Al grabar, la traza queda apagada: abriría el screencast antes y fijaría su tamaño por defecto (800×450).
test.use({ launchOptions: fakeMicrophone, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5,
  ...(capture ? { trace: 'off' as const } : {}) });
test.describe.configure({ timeout: capture ? 1_500_000 : 300_000 });
// Una acción trabada falla en un minuto en vez de agotar el tiempo de toda la grabación.
test.use({ actionTimeout: 60_000 });

const CHAPTERS: Record<string, [string, string]> = {
  C1: ['Ingreso', 'Cuenta ficticia y espacios'],
  C2: ['Diario', 'Escribir, enlazar, separar y versionar'],
  C3: ['Referencias', 'Elementos propios y lectura al lado'],
  C4: ['Libres', 'Listas, títulos, negrita y código'],
  C5: ['Voz', 'Grabar, revisar y guardar'],
  C6: ['Imagen', 'De una captura a texto'],
  C7: ['IA', 'Proveedor, fragmento y respuesta'],
  C8: ['Respaldo', 'Exportar e importar en una cuenta vacía'],
  C9: ['En el teléfono', 'La misma nota en pantalla angosta'],
};
const yesterdayLines = [
  'Daily: revisar el despliegue del ticket 1279',
  'Pendiente: ajustar el timeout del cliente HTTP a 30 s',
  'Bloqueo: esperar la revisión del PR de migraciones',
];
const tomorrow = 'Mañana: retomar la prueba de carga';
const todayLine = 'Hoy: desplegado en staging, falta la prueba de humo';
const reference = { title: 'Runbook de despliegue', description: 'kubectl rollout status deploy/api -n staging' };
const freeTitle = 'Checklist de despliegue';
const sql = "SELECT id, estado\nFROM despliegues\nWHERE entorno = 'staging';";

function isoDay(offset: number) {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-');
}

/**
 * Cursor visible solo al grabar: sigue los eventos reales del mouse y marca cada clic. No intercepta eventos.
 * Reemplaza screencast.showActions, que en Playwright 1.64 pierde teclas al escribir con demora.
 */
const CURSOR = `(() => {
  if (window.__demoCursor) return;
  window.__demoCursor = true;
  const install = () => {
    const cursor = document.createElement('div');
    cursor.setAttribute('aria-hidden', 'true');
    cursor.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;pointer-events:none;z-index:2147483647;'
      + 'transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))';
    cursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2 3.8 7.2-2.6 1.4-3.8-7.3L4 20z" '
      + 'fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cursor);
    const place = (x, y) => { cursor.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 2) + 'px)'; };
    window.__demoCursorTo = (x, y) => {
      cursor.style.transition = 'transform 520ms cubic-bezier(.4, 0, .2, 1)';
      place(x, y);
      setTimeout(() => { cursor.style.transition = 'none'; }, 540);
    };
    addEventListener('mousemove', (event) => place(event.clientX, event.clientY), { capture: true, passive: true });
    addEventListener('mousedown', (event) => {
      const ring = document.createElement('div');
      ring.setAttribute('aria-hidden', 'true');
      ring.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;width:34px;height:34px;border-radius:50%;'
        + 'border:3px solid rgba(255,183,77,.95);left:' + (event.clientX - 17) + 'px;top:' + (event.clientY - 17) + 'px;'
        + 'transition:transform .45s ease-out,opacity .45s ease-out;transform:scale(.4);opacity:1';
      document.documentElement.appendChild(ring);
      requestAnimationFrame(() => { ring.style.transform = 'scale(1.6)'; ring.style.opacity = '0'; });
      setTimeout(() => ring.remove(), 600);
    }, { capture: true, passive: true });
  };
  if (document.documentElement) install(); else addEventListener('DOMContentLoaded', install);
})()`;

/** Línea de tiempo de la captura: cuadros y marcas con el mismo reloj (Date.now). */
class Timeline {
  private frames = 0;
  private cutStart: number | null = null;
  private cutTotal = 0;
  private sceneStart = 0;
  private sceneCut = 0;
  private dir: string;
  constructor(private page: Page, info: TestInfo) {
    this.dir = info.outputPath('demo-capture');
  }
  private mark(entry: object) {
    if (capture) appendFileSync(`${this.dir}/markers.jsonl`, JSON.stringify({ t: Date.now(), ...entry }) + '\n');
  }
  async start() {
    if (!capture) return;
    mkdirSync(`${this.dir}/frames`, { recursive: true });
    await this.page.screencast.start({
      size: { width: 1920, height: 1080 },
      quality: 92,
      onFrame: ({ data, viewportWidth, viewportHeight }) => {
        const n = ++this.frames;
        const name = `f${String(n).padStart(6, '0')}.jpg`;
        writeFileSync(`${this.dir}/frames/${name}`, data);
        appendFileSync(`${this.dir}/frames.jsonl`,
          JSON.stringify({ n, t: Date.now(), file: name, viewportWidth, viewportHeight }) + '\n');
      },
    });
    await this.page.context().addInitScript(CURSOR);
    await this.page.evaluate(CURSOR);
    this.mark({ type: 'start' });
  }
  async stop() {
    if (!capture) return;
    this.mark({ type: 'end' });
    await this.page.screencast.stop();
  }
  /**
   * Al grabar, anima solo el cursor dibujado hasta el centro del elemento; el mouse real salta al hacer clic.
   * Un recorrido con mouse.move por pasos y una pausa sobre el editor diario deja el clic sin mover el caret
   * en Chromium de Playwright (ensayo aislado de T-096), así que el gesto real se mantiene directo.
   */
  async move(target: Locator) {
    if (!capture) return;
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) return;
    await this.page.evaluate(([x, y]) => (window as unknown as { __demoCursorTo?: (x: number, y: number) => void })
      .__demoCursorTo?.(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
    await this.page.waitForTimeout(560);
  }
  async click(target: Locator) {
    await this.move(target);
    await target.click();
  }
  async hover(target: Locator) {
    await this.move(target);
    await target.hover();
  }
  /** Pausa visible solo al grabar. */
  async beat(ms: number) {
    if (capture) await this.page.waitForTimeout(ms);
  }
  cut(on: boolean) {
    if (!capture) return;
    const now = Date.now();
    if (on) this.cutStart = now;
    else if (this.cutStart !== null) {
      this.cutTotal += now - this.cutStart;
      this.sceneCut += now - this.cutStart;
      this.cutStart = null;
    }
    this.mark({ type: on ? 'cut-start' : 'cut-end' });
  }
  async chapter(id: string) {
    const [title, description] = CHAPTERS[id];
    this.mark({ type: 'chapter', id, title });
    if (!capture) return;
    await this.page.screencast.showChapter(title, { description, duration: 2200 });
    await this.page.waitForTimeout(2600);
  }
  async scene(id: string, body: () => Promise<void>) {
    this.sceneStart = Date.now();
    this.sceneCut = 0;
    this.mark({ type: 'scene', id });
    if (pacing) {
      expect(pacing.scenes[id], `Pacing for ${id}`).toBeDefined();
      await this.page.waitForTimeout(pacing.lead * 1000);
    }
    await body();
    if (pacing) {
      const { voice, pause } = pacing.scenes[id];
      const target = this.sceneStart + this.sceneCut + (pacing.lead + voice + pause) * 1000;
      const wait = target - Date.now();
      if (wait > 0) await this.page.waitForTimeout(wait);
      else this.mark({ type: 'overrun', id, ms: -wait });
    }
    this.mark({ type: 'scene-end', id });
  }
}

async function typeSlow(page: Page, text: string) {
  await page.keyboard.type(text, { delay: capture ? 38 : 0 });
}

async function providerLogin(page: Page, tl: Timeline, subject: string, name: string) {
  await keyboardActivate(page, 'link', 'Continuar con Google');
  tl.cut(true);
  await page.getByPlaceholder('Enter any user/subject').fill(subject);
  await page.locator('textarea[name="claims"]').fill(JSON.stringify({
    aud: ['starter-test'], name, email: `${subject}@example.invalid`, email_verified: true,
  }));
  await tl.click(page.getByRole('button', { name: 'Sign-in', exact: true }));
  await expect(page).toHaveURL(notesUrl);
  await expect(page.getByRole('button', { name: `Cuenta de ${name}`, exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Editor de nota diaria' })).toHaveAttribute('contenteditable', 'true');
  await page.waitForTimeout(capture ? 600 : 0);
  tl.cut(false);
}

/** Espera que el autoguardado del diario termine: debounce de 700 ms y «Guardado» estable. */
async function settle(page: Page) {
  await page.waitForTimeout(900);
  await expect(savedIndicator(page)).toBeVisible();
  await page.waitForTimeout(300);
  await expect(savedIndicator(page)).toBeVisible();
}

/** Selecciona `word` dentro del párrafo `index`, como una selección con el mouse. */
async function selectWord(editor: Locator, index: number, word: string) {
  await editor.evaluate((element, [at, text]) => {
    const paragraph = element.querySelectorAll('p')[at as number];
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const start = node.textContent!.indexOf(text as string);
      if (start < 0) continue;
      (element as HTMLElement).focus();
      window.getSelection()!.setBaseAndExtent(node, start, node, start + (text as string).length);
      return;
    }
    throw new Error('Expected word');
  }, [index, word] as const);
}

/** Caret al final del párrafo `index` (-1 = último), como un clic al final de esa línea. */
async function caretAtEnd(editor: Locator, index: number) {
  await editor.evaluate((element, at) => {
    const paragraphs = [...element.querySelectorAll('p')];
    const paragraph = paragraphs.at(at);
    if (!paragraph) throw new Error('Expected paragraph');
    (element as HTMLElement).focus();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(false);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  }, index);
}

async function selectParagraph(editor: Locator, index: number) {
  await editor.evaluate((element, at) => {
    const paragraph = element.querySelectorAll('p')[at];
    if (!paragraph) throw new Error('Expected paragraph');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  }, index);
}

test('demo tour: every delivered feature from an empty day to the restored backup', async ({ page, context, identity }, info) => {
  await prepareVoiceContext(context);
  await control('reference-login');
  await readiness(page);
  const tl = new Timeline(page, info);
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  const yesterday = isoDay(-1);
  const today = isoDay(0);
  const short = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Ingresar a DevNotes' })).toBeVisible();
  await tl.start();
  await tl.beat(800);

  // ---------- C1 · Ingreso ----------
  await tl.chapter('C1');
  await tl.scene('S01-bienvenida', async () => {
    await tl.beat(1500);
    await tl.hover(page.getByRole('link', { name: 'Continuar con Google' }));
  });
  await tl.scene('S02-ingreso', async () => {
    await tl.beat(1200);
    await providerLogin(page, tl, `e2e-ai-${identity}`, 'Ana Ejemplo');
    await expect(savedIndicator(page)).toBeVisible();
  });
  await tl.scene('S03-navegacion', async () => {
    for (const name of ['Notas', 'Referencias', 'Voz', 'Imagen', 'Historial']) {
      await tl.hover(nav.getByRole('link', { name, exact: true }));
      await tl.beat(650);
    }
    await tl.hover(page.getByRole('banner').getByRole('status', { name: 'Servidor conectado' }));
    await tl.beat(900);
    await tl.hover(page.getByRole('button', { name: 'Elegir proveedor y modelo', exact: true }).first());
    await tl.beat(700);
    await tl.hover(page.getByRole('button', { name: 'Cuenta de Ana Ejemplo', exact: true }));
  });
  await tl.scene('S04-espacios', async () => {
    await tl.click(page.getByRole('button', { name: 'Espacio: Trabajo', exact: true }));
    await tl.beat(1400);
    await tl.click(page.getByRole('menuitemradio', { name: 'Personal', exact: true }));
    await expect(page.getByRole('button', { name: 'Espacio: Personal', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/space=personal/);
    await tl.beat(1800);
    await tl.click(page.getByRole('button', { name: 'Espacio: Personal', exact: true }));
    await tl.beat(700);
    await tl.click(page.getByRole('menuitemradio', { name: 'Trabajo', exact: true }));
    await expect(page.getByRole('button', { name: 'Espacio: Trabajo', exact: true })).toBeVisible();
  });

  // ---------- C2 · Diario ----------
  await tl.chapter('C2');
  await tl.scene('S05-fecha', async () => {
    await tl.click(page.getByRole('button', { name: `Cambiar fecha (${short(today)})` }));
    await tl.beat(900);
    await page.getByLabel('Fecha', { exact: true }).fill(yesterday);
    await expect(page).toHaveURL(`http://localhost/notes/${yesterday}?space=work`);
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    await expect(page.getByRole('button', { name: `Cambiar fecha (${short(yesterday)})` })).toBeVisible();
  });
  await tl.scene('S06-escribir', async () => {
    await tl.click(editor);
    for (const [index, line] of yesterdayLines.entries()) {
      if (index) await page.keyboard.press('Enter');
      await typeSlow(page, line);
    }
    await expect(savedIndicator(page)).toBeVisible();
    await tl.beat(600);
    await tl.hover(page.getByRole('status', { name: 'Estado de guardado', exact: true }));
  });
  await tl.scene('S07-enlace', async () => {
    // El caret del diario se mueve con teclado: un clic con el autoguardado en vuelo no lo mueve (ver tarea).
    await settle(page);
    await tl.move(editor.locator('p').first());
    await selectWord(editor, 0, '1279');
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe('1279');
    await expect(page.getByRole('button', { name: 'Agregar enlace', exact: true })).toBeEnabled();
    await tl.beat(700);
    await tl.click(page.getByRole('button', { name: 'Agregar enlace', exact: true }));
    const dialog = page.getByRole('dialog');
    await tl.beat(500);
    await tl.click(dialog.getByRole('textbox', { name: 'URL', exact: true }));
    await typeSlow(page, 'https://example.test/tickets/1279');
    await tl.beat(400);
    await tl.click(dialog.getByRole('button', { name: 'Guardar', exact: true }));
    await expect(dialog).toBeHidden();
    await expect(editor.getByRole('link', { name: '1279' })).toBeVisible();
    await expect(savedIndicator(page)).toBeVisible();
  });
  await tl.scene('S08-separador', async () => {
    await settle(page);
    await tl.move(editor.locator('p').nth(2));
    await caretAtEnd(editor, 2);
    await page.keyboard.press('Enter');
    await typeSlow(page, '--50');
    await tl.beat(500);
    await page.keyboard.press('Enter');
    await expect(editor.locator('hr[data-type="separator"][data-width="50"]')).toBeVisible();
    await typeSlow(page, tomorrow);
    await page.keyboard.press('Enter');
    await typeSlow(page, '---');
    await tl.beat(400);
    await page.keyboard.press('Enter');
    await expect(editor.locator('hr[data-type="separator"][data-width="100"]')).toBeVisible();
    await expect(savedIndicator(page)).toBeVisible();
  });
  await tl.scene('S09-version', async () => {
    await settle(page);
    const saved = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/daily-notes/${yesterday}/version` && r.request().method() === 'POST');
    await tl.click(page.getByRole('button', { name: 'Guardar versión', exact: true }));
    expect((await saved).status()).toBe(200);
    await expect(page.getByText('Versión guardada correctamente.', { exact: true })).toBeVisible();
  });
  await tl.scene('S10-copiar-anterior', async () => {
    await tl.click(page.getByRole('link', { name: 'Hoy', exact: true }));
    await expect(page).toHaveURL(new RegExp(`/notes/${today}\\?space=work$`));
    const copy = page.getByRole('button', { name: /^Copiar nota del / });
    await expect(copy).toBeVisible();
    await tl.beat(1800);
    const copied = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/daily-notes/${today}/copy-previous` && r.request().method() === 'POST');
    await tl.click(copy);
    expect((await copied).ok()).toBe(true);
    await expect(editor).toContainText(yesterdayLines[0]);
    await expect(savedIndicator(page)).toBeVisible();
  });
  await tl.scene('S11-ajustar', async () => {
    await settle(page);
    await tl.move(editor.locator('p').last());
    await caretAtEnd(editor, -1);
    await typeSlow(page, todayLine);
    await settle(page);
    await tl.click(page.getByRole('button', { name: 'Copiar nota', exact: true }));
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(todayLine);
  });
  await tl.scene('S12-historial', async () => {
    await tl.click(nav.getByRole('link', { name: 'Historial', exact: true }));
    await expect(page).toHaveURL('http://localhost/history?space=work');
    await tl.beat(1200);
    await tl.click(page.getByRole('link', { name: new RegExp(yesterday.split('-').reverse().join('/')) }));
    const readOnly = page.getByRole('textbox', { name: 'Versión de solo lectura' });
    await expect(readOnly).toContainText(yesterdayLines[1]);
    await expect(readOnly).toHaveAttribute('contenteditable', 'false');
  });

  // ---------- C3 · Referencias ----------
  await tl.chapter('C3');
  await tl.scene('S13-referencia-crear', async () => {
    await tl.click(nav.getByRole('link', { name: 'Referencias', exact: true }));
    await tl.beat(900);
    await tl.click(page.getByRole('button', { name: 'Crear elemento', exact: true }));
    await tl.click(page.getByRole('textbox', { name: 'Título' }));
    await typeSlow(page, reference.title);
    await tl.click(page.getByRole('textbox', { name: 'Descripción', exact: true }));
    await typeSlow(page, reference.description);
    await tl.click(page.getByRole('button', { name: 'Guardar', exact: true }));
    await expect(page.getByRole('heading', { name: reference.title, exact: true })).toBeVisible();
  });
  await tl.scene('S14-referencia-acciones', async () => {
    for (const name of [`Copiar título ${reference.title}`, `Editar ${reference.title}`, `Eliminar ${reference.title}`]) {
      await tl.hover(page.getByRole('button', { name, exact: true }));
      await tl.beat(600);
    }
    await tl.click(page.getByRole('button', { name: `Copiar descripción ${reference.title}`, exact: true }));
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(reference.description);
  });
  await tl.scene('S15-referencia-insertar', async () => {
    await tl.click(nav.getByRole('link', { name: 'Notas', exact: true }));
    await expect(editor).toContainText(todayLine);
    await settle(page);
    await tl.move(editor.locator('p').last());
    await caretAtEnd(editor, -1);
    await page.keyboard.press('Enter');
    await typeSlow(page, 'Ver ');
    await page.keyboard.type('@');
    const picker = page.locator('[data-reference-picker]');
    await expect(picker).toBeVisible();
    await page.keyboard.type('Runbook', { delay: 100 });
    await tl.beat(600);
    await tl.click(picker.getByRole('button', { name: new RegExp(reference.title) }));
    await expect(picker).toBeHidden();
    const atom = editor.locator('[data-reference-id]');
    await expect(atom).toHaveText(`@${reference.title}`);
    await tl.beat(600);
    await tl.click(atom);
    await expect(page.getByText(reference.description)).toBeVisible();
    await tl.beat(2200);
    await page.keyboard.press('Escape');
  });
  await tl.scene('S16-lectura-al-lado', async () => {
    await tl.click(page.getByRole('button', { name: 'Herramientas', exact: true }));
    const choices = page.getByRole('dialog', { name: 'Herramientas' }).or(page.getByRole('menu', { name: 'Herramientas' }));
    await tl.beat(500);
    await tl.click(choices.getByText('Abrir al lado', { exact: true }));
    const selector = page.getByRole('dialog', { name: 'Elegir una consulta' });
    await expect(selector.getByRole('region', { name: 'Versiones guardadas' })).toBeVisible();
    await tl.beat(900);
    await tl.click(selector.getByRole('region', { name: 'Versiones guardadas' }).getByRole('button').first());
    await expect(page.getByText(yesterdayLines[2]).last()).toBeVisible();
    await expect(editor).toContainText(todayLine);
  });

  // ---------- C4 · Libres ----------
  await tl.chapter('C4');
  await tl.scene('S17-libres-crear', async () => {
    await tl.click(page.getByRole('button', { name: 'Cerrar consulta' }));
    await tl.click(page.getByRole('link', { name: 'Libres', exact: true }));
    await expect(page.getByRole('heading', { level: 1, name: 'Libres' })).toBeVisible();
    await tl.beat(700);
    await tl.click(page.getByRole('link', { name: 'Nueva nota' }));
    await tl.click(page.getByRole('textbox', { name: 'Título' }));
    await typeSlow(page, freeTitle);
    await tl.click(page.getByRole('textbox', { name: 'Contenido' }));
    for (const [index, line] of ['Antes de desplegar', 'Congelar merges', 'Correr migraciones', 'Prueba de humo'].entries()) {
      if (index) await page.keyboard.press('Enter');
      await typeSlow(page, line);
    }
  });
  const body = page.getByRole('textbox', { name: 'Contenido' });
  await tl.scene('S18-libres-listas', async () => {
    await tl.click(body.locator('p').nth(1));
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+Control+End');
    await tl.beat(500);
    await tl.click(page.getByRole('button', { name: 'Lista', exact: true }));
    await tl.beat(700);
    await tl.click(page.getByRole('menuitem', { name: 'Casillas', exact: true }));
    const first = body.getByRole('checkbox', { name: 'Casilla: Congelar merges' });
    await expect(first).toBeVisible();
    await tl.beat(600);
    await tl.click(first);
    await expect(first).toBeChecked();
  });
  await tl.scene('S19-libres-formato', async () => {
    await tl.click(body.locator('p').first());
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await tl.click(page.getByRole('button', { name: 'Formato', exact: true }));
    await tl.beat(700);
    await tl.click(page.getByRole('menuitem', { name: 'Título 2', exact: true }));
    const heading = body.getByRole('heading', { level: 2 });
    await expect(heading).toHaveText('Antes de desplegar');
    await expect(body).toBeFocused();
    await heading.evaluate((element) => {
      const text = element.firstChild!;
      const start = text.textContent!.indexOf('desplegar');
      window.getSelection()!.setBaseAndExtent(text, start, text, start + 'desplegar'.length);
    });
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe('desplegar');
    await tl.beat(600);
    await tl.click(page.getByRole('button', { name: 'Formato', exact: true }));
    await tl.beat(500);
    await tl.click(page.getByRole('menuitem', { name: 'Negrita', exact: true }));
    await expect(body.getByRole('heading', { level: 2 }).locator('strong')).toHaveText('desplegar');
  });
  await tl.scene('S20-libres-codigo', async () => {
    // Tras elegir un formato, un clic en otra línea no mueve el caret en este Chromium; se ubica como en el diario.
    await tl.move(body.getByText('Prueba de humo'));
    await caretAtEnd(body, -1);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await tl.click(page.getByRole('button', { name: 'Herramientas', exact: true }));
    await tl.beat(500);
    await tl.click(page.getByRole('menuitem', { name: 'Bloque de código' }));
    await tl.beat(500);
    await tl.click(page.getByRole('menuitem', { name: 'SQL', exact: true }));
    await page.evaluate(text => navigator.clipboard.writeText(text), sql);
    await body.press('Control+v');
    const card = body.locator('.free-note-code');
    await expect(card.locator('.code-keyword').first()).toHaveText('SELECT');
    await expect(body.getByRole('heading', { level: 2 })).toHaveText('Antes de desplegar');
    await expect(body.locator('li').last()).toHaveText('Prueba de humo');
    await tl.beat(700);
    await tl.click(card.getByRole('button', { name: 'Copiar código' }));
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(sql);
  });
  await tl.scene('S21-libres-guardar', async () => {
    await tl.click(page.getByRole('button', { name: 'Guardar', exact: true }));
    await expect(page.getByRole('heading', { name: 'Editar nota' })).toBeVisible();
    await tl.beat(600);
    await tl.click(page.getByRole('link', { name: 'Libres', exact: true }));
    await expect(page.getByRole('link', { name: new RegExp(freeTitle) })).toBeVisible();
    await tl.beat(900);
    await tl.click(page.getByRole('button', { name: `Borrar ${freeTitle}` }));
    const deletion = page.getByRole('dialog', { name: '¿Borrar la nota libre?' });
    await expect(deletion).toBeVisible();
    await tl.beat(1400);
    await tl.click(deletion.getByRole('button', { name: 'Cancelar', exact: true }));
    await expect(page.getByRole('link', { name: new RegExp(freeTitle) })).toBeVisible();
  });

  // ---------- C5 · Voz ----------
  await tl.chapter('C5');
  const voiceText = page.getByRole('textbox', { name: 'Texto de la nota' });
  await tl.scene('S22-voz-grabar', async () => {
    await tl.click(nav.getByRole('link', { name: 'Voz', exact: true }));
    await expect(page.getByRole('heading', { level: 1, name: 'Notas de voz' })).toBeVisible();
    await tl.beat(600);
    await tl.click(page.getByRole('button', { name: 'Grabar', exact: true }));
    await expect(page.getByRole('timer')).toHaveText(capture ? /^00:0[3-9]$/ : /^00:0[1-9]$/, { timeout: 15_000 });
    const transcribed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/voice/transcriptions' && r.request().method() === 'POST');
    await tl.click(page.getByRole('button', { name: 'Detener y transcribir', exact: true }));
    expect((await transcribed).status()).toBe(200);
    await expect(voiceText).toHaveValue(/transcripción de prueba/);
  });
  await tl.scene('S23-voz-guardar', async () => {
    await voiceText.press('Control+End');
    await page.keyboard.press('Enter');
    await typeSlow(page, 'Recordar: revisar los logs del job nocturno.');
    await tl.beat(400);
    await tl.click(page.getByRole('button', { name: 'Copiar', exact: true }));
    await expect(page.getByText('Texto copiado al portapapeles.', { exact: true })).toBeVisible();
    await tl.beat(600);
    const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/voice-notes' && r.request().method() === 'POST');
    await tl.click(page.getByRole('button', { name: 'Guardar', exact: true }));
    expect((await created).status()).toBe(201);
    await expect(page.getByRole('region', { name: 'Notas guardadas' })).toContainText('job nocturno');
  });

  // ---------- C6 · Imagen ----------
  await tl.chapter('C6');
  const image = page.getByRole('main');
  const extracted = image.getByRole('textbox', { name: 'Texto extraído' });
  await tl.scene('S24-imagen-extraer', async () => {
    await tl.click(nav.getByRole('link', { name: 'Imagen', exact: true }));
    await expect(page.getByRole('heading', { level: 1, name: 'Imagen a texto' })).toBeVisible();
    const zone = image.getByRole('group', { name: 'Zona para pegar una captura' });
    await tl.click(zone);
    await tl.beat(700);
    const bytes = [...readFileSync(fileURLToPath(new URL('../fixtures/ocr/terminal.png', import.meta.url)))];
    await zone.evaluate((node, data) => {
      const clipboardData = new DataTransfer();
      clipboardData.items.add(new File([new Uint8Array(data)], 'captura.png', { type: 'image/png' }));
      node.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
    }, bytes);
    await expect(image.getByRole('img', { name: 'Vista previa de la captura' })).toBeVisible();
    await tl.beat(1300);
    await tl.click(image.getByRole('button', { name: 'Extraer texto', exact: true }));
    await expect(extracted).toHaveValue(/ERR_CONNECTION_RESET/);
  });
  await tl.scene('S25-imagen-guardar', async () => {
    await extracted.press('Control+End');
    await typeSlow(page, ' (reintentar)');
    await tl.beat(400);
    await tl.click(image.getByRole('button', { name: 'Copiar texto', exact: true }));
    await expect(image.getByRole('status').filter({ hasText: 'Texto copiado' })).toBeVisible();
    await tl.beat(700);
    await tl.click(image.getByRole('button', { name: 'Guardar', exact: true }));
    await expect(image.getByRole('region', { name: 'Textos guardados' })).toContainText('ERR_CONNECTION_RESET');
  });

  // ---------- C7 · IA ----------
  await tl.chapter('C7');
  await tl.scene('S26-ia-selector', async () => {
    await tl.click(page.getByRole('button', { name: 'Elegir proveedor y modelo', exact: true }).first());
    const dialog = page.getByRole('dialog', { name: 'Proveedor y modelo' });
    await expect(dialog.getByRole('list', { name: 'Estado por modelo' })).toBeVisible();
    await tl.beat(1200);
    await dialog.getByLabel('Proveedor', { exact: true }).selectOption('workers');
    await tl.beat(900);
    await dialog.getByLabel('Modelo', { exact: true }).selectOption('@cf/openai/gpt-oss-120b');
    await expect(dialog.getByRole('list', { name: 'Estado por modelo' })).toBeVisible();
    await tl.beat(1400);
    await tl.click(dialog.getByRole('button', { name: 'Aplicar' }));
    await expect(dialog).toBeHidden();
  });
  await tl.scene('S27-ia-fragmento', async () => {
    await tl.click(nav.getByRole('link', { name: 'Notas', exact: true }));
    await expect(editor).toContainText(yesterdayLines[1]);
    await settle(page);
    await tl.move(editor.locator('p').nth(1));
    await selectParagraph(editor, 1);
    await tl.beat(900);
    await tl.click(page.getByRole('button', { name: 'Consultar con IA' }));
    await expect(page.getByRole('textbox', { name: 'Fragmento a compartir' })).toHaveValue(yesterdayLines[1]);
    await expect(page.getByText('Se enviará a Cloudflare Workers AI · GPT OSS 120B')).toBeVisible();
  });
  await tl.scene('S28-ia-enviar', async () => {
    await tl.click(page.getByRole('textbox', { name: 'Mensaje' }));
    await typeSlow(page, 'Proponé el próximo paso en una frase.');
    await tl.beat(400);
    await tl.click(page.getByRole('button', { name: 'Enviar', exact: true }));
    const answer = page.getByText(/Resultado ficticio @cf\/openai\/gpt-oss-120b/);
    await expect(answer).toBeVisible();
    await tl.beat(900);
    await tl.click(page.getByRole('button', { name: 'Copiar texto', exact: true }).last());
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Resultado ficticio');
  });
  await tl.scene('S29-ia-anadir', async () => {
    const remove = page.getByRole('button', { name: 'Quitar fragmento' });
    if (await remove.isVisible()) await remove.click();
    await expect(page.getByRole('textbox', { name: 'Fragmento a compartir' })).toHaveCount(0);
    await tl.click(page.getByRole('button', { name: 'Añadir fragmento' }));
    const dialog = page.getByRole('dialog', { name: 'Añadir fragmento' });
    await tl.beat(700);
    await dialog.getByLabel('Origen').selectOption('free');
    await tl.beat(600);
    await dialog.getByLabel('Nota guardada').selectOption({ label: freeTitle });
    const stored = dialog.getByRole('textbox', { name: 'Texto guardado' });
    await expect(stored).toContainText('Congelar merges');
    await stored.focus();
    await stored.press('Control+a');
    await tl.beat(700);
    await tl.click(dialog.getByRole('button', { name: 'Añadir la selección' }));
    await expect(page.getByRole('textbox', { name: 'Fragmento a compartir' })).toHaveValue(/Congelar merges/);
  });

  // ---------- C8 · Respaldo ----------
  await tl.chapter('C8');
  const backup = info.outputPath('respaldo.xlsx');
  await tl.scene('S30-exportar', async () => {
    await tl.click(page.getByRole('button', { name: 'Cuenta de Ana Ejemplo', exact: true }));
    await tl.beat(700);
    await tl.click(page.getByRole('menuitem', { name: 'Datos de la cuenta', exact: true }));
    await expect(page.getByRole('heading', { level: 1, name: 'Datos de la cuenta' })).toBeVisible();
    await tl.beat(1200);
    const downloading = page.waitForEvent('download');
    await tl.click(page.getByRole('button', { name: 'Descargar Excel', exact: true }));
    const download = await downloading;
    await download.saveAs(backup);
    await expect(page.getByText(`Descarga lista: ${download.suggestedFilename()}`)).toBeVisible();
  });
  await tl.scene('S31-otra-cuenta', async () => {
    await tl.click(page.getByRole('button', { name: 'Cuenta de Ana Ejemplo', exact: true }));
    await tl.beat(600);
    await tl.click(page.getByRole('menuitem', { name: 'Cerrar sesión', exact: true }));
    await expect(page.getByRole('button', { name: /^Cuenta de / })).toHaveCount(0);
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Ingresar a DevNotes' })).toBeVisible();
    await tl.beat(700);
    await providerLogin(page, tl, `e2e-${randomUUID()}`, 'Bruno Ejemplo');
    await expect(editor).toHaveText('');
  });
  await tl.scene('S32-importar-vista', async () => {
    await tl.click(page.getByRole('button', { name: 'Cuenta de Bruno Ejemplo', exact: true }));
    await tl.beat(500);
    await tl.click(page.getByRole('menuitem', { name: 'Datos de la cuenta', exact: true }));
    await expect(page.getByRole('heading', { level: 1, name: 'Datos de la cuenta' })).toBeVisible();
    await tl.beat(800);
    await page.getByLabel('Archivo de respaldo (.xlsx)', { exact: true }).setInputFiles(backup);
    const region = page.getByRole('region', { name: 'Contenido del archivo' });
    await expect(region).toBeVisible();
    await region.scrollIntoViewIfNeeded();
  });
  await tl.scene('S33-importar', async () => {
    await tl.click(page.getByRole('button', { name: 'Importar', exact: true }));
    const confirm = page.getByRole('dialog', { name: '¿Importar este archivo?' });
    await expect(confirm).toBeVisible();
    await tl.beat(1200);
    const imported = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/portability/imports' && r.request().method() === 'POST');
    await tl.click(confirm.getByRole('button', { name: 'Confirmar importación', exact: true }));
    expect((await imported).ok()).toBe(true);
    await expect(confirm).toBeHidden();
  });
  await tl.scene('S34-recuperado', async () => {
    await tl.click(nav.getByRole('link', { name: 'Notas', exact: true }));
    await expect(editor).toContainText(todayLine);
    await tl.beat(1100);
    await tl.click(page.getByRole('link', { name: 'Libres', exact: true }));
    await expect(page.getByRole('link', { name: new RegExp(freeTitle) })).toBeVisible();
    await tl.beat(900);
    await tl.click(nav.getByRole('link', { name: 'Voz', exact: true }));
    await expect(page.getByRole('region', { name: 'Notas guardadas' })).toContainText('job nocturno');
    await tl.beat(1200);
    await tl.click(nav.getByRole('link', { name: 'Imagen', exact: true }));
    await expect(image.getByRole('region', { name: 'Textos guardados' })).toContainText('ERR_CONNECTION_RESET');
    await tl.beat(1200);
    await tl.click(nav.getByRole('link', { name: 'Referencias', exact: true }));
    await expect(page.getByRole('heading', { name: reference.title, exact: true })).toBeVisible();
  });

  // ---------- C9 · En el teléfono ----------
  await tl.chapter('C9');
  await tl.scene('S35-movil', async () => {
    await tl.click(nav.getByRole('link', { name: 'Notas', exact: true }));
    await expect(editor).toContainText(todayLine);
    await tl.beat(500);
    await page.setViewportSize({ width: 390, height: 844 });
    const bottom = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(bottom.getByRole('link')).toHaveCount(5);
    await expect(bottom.getByRole('link').first()).toHaveAccessibleName('Notas');
  });
  await tl.scene('S36-movil-herramientas', async () => {
    await tl.click(page.getByRole('button', { name: 'Herramientas', exact: true }));
    const tools = page.getByRole('dialog', { name: 'Herramientas' });
    await expect(tools).toBeVisible();
    await tl.beat(1500);
    await page.keyboard.press('Escape');
    await tl.beat(400);
    await tl.click(nav.getByRole('link', { name: 'Voz', exact: true }));
    await expect(page.getByRole('heading', { level: 1, name: 'Notas de voz' })).toBeVisible();
  });
  await tl.scene('S37-creditos', async () => {
    if (!capture) return;
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screencast.showOverlay(`
      <div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:18px;background:radial-gradient(circle at 50% 40%,#2a2d34,#15171b);color:#e8eaed;
        font-family:system-ui,'Segoe UI',Roboto,sans-serif;text-align:center">
        <div style="font-size:64px;font-weight:700;letter-spacing:-1px">Dev<span style="color:#ffb74d">Notes</span></div>
        <div style="font-size:24px;color:#b0b4ba">Recorrido completo</div>
        <div style="margin-top:28px;font-size:20px;line-height:1.7;color:#cfd2d6">
          Voz: Sofía, generada con ElevenLabs<br>Música original sintetizada para este recorrido<br>
          Datos, cuentas y proveedores de prueba</div>
      </div>`);
  });
  await tl.stop();
});
