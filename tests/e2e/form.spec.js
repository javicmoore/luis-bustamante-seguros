import { expect, test } from '@playwright/test';
import { open } from './utils.js';

// Datos ficticios. El servidor de pruebas usa el proveedor simulado: no se envía nada real.
const FAKE = { name: 'Prueba Ficticia', age: '41', phone: '686 000 0042', email: 'prueba@ejemplo.com' };

// Opción de radio por su texto exacto ("Auto" no debe coincidir con "Auto turista").
const option = (page, text) => page.locator('label.choice__option').filter({ hasText: new RegExp(`^${text.replace(/[$()]/g, '\\$&')}$`) });
const submit = (page) => page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();

async function fillValid(page, overrides = {}) {
  const data = { ...FAKE, method: 'phone', ...overrides };
  await page.locator('#lead-name').fill(data.name);
  await page.locator('#lead-age').fill(data.age);
  if (data.method === 'email') {
    await option(page, 'Correo electrónico').click();
    await page.locator('#lead-email').fill(data.email);
  } else {
    await option(page, 'Teléfono').click();
    if (data.country) await page.locator('#lead-phoneCountry').selectOption(data.country);
    await page.locator('#lead-phone').fill(data.phone);
  }
  await option(page, 'De $30,000 a menos de $50,000').click();
  await option(page, 'Un seguro').click();
  await option(page, 'Auto').click();
  await page.locator('label.consent__label').click();
}

const captureLead = async (page) => {
  const seen = { body: null };
  await page.route('**/api/leads', async (route) => {
    seen.body = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'received', id: 'LB-DDDDDDDD', notification: 'accepted' }),
    });
  });
  return seen;
};

test.describe('formulario de asesoría', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, '/#asesoria');
  });

  test('envío vacío: resumen de errores enfocado y errores junto a cada campo', async ({ page }) => {
    await submit(page);
    const summary = page.locator('.lead-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary.locator('li')).toHaveText([
      'Nombre: Escribe tu nombre.',
      'Edad: Escribe tu edad.',
      'Medio de contacto: Elige cómo prefieres que Luis te contacte.',
      'Ingresos mensuales: Elige el rango de tus ingresos mensuales.',
      'Qué te interesa: Elige qué te interesa.',
      'Autorización de contacto: Para que Luis pueda contactarte, marca la autorización.',
    ]);
    await expect(page.locator('#lead-name')).toHaveAttribute('aria-invalid', 'true');
    // El enlace del resumen lleva el foco al campo.
    await summary.getByRole('link', { name: /Medio de contacto/ }).click();
    await expect(page.locator('#lead-contactMethod')).toBeFocused();
  });

  test('medio de contacto: solo el campo elegido, se limpia al cambiar y la autorización se adapta', async ({ page }) => {
    const consent = page.locator('.consent__label');
    await expect(page.locator('#lead-email, #lead-phone, #lead-phoneCountry')).toHaveCount(0);
    await expect(page.locator('input[name="contactMethod"]:checked')).toHaveCount(0);
    await expect(consent).toContainText('por el medio que elija arriba');

    await option(page, 'Correo electrónico').click();
    const email = page.locator('#lead-email');
    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute('type', 'email');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('#lead-phone')).toHaveCount(0);
    await expect(consent).toContainText('me contacte por correo electrónico');
    await email.fill('correo-invalido');
    await email.blur();
    await expect(page.locator('#lead-email-error')).toHaveText('Escribe un correo válido, por ejemplo nombre@correo.com.');
    await email.fill(FAKE.email);
    await expect(page.locator('#lead-email-error')).toHaveCount(0);

    await option(page, 'Teléfono').click();
    await expect(page.locator('#lead-email')).toHaveCount(0);
    await expect(page.locator('#lead-phoneCountry')).toHaveValue('MX');
    await expect(page.locator('#lead-phone')).toHaveValue('');
    await expect(consent).toContainText('me contacte por llamada o WhatsApp');
    await page.locator('#lead-phone').fill(FAKE.phone);

    // Al volver a correo, el teléfono se limpió y el correo anterior también.
    await option(page, 'Correo electrónico').click();
    await expect(page.locator('#lead-email')).toHaveValue('');
    await option(page, 'Teléfono').click();
    await expect(page.locator('#lead-phone')).toHaveValue('');
  });

  test('teléfono: México por defecto, otro país y números pegados con prefijo', async ({ page }) => {
    await option(page, 'Teléfono').click();
    const country = page.locator('#lead-phoneCountry');
    const phone = page.locator('#lead-phone');
    await expect(country.locator('option:checked')).toHaveText('+52 México');
    await expect(page.locator('#lead-phone-help')).toHaveText('10 dígitos, sin el +52.');

    // México: 10 dígitos.
    await phone.fill('686 000 004');
    await phone.blur();
    await expect(page.locator('#lead-phone-error')).toHaveText('Escribe un número válido de 10 dígitos.');

    // Pegar un número internacional reconoce el prefijo, sin repetirlo.
    await phone.fill('+52 686 000 0042');
    await expect(country).toHaveValue('MX');
    await expect(phone).toHaveValue('6860000042');
    await phone.fill('+34 612 345 678');
    await expect(country).toHaveValue('ES');
    await expect(phone).toHaveValue('612345678');
    await expect(page.locator('#lead-phone-error')).toHaveCount(0);

    // Otro país elegido a mano: reglas de ese país, no la mexicana.
    await country.selectOption('US');
    await phone.fill('686 000 0042');
    await phone.blur();
    await expect(page.locator('#lead-phone-error')).toHaveText('Escribe un número válido para el país elegido.');
    await phone.fill('(213) 373-4253');
    await expect(page.locator('#lead-phone-error')).toHaveCount(0);
  });

  test('ingresos e interés: ambas ramas, obligatorios y limpieza al cambiar de rama', async ({ page }) => {
    const detail = page.locator('.interest').filter({ has: page.locator('input[name="interest"]') });
    const checked = () => page.locator('input[name="interest"]:checked');
    await expect(page.locator('legend', { hasText: '¿En qué rango se encuentran tus ingresos mensuales?' })).toBeVisible();
    await expect(page.locator('input[name="income"] + .choice__mark + .choice__text')).toHaveText([
      'De $20,000 a menos de $30,000',
      'De $30,000 a menos de $50,000',
      '$50,000 o más',
    ]);
    await expect(page.locator('input[name="interest"]')).toHaveCount(0);

    await option(page, 'Un seguro').click();
    await expect(page.locator('legend', { hasText: '¿Qué seguro te interesa?' })).toBeVisible();
    // La pregunta se despliega en 0.38 s; se elige después, como haría una persona.
    await page.waitForTimeout(450);
    await expect(detail.locator('label.choice__option')).toHaveText(['Gastos médicos mayores (GMM)', 'Auto', 'Auto turista', 'Hogar', 'Otro']);
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.interest')))).toBe(false);
    await option(page, 'Hogar').click();
    await expect(checked()).toHaveValue('hogar');

    await option(page, 'Ahorro o retiro').click();
    await expect(page.locator('legend', { hasText: '¿Sobre qué te gustaría recibir asesoría?' })).toBeVisible();
    await page.waitForTimeout(450);
    await expect(detail.locator('label.choice__option')).toHaveText(['PPR / retiro', 'Ahorro e inversión', 'Educación', 'Necesito orientación']);
    await expect(checked()).toHaveCount(0);

    await submit(page);
    await expect(page.locator('#lead-interest-error')).toHaveText('Elige sobre qué te gustaría recibir asesoría.');
    await option(page, 'Necesito orientación').click();
    await expect(page.locator('#lead-interest-error')).toHaveCount(0);
  });

  test('envía solo los campos del medio elegido (correo)', async ({ page }) => {
    const seen = await captureLead(page);
    await fillValid(page, { method: 'email' });
    await submit(page);
    await expect(page.locator('.lead-result')).toBeVisible();
    expect(seen.body).toMatchObject({ contactMethod: 'email', email: FAKE.email, income: '30_50', interestType: 'seguro', interest: 'auto', consent: true });
    expect(Object.keys(seen.body).sort()).toEqual(['age', 'consent', 'contactMethod', 'email', 'income', 'interest', 'interestType', 'name', 'website']);
  });

  test('envía solo los campos del medio elegido (teléfono extranjero)', async ({ page }) => {
    const seen = await captureLead(page);
    await fillValid(page, { country: 'ES', phone: '612 345 678' });
    await submit(page);
    await expect(page.locator('.lead-result')).toBeVisible();
    expect(seen.body).toMatchObject({ contactMethod: 'phone', phoneCountry: 'ES', phone: '612 345 678' });
    expect(Object.keys(seen.body).sort()).toEqual(['age', 'consent', 'contactMethod', 'income', 'interest', 'interestType', 'name', 'phone', 'phoneCountry', 'website']);
  });

  test('la autorización empieza sin marcar y sin ella no se envía', async ({ page }) => {
    await expect(page.locator('#lead-consent')).not.toBeChecked();
    await fillValid(page);
    await page.locator('label.consent__label').click();
    let posted = 0;
    page.on('request', (r) => r.url().includes('/api/leads') && (posted += 1));
    await submit(page);
    await expect(page.locator('#lead-consent-error')).toBeVisible();
    expect(posted).toBe(0);
  });

  for (const method of ['phone', 'email']) {
    test(`envío válido por ${method === 'email' ? 'correo' : 'teléfono'}: recibido con folio (proveedor simulado)`, async ({ page }) => {
      // Cada corrida simula un visitante distinto (IP y dato de contacto) para no chocar con los
      // límites de uso del servidor de pruebas, que siguen activos.
      const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
      await page.route('**/api/leads', (route) => route.continue({ headers: { ...route.request().headers(), 'x-real-ip': ip } }));
      const n = String(Math.floor(Math.random() * 9000) + 1000);
      const conversions = [];
      await page.exposeFunction('__conv', (d) => conversions.push(d));
      await page.evaluate(() => window.addEventListener('lb:analytics', (e) => window.__conv(e.detail)));
      await fillValid(page, { method, phone: `686 ${n.slice(0, 3)} ${n}`, email: `prueba${n}@ejemplo.com` });
      await submit(page);
      const result = page.locator('.lead-result');
      await expect(result).toBeVisible();
      await expect(result).toBeFocused();
      await expect(result.getByRole('heading')).toHaveText('Tu solicitud fue recibida.');
      await expect(result).toContainText(method === 'email' ? 'Luis podrá responderte al correo que compartiste.' : 'Luis podrá contactarte al teléfono que compartiste.');
      await expect(result.locator('.lead-result__folio strong')).toHaveText(/^LB-[0-9A-Z]{8}$/);
      await expect(result.locator('.lead-result__demo')).toContainText('Modo demostración');
      expect(conversions.map((c) => c.event)).toEqual(['lead_form_attempt', 'lead_submitted']);
      // Ningún evento lleva datos personales.
      expect(JSON.stringify(conversions)).not.toMatch(/Prueba|686|41|198.51|ejemplo|30_50|30,000|auto/i);
    });
  }

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
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).dblclick();
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
    await submit(page);
    const alert = page.locator('.lead-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveAttribute('role', 'alert');
    await expect(alert).toContainText('no pudo enviarse a Luis');
    await expect(alert.locator('a[href="tel:+526863872193"]')).toBeVisible();
    await expect(alert.locator('a[href="mailto:luis.bpaz@outlook.com"]')).toBeVisible();
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
    await submit(page);
    await expect(page.locator('.lead-alert')).toContainText('no está disponible');
    await page.locator('#lead-age').fill('42');
    await submit(page);
    await expect(page.locator('.lead-alert')).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  test('error de red, límite de uso y resultado incierto', async ({ page }) => {
    await page.route('**/api/leads', (route) => route.abort('failed'));
    await fillValid(page);
    await submit(page);
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
  });

  test('respuesta sin confirmación del servidor nunca se muestra como éxito', async ({ page }) => {
    await page.route('**/api/leads', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>proxy</html>' }));
    await fillValid(page);
    await submit(page);
    await expect(page.locator('.lead-alert')).toBeVisible();
    await expect(page.locator('.lead-result')).toHaveCount(0);
  });

  test('el aviso de privacidad se abre sin perder lo escrito y describe los datos actuales', async ({ page }) => {
    await page.locator('#lead-name').fill(FAKE.name);
    await option(page, 'Teléfono').click();
    await page.locator('#lead-phone').fill(FAKE.phone);
    await page.getByRole('button', { name: 'Leer el aviso de privacidad' }).click();
    const dialog = page.getByRole('dialog', { name: 'Aviso de privacidad' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('correo electrónico o teléfono');
    await expect(dialog).toContainText('rango de tus ingresos mensuales');
    await expect(dialog).not.toContainText('No se solicitan correo electrónico');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Leer el aviso de privacidad' })).toBeFocused();
    await expect(page.locator('#lead-name')).toHaveValue(FAKE.name);
    await expect(page.locator('#lead-phone')).toHaveValue(FAKE.phone);
  });

  test('campos con etiquetas, autocomplete e inputmode adecuados', async ({ page }) => {
    await expect(page.locator('#lead-name')).toHaveAttribute('autocomplete', 'name');
    await expect(page.locator('#lead-age')).toHaveAttribute('inputmode', 'numeric');
    await option(page, 'Teléfono').click();
    await expect(page.getByLabel('País y prefijo')).toHaveAttribute('autocomplete', 'tel-country-code');
    const phone = page.getByLabel('Número de teléfono');
    await expect(phone).toHaveAttribute('type', 'tel');
    await expect(phone).toHaveAttribute('inputmode', 'tel');
    await expect(phone).toHaveAttribute('autocomplete', 'tel-national');
    await option(page, 'Correo electrónico').click();
    await expect(page.locator('#lead-email')).toHaveAttribute('inputmode', 'email');
    await expect(page.locator('label[for="lead-email"]')).toHaveText('Correo electrónico');
    const size = await page.locator('.lead-form__submit').boundingBox();
    expect(size.height).toBeGreaterThanOrEqual(48);
  });

  test('el selector de país funciona con teclado', async ({ page }) => {
    await option(page, 'Teléfono').click();
    const country = page.locator('#lead-phoneCountry');
    await country.focus();
    await page.keyboard.press('ArrowDown');
    await expect(country).toHaveValue('US');
    await page.keyboard.press('Tab');
    await expect(page.locator('#lead-phone')).toBeFocused();
  });
});

test.describe('formulario en móvil', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

  test('el header se retira al escribir y la barra de contacto no tapa campos', async ({ page }) => {
    await open(page, '/');
    await page.locator('#asesoria').scrollIntoViewIfNeeded();
    await option(page, 'Teléfono').click();
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
