import { test, expect, control, readiness, interactiveLogin, layout } from './fixtures';
import { writeWork, saveVersion, readVersion } from './daily-helpers';

test.describe.configure({ timeout: 120_000 });
const refPath = '/api/v1/reference-items';

/**
 * T-026 · Recorrido completo de vista previa accesible.
 *
 * Crea referencia, la inserta en nota con @, guarda nota y versión,
 * edita el título de la referencia y comprueba que trabajo e historial
 * muestran el título actualizado. Borra la referencia y comprueba
 * "Referencia no disponible" en ambas. Prueba foco, teclado y estados.
 */
test('reference preview: insert, save, edit original, delete, and preview accessibility', async ({ page, browser, identity }) => {
  await control('reference-login');
  await readiness(page);
  await interactiveLogin(page, identity);

  const today = new Date().toISOString().slice(0, 10);

  /* 1. Crear referencia */
  await page.getByRole('link', { name: 'Referencia', exact: true }).click();
  await expect(page.getByText('No tenés elementos en esta página.')).toBeVisible();
  await page.getByRole('button', { name: 'Crear elemento', exact: true }).click();
  await page.getByRole('textbox', { name: 'Título', exact: false }).fill('Referencia E2E');
  await page.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Descripción para vista previa');
  const creation = page.waitForResponse(r => new URL(r.url()).pathname === refPath && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const createResp = await creation;
  expect(createResp.status()).toBe(201);
  const ref = await createResp.json();
  expect(ref.title).toBe('Referencia E2E');

  /* 2. Insertar referencia en nota con @ */
  await page.getByRole('link', { name: 'Notas', exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
  const editor = page.getByRole('textbox', { name: 'Editor de nota diaria' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');

  // Escribir @ para abrir picker, esperar a que aparezca, luego escribir consulta con delay
  await editor.click();
  await page.keyboard.type('@');
  await expect(page.locator('[data-reference-picker]')).toBeVisible({ timeout: 5_000 });

  // Escribir la consulta con delay para respetar el debounce de 250 ms del picker
  await page.keyboard.type('Referencia', { delay: 50 });
  await expect(page.getByText('Referencia E2E')).toBeVisible({ timeout: 10_000 });
  // Click en el botón del resultado del picker
  await page.locator('[data-reference-picker] [role="button"]').first().click();

  // El átomo debe aparecer con @Título
  await expect(page.getByText('@Referencia E2E')).toBeVisible({ timeout: 5_000 });

  /* 3. Guardar nota */
  const note = await writeWork(page, today, '');

  /* 4. Guardar versión */
  await saveVersion(page, today);

  /* 5. Verificar historial muestra @Título */
  await readVersion(page, today, '@Referencia E2E');

  /* 6. Editar título de la referencia original */
  await page.getByRole('link', { name: 'Referencia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Referencia E2E' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar Referencia E2E', exact: true }).click();
  await page.getByRole('textbox', { name: 'Título', exact: false }).fill('Referencia Editada');
  const update = page.waitForResponse(r => new URL(r.url()).pathname.startsWith(refPath) && r.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const updateResp = await update;
  expect(updateResp.status()).toBe(200);
  const updatedRef = await updateResp.json();
  expect(updatedRef.title).toBe('Referencia Editada');

  /* 7. Recargar nota y verificar título actualizado */
  await page.reload();
  await expect(page.getByText('@Referencia Editada')).toBeVisible({ timeout: 10_000 });

  /* 8. Verificar historial también muestra título actualizado */
  await page.getByRole('link', { name: 'Historial', exact: true }).click();
  await page.getByRole('link', { name: new RegExp(today.split('-').reverse().join('/')) }).click();
  await expect(page.getByText('@Referencia Editada')).toBeVisible({ timeout: 10_000 });

  /* 9. Prueba de accesibilidad: átomo tiene role button y tabIndex */
  const atom = page.locator('[data-reference-id]');
  await expect(atom).toHaveAttribute('role', 'button');
  await expect(atom).toHaveAttribute('tabindex', '0');

  /* 10. Prueba de teclado: Enter abre vista previa */
  await atom.focus();
  await expect(atom).toBeFocused();
  await page.keyboard.press('Enter');

  // La vista previa debe mostrar título y descripción
  // El Popper se renderiza en un portal; buscar el título
  await expect(page.getByText('Referencia Editada')).toHaveCount(2, { timeout: 5_000 }); // átomo + preview
  await expect(page.getByText('Descripción para vista previa')).toBeVisible();

  /* 11. Escape cierra vista previa y devuelve foco */
  await page.keyboard.press('Escape');
  await expect(atom).toBeFocused();

  /* 12. Borrar referencia original */
  await page.getByRole('link', { name: 'Referencia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Referencia Editada' })).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar Referencia Editada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(page.getByText('Elemento eliminado.', { exact: true })).toBeVisible();

  /* 13. Recargar nota y verificar "Referencia no disponible" */
  await page.reload();
  await expect(page.getByText('Referencia no disponible')).toBeVisible({ timeout: 10_000 });

  /* 14. Verificar historial también muestra "Referencia no disponible" */
  await page.getByRole('link', { name: 'Historial', exact: true }).click();
  await page.getByRole('link', { name: new RegExp(today.split('-').reverse().join('/')) }).click();
  await expect(page.getByText('Referencia no disponible')).toBeVisible({ timeout: 10_000 });

  /* 15. Verificar sin desborde horizontal a 375px */
  const mobileContext = await browser.newContext({ baseURL: 'http://localhost', viewport: { width: 375, height: 812 } });
  try {
    const mPage = await mobileContext.newPage();
    await interactiveLogin(mPage, identity);
    await mPage.getByRole('link', { name: 'Notas', exact: true }).click();
    await expect(mPage.locator('.daily-editor-content[role="textbox"]')).toBeVisible();
    await layout(mPage);
  } finally {
    await mobileContext.close();
  }

  await layout(page);
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL('http://localhost/login');
});
