import type { Page } from '@playwright/test';
import { test, expect, login, layout } from './fixtures';

// T-097: página Demo pública. YouTube es un tercero: su host se atiende con page.route y un HTML mínimo, sin internet.
// La API propia nunca se mockea.
const EMBED_HOST = 'https://www.youtube-nocookie.com/**';
const THIRD_PARTY = /youtube|ytimg|googlevideo|doubleclick/;

function thirdPartyRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', request => {
    if (THIRD_PARTY.test(new URL(request.url()).hostname)) urls.push(request.url());
  });
  return urls;
}

test('demo page: visitor opens Demo from the bar and plays each video only after a click', async ({ page }) => {
  const requests = thirdPartyRequests(page);
  await page.route(EMBED_HOST, route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>stub</title><p>Reproductor de prueba</p>',
  }));
  await page.goto('/');
  await expect(page.getByText('Inicia sesión para acceder a tus notas.')).toBeVisible();
  const demo = page.getByRole('banner').getByRole('link', { name: 'Demo', exact: true });
  await expect(demo).toHaveAttribute('href', '/demo');
  await demo.click();
  await expect(page).toHaveURL('http://localhost/demo');
  await expect(demo).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1, name: 'Demo' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true })).toBeVisible();
  const videos = page.getByRole('list', { name: 'Videos' }).getByRole('button');
  await expect(videos).toHaveCount(2);
  await expect(videos.nth(0)).toHaveAccessibleName(/^Tráiler/);
  await expect(videos.nth(1)).toHaveAccessibleName(/^Demo completa/);
  await expect(videos.nth(0)).toHaveAttribute('aria-current', 'true');
  // Las portadas son locales y ya cargaron: la página está asentada y todavía no pidió nada a YouTube.
  for (const img of await page.getByRole('main').locator('img').all()) {
    await expect.poll(() => img.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    expect(new URL(await img.evaluate((element: HTMLImageElement) => element.currentSrc)).host).toBe('localhost');
  }
  await expect(page.locator('iframe')).toHaveCount(0);
  await layout(page);
  expect(requests, 'No third-party video requests before the first click').toEqual([]);

  const trailerEmbed = page.waitForRequest(request => request.url().startsWith('https://www.youtube-nocookie.com/embed/-xhokMtK-Hw?'));
  await page.getByRole('button', { name: 'Reproducir Tráiler', exact: true }).click();
  expect(new URL((await trailerEmbed).url()).search).toBe('?autoplay=1&rel=0');
  const trailer = page.locator('iframe[title="Tráiler de DevNotes"]');
  await expect(trailer).toBeVisible();
  await expect(page.frameLocator('iframe[title="Tráiler de DevNotes"]').getByText('Reproductor de prueba')).toBeVisible();

  const demoEmbed = page.waitForRequest(request => request.url().startsWith('https://www.youtube-nocookie.com/embed/XAIHdmHAhA0?'));
  await videos.nth(1).click();
  await demoEmbed;
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(page.locator('iframe[title="Demo completa de DevNotes"]')).toBeVisible();
  await expect(videos.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('link', { name: 'Ver en YouTube', exact: true })).toHaveAttribute('href', 'https://youtu.be/XAIHdmHAhA0');
  expect(requests.every(url => new URL(url).hostname === 'www.youtube-nocookie.com'), 'Only the cookieless embed host is contacted').toBe(true);
});

test('demo page: layout keeps the red Demo link and the player usable at every width', async ({ page, identity }) => {
  await page.route(EMBED_HOST, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
  await login(page, identity);
  const banner = page.getByRole('banner');
  const demo = banner.getByRole('link', { name: 'Demo', exact: true });
  await demo.click();
  await expect(page).toHaveURL('http://localhost/demo?space=work');
  await expect(page.getByRole('heading', { level: 1, name: 'Demo' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const player = page.locator('[data-demo-player]');
  const list = page.getByRole('list', { name: 'Videos' });

  for (const width of [320, 360, 375, 390, 767, 768, 1280]) {
    await test.step(`${width} px`, async () => {
      await page.setViewportSize({ width, height: 800 });
      await expect(demo).toBeVisible();
      for (const target of ['document', 'main', 'banner']) {
        const fits = target === 'document'
          ? await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
          : await page.getByRole(target as 'main' | 'banner').evaluate(element => element.scrollWidth <= element.clientWidth);
        expect(fits, `No horizontal overflow in ${target} at ${width} px`).toBe(true);
      }
      await layout(page);
      await expect(demo).toHaveCSS('color', 'rgb(255, 107, 107)');
      await expect(demo).toHaveAttribute('aria-current', 'page');
      await expect(demo.locator('svg')).toBeVisible();
      await expect(demo.locator('[data-demo-label]')).toBeVisible({ visible: width >= 360 });
      const box = (await demo.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      // Ningún otro control de la barra se superpone con el enlace Demo.
      const others = banner.locator('a:visible, button:visible, [role="status"]:visible');
      for (const other of await others.all()) {
        if (await other.evaluate((element, link) => element === link || element.contains(link) || link!.contains(element), await demo.elementHandle())) continue;
        const o = (await other.boundingBox())!;
        const overlaps = o.x < box.x + box.width && box.x < o.x + o.width && o.y < box.y + box.height && box.y < o.y + o.height;
        expect(overlaps, `Demo does not overlap ${await other.getAttribute('aria-label') ?? await other.innerText()}`).toBe(false);
      }
      await expect(nav.getByRole('link')).toHaveCount(5);
      expect(await nav.getByRole('link', { name: 'Demo', exact: true }).count()).toBe(0);
      const p = (await player.boundingBox())!;
      const l = (await list.boundingBox())!;
      if (width >= 900) {
        expect(l.x, 'Video list to the right of the player').toBeGreaterThanOrEqual(p.x + p.width);
      } else {
        expect(l.y, 'Video list below the player').toBeGreaterThanOrEqual(p.y + p.height);
      }
    });
  }
});
