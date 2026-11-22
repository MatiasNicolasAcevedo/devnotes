import { test, expect, login } from './fixtures';

test('free-notes: lifecycle with draft guard, space and diary date', async ({ page, identity, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 320 : 768, height: 700 });
  await login(page, identity);
  await page.goto('/notes/2025-06-17?space=work');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Notas' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Todavía no hay notas libres')).toBeVisible();
  const fresh = page.getByRole('link', { name: 'Nueva nota' });
  await fresh.click();

  const title = page.getByRole('textbox', { name: 'Título' });
  const body = page.getByRole('textbox', { name: 'Contenido' });
  await expect(title).toBeFocused();
  await title.fill('T-080 borrador');
  await body.pressSequentially('Primer parrafo');
  await body.press('Enter');
  await body.pressSequentially('Segundo parrafo');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  const guard = page.getByRole('dialog', { name: /Guardar los cambios/ });
  await guard.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(title).toHaveValue('T-080 borrador');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  await guard.getByRole('button', { name: 'Guardar', exact: true }).click();

  await page.getByRole('link', { name: /T-080 borrador/ }).click();
  await title.fill('T-080 renombrada');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Guardada', { exact: true })).toBeVisible();
  const savedUrl = page.url();
  await page.reload();
  await expect(title).toHaveValue('T-080 renombrada');
  await expect(body.locator('p')).toHaveText(['Primer parrafo', 'Segundo parrafo']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(isMobile ? 320 : 768);

  await title.fill('Cambio que se descarta');
  await page.getByRole('button', { name: 'Espacio: Trabajo' }).click();
  await page.getByRole('menuitemradio', { name: 'Personal' }).click();
  await guard.getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByText('Todavía no hay notas libres')).toBeVisible();
  const personalUrl = new URL(savedUrl);
  personalUrl.searchParams.set('space', 'personal');
  await page.goto(personalUrl.href);
  await expect(page.getByText('La nota libre no está disponible.')).toBeVisible();
  await page.goto(savedUrl);
  await expect(title).toHaveValue('T-080 renombrada');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();

  await page.getByRole('button', { name: 'Borrar T-080 renombrada' }).click();
  const deletion = page.getByRole('dialog', { name: '¿Borrar la nota libre?' });
  await deletion.getByRole('button', { name: 'Borrar', exact: true }).click();
  await expect(fresh).toBeFocused();
  await expect(page.getByText('Todavía no hay notas libres')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Todavía no hay notas libres')).toBeVisible();
});

test('free-notes: lifecycle returns to the original diary date', async ({ page, identity }) => {
  await login(page, identity);
  await page.goto('/notes/2025-06-17?space=work');
  await page.getByRole('link', { name: 'Libres', exact: true }).click();
  await page.reload();
  await page.getByRole('link', { name: 'Diario' }).click();
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2025-06-17');
});
