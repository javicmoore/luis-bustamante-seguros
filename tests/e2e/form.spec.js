import { expect, test } from '@playwright/test';
import { open } from './utils.js';

// Datos ficticios. El servidor de pruebas usa el proveedor simulado: no se envía nada real.
const FAKE = { name: 'Prueba Ficticia', age: '41', phone: '686 000 0042' };

async function fillValid(page, overrides = {}) {
  const data = { ...FAKE, ...overrides };
  await page.locator('#lead-name').fill(data.name);
  await page.locator('#lead-age').fill(data.age);
  await page.locator('#lead-phone').fill(data.phone);
  await page.locator('label.choice__option', { hasText: 'Busco un seguro / No aplica' }).click();
  await page.locator('label.consent__label').click();
}

test.describe('formulario de asesoría', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, '/#asesoria');
  });

  test('envío vacío: resumen de errores enfocado y errores junto a cada campo', async ({ page }) => {
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    const summary = page.locator('.lead-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary.locator('li')).toHaveCount(5);
    await expect(page.locator('#lead-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#lead-name-error')).toHaveText('Escribe tu nombre.');
    await expect(page.locator('#lead-consent-error')).toContainText('marca la autorización');
    // El enlace del resumen lleva el foco al campo.
    await summary.getByRole('link', { name: /Teléfono de contacto/ }).click();
    await expect(page.locator('#lead-phone')).toBeFocused();
  });

  test('la autorización empieza sin marcar y sin ella no se envía', async ({ page }) => {
    await expect(page.locator('#lead-consent')).not.toBeChecked();
    await page.locator('#lead-name').fill(FAKE.name);
    await page.locator('#lead-age').fill(FAKE.age);
    await page.locator('#lead-phone').fill(FAKE.phone);
    await page.locator('label.choice__option', { hasText: 'No' }).first().click();
    let posted = 0;
    page.on('request', (r) => r.url().includes('/api/leads') && (posted += 1));
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    await expect(page.locator('#lead-consent-error')).toBeVisible();
    expect(posted).toBe(0);
  });

  test('envío válido: recibido con folio y aviso de demostración (proveedor simulado)', async ({ page }) => {
    // Cada corrida simula un visitante distinto (IP y teléfono) para no chocar con los
    // límites de uso del servidor de pruebas, que siguen activos.
    const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
    await page.route('**/api/leads', (route) =>
      route.continue({ headers: { ...route.request().headers(), 'x-real-ip': ip } }),
    );
    const phone = `686 ${String(Math.floor(Math.random() * 900) + 100)} ${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const conversions = [];
    await page.exposeFunction('__conv', (d) => conversions.push(d));
    await page.evaluate(() => window.addEventListener('lb:analytics', (e) => window.__conv(e.detail)));
    await fillValid(page, { phone });
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    const result = page.locator('.lead-result');
    await expect(result).toBeVisible();
    await expect(result).toBeFocused();
    await expect(result.getByRole('heading')).toHaveText('Tu solicitud fue recibida.');
    await expect(result).toContainText('Luis podrá contactarte al teléfono que compartiste.');
    await expect(result.locator('.lead-result__folio strong')).toHaveText(/^LB-[0-9A-Z]{8}$/);
    await expect(result.locator('.lead-result__demo')).toContainText('Modo demostración');
    expect(conversions.map((c) => c.event)).toEqual(['lead_form_attempt', 'lead_submitted']);
    // Ningún evento lleva datos personales.
    expect(JSON.stringify(conversions)).not.toMatch(/Prueba|686|41|198.51/);
  });

  test('doble clic: una sola solicitud', async ({ page }) => {
    let posted = 0;
    await page.route('**/api/leads', async (route) => {
      posted += 1;
      await new Promise((r) => setTimeout(r, 700));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'received', id: 'LB-AAAAAAAA', notification: 'accepted' }),
      });
    });
    await fillValid(page);
    const submit = page.getByRole('button', { name: 'Solicitar mi asesoría' });
    await submit.dblclick();
    await page.locator('.lead-form__submit').click({ force: true }).catch(() => {});
    await expect(page.locator('.lead-result')).toBeVisible();
    expect(posted).toBe(1);
  });

  test('fallo del proveedor: conserva los datos, ofrece reintento y contacto, sin falso éxito', async ({ page }) => {
    const keys = [];
    let calls = 0;
    await page.route('**/api/leads', async (route) => {
      calls += 1;
      keys.push(route.request().headers()['idempotency-key']);
      if (calls === 1) {
        await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'notification_failed', id: 'LB-BBBBBBBB' }) });
      } else {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'received', id: 'LB-BBBBBBBB', notification: 'accepted' }) });
      }
    });
    await fillValid(page);
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    const alert = page.locator('.lead-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveAttribute('role', 'alert');
    await expect(alert).toContainText('no pudo enviarse a Luis');
    await expect(alert.locator('a[href="tel:+526863303727"]')).toBeVisible();
    await expect(page.locator('#lead-name')).toHaveValue(FAKE.name);
    await expect(page.locator('#lead-consent')).toBeChecked();
    await expect(page.locator('.lead-result')).toHaveCount(0);

    await page.getByRole('button', { name: 'Reintentar envío' }).click();
    await expect(page.locator('.lead-result')).toBeVisible();
    // El reintento usa la misma llave de idempotencia (no duplica la solicitud).
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  test('cambiar los datos tras un fallo genera una llave nueva', async ({ page }) => {
    const keys = [];
    await page.route('**/api/leads', async (route) => {
      keys.push(route.request().headers()['idempotency-key']);
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'unavailable' }) });
    });
    await fillValid(page);
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    await expect(page.locator('.lead-alert')).toContainText('no está disponible');
    await page.locator('#lead-age').fill('42');
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    await expect(page.locator('.lead-alert')).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  test('error de red, límite de uso y resultado incierto', async ({ page }) => {
    await page.route('**/api/leads', (route) => route.abort('failed'));
    await fillValid(page);
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    await expect(page.locator('.lead-alert')).toContainText('No pudimos conectar con el servidor.');

    await page.unroute('**/api/leads');
    await page.route('**/api/leads', (route) =>
      route.fulfill({ status: 429, headers: { 'retry-after': '120' }, contentType: 'application/json', body: '{"ok":false,"error":"rate_limited"}' }),
    );
    await page.getByRole('button', { name: 'Reintentar envío' }).click();
    await expect(page.locator('.lead-alert')).toContainText('varias solicitudes');

    await page.unroute('**/api/leads');
    await page.route('**/api/leads', (route) =>
      route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'received', id: 'LB-CCCCCCCC', notification: 'pending' }) }),
    );
    await page.getByRole('button', { name: 'Reintentar envío' }).click();
    await expect(page.locator('.lead-result')).toContainText('Tu solicitud quedó registrada.');
    await expect(page.locator('.lead-result')).toContainText('Todavía no pudimos confirmar el aviso a Luis');
  });

  test('respuesta sin confirmación del servidor nunca se muestra como éxito', async ({ page }) => {
    await page.route('**/api/leads', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>proxy</html>' }));
    await fillValid(page);
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    await expect(page.locator('.lead-alert')).toBeVisible();
    await expect(page.locator('.lead-result')).toHaveCount(0);
  });

  test('el aviso de privacidad se abre sin perder lo escrito', async ({ page }) => {
    await page.locator('#lead-name').fill(FAKE.name);
    await page.locator('#lead-phone').fill(FAKE.phone);
    await page.getByRole('button', { name: 'Leer el aviso de privacidad' }).click();
    const dialog = page.getByRole('dialog', { name: 'Aviso de privacidad' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Borrador pendiente de revisión.');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Leer el aviso de privacidad' })).toBeFocused();
    await expect(page.locator('#lead-name')).toHaveValue(FAKE.name);
    await expect(page.locator('#lead-phone')).toHaveValue(FAKE.phone);
  });

  test('campos con autocomplete e inputmode adecuados', async ({ page }) => {
    await expect(page.locator('#lead-name')).toHaveAttribute('autocomplete', 'name');
    await expect(page.locator('#lead-phone')).toHaveAttribute('type', 'tel');
    await expect(page.locator('#lead-phone')).toHaveAttribute('inputmode', 'tel');
    await expect(page.locator('#lead-phone')).toHaveAttribute('autocomplete', 'tel');
    await expect(page.locator('#lead-age')).toHaveAttribute('inputmode', 'numeric');
    const size = await page.locator('.lead-form__submit').boundingBox();
    expect(size.height).toBeGreaterThanOrEqual(48);
  });
});

test.describe('formulario en móvil', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

  test('el header se retira al escribir y la barra de contacto no tapa campos', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.waitForTimeout(500);
    await page.locator('#lead-phone').scrollIntoViewIfNeeded();
    await page.locator('#lead-phone').focus();
    await page.waitForTimeout(500);
    await expect(page.locator('.site-header')).toHaveClass(/is-tucked/);
    await expect(page.locator('#mobile-cta')).not.toHaveClass(/is-visible/);
    const field = await page.locator('#lead-phone').boundingBox();
    expect(field.y).toBeGreaterThanOrEqual(0);
    expect(field.y + field.height).toBeLessThanOrEqual(667);
  });

  test('la barra de contacto aparece tras el hero y se oculta en el formulario', async ({ page }) => {
    await open(page, '/');
    const bar = page.locator('#mobile-cta');
    await expect(bar).not.toHaveClass(/is-visible/);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(bar).toHaveClass(/is-visible/);
    await page.locator('#asesoria .lead-form').scrollIntoViewIfNeeded();
    await expect(bar).not.toHaveClass(/is-visible/);
  });
});
