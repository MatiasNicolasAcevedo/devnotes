import { test, expect, control, readiness, layout, serverStatus, login, accountButton, returnToForeground } from './fixtures';

test.describe.configure({ timeout: 90_000 });

test('T-050: visitor navigation fits on one row while readiness is pending', async ({ page }) => {
  const readinessPath = '**/actuator/health/readiness';
  const { promise, resolve } = Promise.withResolvers<void>();
  // Demorar el request real hasta terminar las mediciones, sin reemplazar la respuesta del servidor.
  await page.route(readinessPath, async route => {
    await promise;
    await route.continue();
  });
  try {
    await page.goto('/');
    const banner = page.getByRole('banner');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    const connecting = serverStatus(page, 'Conectando con el servidor');
    const login = banner.getByRole('link', { name: 'Ingresar', exact: true });
    const brand = banner.getByRole('link', { name: 'DevNotes', exact: true });
    // T-097: Demo va fuera de «Navegación principal»: tras las pestañas en escritorio, antes del estado en móvil.
    const demo = banner.getByRole('link', { name: 'Demo', exact: true });
    const tabs = ['Voz', 'Notas', 'Referencias', 'Imagen', 'Historial'];

    for (const width of [360, 375, 390, 767, 768, 1280]) {
      await test.step(`${width} px`, async () => {
        await page.setViewportSize({ width, height: 800 });
        const narrow = width < 768;
        await expect(brand).toHaveCount(0);
        await expect(connecting).toHaveText(narrow ? '' : 'Conectando');
        const links = tabs.map(name => nav.getByRole('link', { name, exact: true }));
        const controls = [...(narrow ? [] : links), demo, connecting, login];
        const order = narrow ? ['Notas', 'Voz', 'Referencias', 'Imagen', 'Historial'] : tabs;
        await expect(nav.getByRole('link')).toHaveText(order);
        if (narrow) {
          const main = (await page.getByRole('main').boundingBox())!;
          const bottom = (await nav.boundingBox())!;
          expect(bottom.y).toBeGreaterThanOrEqual(main.y + main.height - 1);
          expect(bottom.y + bottom.height).toBeLessThanOrEqual(800);
          for (const link of links) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(48);
        }
        await layout(page);
        await expect(banner).toBeVisible();
        const bar = (await banner.boundingBox())!;
        // T-081: la ruta índice abre Notas, cuya barra compacta mide 48 px (56 px en las demás pantallas).
        expect(bar.height).toBe(48);
        let previousRight = -1;
        for (const control of controls) {
          await expect(control).toBeVisible();
          const { x, y, width: controlWidth, height } = (await control.boundingBox())!;
          expect(x, 'Horizontal separation from previous control').toBeGreaterThan(previousRight);
          previousRight = x + controlWidth;
          expect(previousRight).toBeLessThanOrEqual(width);
          expect(y).toBeGreaterThanOrEqual(bar.y);
          expect(y + height).toBeLessThanOrEqual(bar.y + bar.height);
          expect(Math.abs(y + height / 2 - (bar.y + bar.height / 2))).toBeLessThan(1);
        }
      });
    }
  } finally {
    resolve();
  }
  await expect(serverStatus(page, 'Servidor conectado')).toBeVisible();
});

test('T-064: selector y navegación responden con la sesión real', async ({ page, identity }) => {
  await login(page, identity);
  const banner = page.getByRole('banner');
  const selector = banner.getByRole('button', { name: 'Espacio: Trabajo' });
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const main = page.getByRole('main');
  const work = '#86efac';
  const personal = '#c4b5fd';

  for (const width of [360, 375, 390, 767, 768, 1280]) {
    await test.step(`${width} CSS px`, async () => {
      await page.setViewportSize({ width, height: 800 });
      await expect(selector).toBeVisible();
      expect((await selector.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(selector).toHaveCSS('color', 'rgb(134, 239, 172)');
      expect(await banner.getByRole('navigation').count()).toBe(width >= 768 ? 1 : 0);
      if (width < 768) {
        const mainBox = (await main.boundingBox())!;
        const navBox = (await nav.boundingBox())!;
        expect(mainBox.y + mainBox.height).toBeLessThanOrEqual(navBox.y + 1);
      }
      await layout(page);
    });
  }

  // Simula el viewport efectivo de una ventana de 1280 × 800 al 200 %.
  await page.setViewportSize({ width: 640, height: 400 });
  await expect(banner.getByRole('navigation')).toHaveCount(0);
  await layout(page);
  const account = accountButton(page);
  await account.click();
  await expect(page.getByRole('menuitem', { name: 'Datos de la cuenta' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(account).toBeFocused();
  // T-097: en angosto el enlace Demo va entre el selector y el estado del servidor, así que es la parada anterior.
  await page.keyboard.press('Shift+Tab');
  await expect(banner.getByRole('link', { name: 'Demo', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(selector).toBeFocused();
  await expect(selector).toHaveCSS('outline-width', '2px');
  await selector.press('Enter');
  const menu = page.getByRole('menu', { name: 'Cambiar de espacio' });
  const selected = menu.getByRole('menuitemradio', { name: 'Trabajo', checked: true });
  await expect(selected).toBeFocused();
  expect((await selected.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await page.keyboard.press('Escape');
  await expect(selector).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const changed = banner.getByRole('button', { name: 'Espacio: Personal' });
  await expect(changed).toBeFocused();
  await expect(changed).toHaveCSS('color', 'rgb(196, 181, 253)');
  await expect(page).toHaveURL(/\/notes\/\d{4}-\d{2}-\d{2}\?space=personal$/);

  // Los acentos sobre la superficie especificada superan 4,5:1 también con el fondo tenue en hover.
  const luminance = (color: string) => {
    const channels = color.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255);
    const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  expect((luminance(work) + 0.05) / (luminance('#314437') + 0.05)).toBeGreaterThan(4.5);
  expect((luminance(personal) + 0.05) / (luminance('#3b3a47') + 0.05)).toBeGreaterThan(4.5);
});

// T-050: sin pantalla de inicio, el estado real del servidor se muestra en el indicador de la barra superior.
test('compiled shell displays the real server status and recovers accessibly through Reintentar after an outage', async ({ page }, testInfo) => {
  const desktop = testInfo.project.name === 'desktop';
  const ready = page.waitForResponse(response => new URL(response.url()).pathname === '/actuator/health/readiness' && response.status() === 200);
  await page.goto('/');
  expect(await (await ready).json()).toEqual({ status: 'UP' });
  const info = await page.request.get('/api/v1/system/info');
  expect(info.status()).toBe(200);
  const data = await info.json();
  expect(Object.keys(data).sort()).toEqual(['name', 'version']);
  expect(data.name).toBe('DevNotes');
  await expect(page).toHaveTitle(data.name);
  // La ruta índice abre Notas, también para un visitante.
  await expect(page).toHaveURL('http://localhost/notes');
  await expect(page.getByText('Inicia sesión para acceder a tus notas.')).toBeVisible();
  const online = serverStatus(page, 'Servidor conectado');
  const offline = serverStatus(page, 'Servidor sin conexión');
  await expect(online).toBeVisible();
  // En ancho el indicador lleva texto; en angosto, solo el punto con su nombre accesible.
  await expect(online).toHaveText(desktop ? 'Online' : '');
  await expect(offline).toHaveCount(0);
  await layout(page);
  await control('stop');
  await page.reload();
  await expect(offline).toBeVisible({ timeout: 20_000 });
  await expect(offline).toHaveText(desktop ? 'Offline' : '');
  await expect(online).toHaveCount(0);
  const error = page.getByRole('alert').filter({ hasText: 'No se pudo verificar tu sesión' });
  await expect(error).toBeVisible({ timeout: 20_000 });
  await expect(error).toContainText('El servidor no está disponible en este momento. Intentá de nuevo en unos minutos.');
  await layout(page);
  await control('start');
  await readiness(page);
  // Multiple alerts may expose retry while the backend is down; select the session alert explicitly.
  const retry = error.getByRole('button', { name: 'Reintentar', exact: true });
  await expect(retry).toBeEnabled();
  for (let index = 0; index < 24; index++) {
    await page.keyboard.press('Tab');
    if (await retry.evaluate(element => element === document.activeElement)) break;
  }
  await expect(retry).toBeFocused();
  const recovered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/me');
  await page.keyboard.press('Enter');
  expect((await recovered).status()).toBe(401);
  await expect(error).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ingresar', exact: true })).toBeVisible();
  // El indicador vuelve a consultar readiness al regresar al primer plano, sin recargar.
  await returnToForeground(page);
  // Directed red assay changes this relevant expected UI result, never the server response.
  await expect(serverStatus(page, process.env.E2E_ASSERT_FAILURE === '1'
    ? 'INDUCED_WRONG_CONNECTED_LABEL' : 'Servidor conectado')).toBeVisible({ timeout: 20_000 });
  await expect(offline).toHaveCount(0);
  expect(await (await page.request.get('/api/v1/system/info')).json()).toEqual(data);
  await layout(page);
});
