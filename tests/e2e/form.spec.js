import { expect, test } from '@playwright/test';
import { open } from './utils.js';

// Datos ficticios. La apertura de WhatsApp se intercepta: nunca se abre wa.me ni se envía nada real.
const FAKE = { name: 'Prueba Ficticia', age: '41', phone: '686 000 0042', email: 'prueba@ejemplo.com' };
const LUIS_CHAT = 'https://wa.me/526863872193?text=';
const GREETING = 'Hola Luis, vengo de tu página y me interesa cotizar un plan de ahorro.';

// Opción de radio por su texto exacto ("Auto" no debe coincidir con "Auto turista").
const option = (page, text) => page.locator('label.choice__option').filter({ hasText: new RegExp(`^${text.replace(/[$()]/g, '\\$&')}$`) });
const submit = (page) => page.getByRole('button', { name: 'Enviar por WhatsApp' }).click();
// URLs que la página intentó abrir con window.open (interceptado en beforeEach).
const opened = (page) => page.evaluate(() => window.__opened);
const textOf = (url) => new URL(url).searchParams.get('text');
// Espera a que el desplazamiento suave termine (scrollY sin cambios durante varios cuadros).
const settleScroll = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        let last = -1;
        let same = 0;
        const tick = () => {
          if (scrollY === last) same += 1;
          else [last, same] = [scrollY, 0];
          if (same > 8) resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      }),
  );

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
  // El campo de contacto se despliega en 0.38 s y empuja las opciones de ingresos: se elige cuando terminó,
  // como haría una persona (en WebKit un clic durante el movimiento puede no registrarse).
  await page.waitForFunction(() => {
    const box = document.querySelector('.interest.is-open');
    const inner = box?.querySelector('.interest__inner');
    return Boolean(inner) && Math.abs(box.getBoundingClientRect().height - inner.scrollHeight) < 1;
  });
  await option(page, 'De $30,000 a menos de $50,000').click();
  await expect(page.locator('input[name="income"][value="30_50"]')).toBeChecked();
  await page.locator('label.consent__label').click();
}

// Peticiones a la API del sitio: este flujo no debe hacer ninguna.
const apiRequests = new WeakMap();

async function guardPage(page) {
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (url, target, features) => {
      window.__opened.push({ url: String(url), target, features });
      return null;
    };
  });
  // Red de seguridad: aunque algo abriera wa.me, la petición no sale.
  await page.route(/wa\.me|api\.whatsapp\.com/, (route) => route.abort());
  const seen = [];
  apiRequests.set(page, seen);
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) seen.push(r.url());
  });
}

test.describe('formulario de asesoría', () => {
  test.beforeEach(async ({ page }) => {
    await guardPage(page);
    await open(page, '/#asesoria');
  });

  test.afterEach(async ({ page }) => {
    expect(apiRequests.get(page)).toEqual([]);
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
    // Los prefijos de otros países se reconocen cuando la librería (carga diferida) ya llegó.
    // Se vacía antes de cada intento: reescribir el mismo texto no dispara el cambio en el campo.
    await expect(async () => {
      await phone.fill('');
      await phone.fill('+34 612 345 678');
      await expect(country).toHaveValue('ES', { timeout: 1000 });
    }).toPass({ timeout: 15000 });
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

  test('ingresos obligatorio y sin pregunta de interés ni campos dependientes', async ({ page }) => {
    await expect(page.locator('legend', { hasText: '¿En qué rango se encuentran tus ingresos mensuales?' })).toBeVisible();
    await expect(page.locator('input[name="income"] + .choice__mark + .choice__text')).toHaveText([
      'De $20,000 a menos de $30,000',
      'De $30,000 a menos de $50,000',
      '$50,000 o más',
    ]);
    const form = page.locator('#asesoria form');
    await expect(form.locator('input[name="interestType"], input[name="interest"]')).toHaveCount(0);
    await expect(form).not.toContainText(/te interesa|Un seguro|Ahorro o retiro/);
    // Los únicos grupos de opciones son el medio de contacto y los ingresos.
    await expect(form.locator('fieldset.choice legend')).toHaveText([/Cómo prefieres/, /ingresos mensuales/]);

    await submit(page);
    await expect(page.locator('#lead-income-error')).toHaveText('Elige el rango de tus ingresos mensuales.');
    await option(page, '$50,000 o más').click();
    await expect(page.locator('#lead-income-error')).toHaveCount(0);
  });

  test('botón "Enviar por WhatsApp" con la explicación debajo', async ({ page }) => {
    const button = page.locator('.lead-form__submit');
    await expect(button).toHaveText('Enviar por WhatsApp');
    await expect(page.locator('#lead-submit-note')).toHaveText(
      'Se abrirá WhatsApp con tu mensaje listo. Podrás revisarlo antes de enviarlo.',
    );
    await expect(button).toHaveAttribute('aria-describedby', 'lead-submit-note');
    await expect(page.locator('#lead-title')).toHaveText('Formulario para el plan de ahorro');
    await expect(page.locator('#asesoria form')).not.toHaveAttribute('action', /./);
  });

  test('por teléfono: abre el chat de Luis con el mensaje y conserva los campos', async ({ page }) => {
    await fillValid(page);
    await submit(page);
    const calls = await opened(page);
    expect(calls).toHaveLength(1);
    expect(calls[0].url.startsWith(LUIS_CHAT)).toBe(true);
    expect(calls[0].target).toBe('_blank');
    expect(calls[0].features).toContain('noopener');
    expect(textOf(calls[0].url)).toBe(
      [
        GREETING,
        '',
        'Nombre: Prueba Ficticia',
        'Edad: 41 años',
        'Ingresos mensuales: De $30,000 a menos de $50,000 MXN',
        'Medio de contacto preferido: Teléfono (llamada o WhatsApp)',
        'Teléfono: +52 686 000 0042',
      ].join('\n'),
    );

    // Nota honesta: no afirma que se haya enviado; ofrece abrir de nuevo el mismo chat.
    const note = page.locator('.lead-handoff');
    await expect(note).toBeVisible();
    await expect(note).toBeFocused();
    await expect(note).toHaveAttribute('role', 'status');
    await expect(note).toContainText('Abrimos WhatsApp con tu mensaje para Luis.');
    await expect(page.locator('#asesoria')).not.toContainText(/solicitud (fue )?(enviada|recibida)|quedó registrada|folio/i);
    await expect(note.getByRole('link', { name: /Abrir WhatsApp/ })).toHaveAttribute('href', calls[0].url);

    // Los campos siguen llenos.
    await expect(page.locator('#lead-name')).toHaveValue(FAKE.name);
    await expect(page.locator('#lead-age')).toHaveValue(FAKE.age);
    await expect(page.locator('input[name="contactMethod"][value="phone"]')).toBeChecked();
    await expect(page.locator('#lead-phoneCountry')).toHaveValue('MX');
    await expect(page.locator('#lead-phone')).toHaveValue(FAKE.phone);
    await expect(page.locator('input[name="income"][value="30_50"]')).toBeChecked();
    await expect(page.locator('#lead-consent')).toBeChecked();
  });

  test('por correo: incluye el correo y la preferencia de respuesta por correo, sin teléfono', async ({ page }) => {
    await fillValid(page, { method: 'email' });
    await submit(page);
    const [call] = await opened(page);
    const text = textOf(call.url);
    expect(text).toBe(
      [
        GREETING,
        '',
        'Nombre: Prueba Ficticia',
        'Edad: 41 años',
        'Ingresos mensuales: De $30,000 a menos de $50,000 MXN',
        'Medio de contacto preferido: Correo electrónico',
        'Correo: prueba@ejemplo.com',
        '',
        'Prefiero que me respondas por correo electrónico, aunque te envío esta solicitud por WhatsApp.',
      ].join('\n'),
    );
    expect(text).not.toMatch(/Teléfono:|\+52/);
  });

  test('teléfono de otro país: número completo con su prefijo, sin correo', async ({ page }) => {
    await fillValid(page, { country: 'ES', phone: '612 345 678' });
    await submit(page);
    const text = textOf((await opened(page))[0].url);
    expect(text).toContain('Teléfono: +34 612 34 56 78');
    expect(text).not.toMatch(/Correo|@/);
  });

  test('acentos, eñes y saltos de línea viajan bien codificados', async ({ page }) => {
    await fillValid(page, { name: 'José Ñúñez Peña' });
    await submit(page);
    const { url } = (await opened(page))[0];
    const query = url.slice(LUIS_CHAT.length);
    expect(query).toContain('%0A');
    expect(query).toContain('Jos%C3%A9%20%C3%91%C3%BA%C3%B1ez%20Pe%C3%B1a');
    expect(query).not.toMatch(/[\s#&?ñáéíóúÑ]/);
    expect(decodeURIComponent(query).split('\n')[2]).toBe('Nombre: José Ñúñez Peña');
  });

  test('con errores no se abre el chat', async ({ page }) => {
    await submit(page);
    await expect(page.locator('.lead-summary')).toBeVisible();

    await fillValid(page);
    await page.locator('#lead-phone').fill('686 000 004');
    await submit(page);
    await expect(page.locator('#lead-phone-error')).toBeVisible();

    await page.locator('#lead-phone').fill(FAKE.phone);
    await page.locator('label.consent__label').click();
    await submit(page);
    await expect(page.locator('#lead-consent-error')).toBeVisible();

    await page.locator('label.consent__label').click();
    await page.locator('#lead-age').fill('17');
    await submit(page);
    await expect(page.locator('#lead-age-error')).toBeVisible();

    expect(await opened(page)).toEqual([]);
    await expect(page.locator('.lead-handoff')).toHaveCount(0);
  });

  test('con correo inválido o sin autorización (por correo) no se abre el chat', async ({ page }) => {
    await fillValid(page, { method: 'email' });
    await page.locator('#lead-email').fill('prueba@ejemplo');
    const consent = page.locator('#lead-consent');
    // Con errores, el foco va al resumen y la página se desplaza: se hace clic cuando se detiene.
    await submit(page);
    await expect(page.locator('#lead-email-error')).toBeVisible();
    await settleScroll(page);
    await page.locator('#lead-email').fill(FAKE.email);
    await page.locator('label.consent__label').click();
    await expect(consent).not.toBeChecked();
    await submit(page);
    await expect(page.locator('#lead-consent-error')).toBeVisible();
    expect(await opened(page)).toEqual([]);
    await settleScroll(page);
    await page.locator('label.consent__label').click();
    await expect(consent).toBeChecked();
    await page.locator('.lead-form__submit').scrollIntoViewIfNeeded();
    await settleScroll(page);
    await submit(page);
    expect(await opened(page)).toHaveLength(1);
  });

  test('si cambia un dato después de abrir, el mensaje se vuelve a preparar con el dato nuevo', async ({ page }) => {
    await fillValid(page);
    await submit(page);
    await expect(page.locator('.lead-handoff')).toBeVisible();
    await page.locator('#lead-age').fill('42');
    await expect(page.locator('.lead-handoff')).toHaveCount(0);
    await submit(page);
    const calls = await opened(page);
    expect(calls).toHaveLength(2);
    expect(textOf(calls[1].url)).toContain('Edad: 42 años');
  });

  test('no se emiten eventos de analítica ni se guardan datos en el navegador', async ({ page }) => {
    await page.evaluate(() => {
      window.__events = [];
      window.addEventListener('lb:analytics', (e) => window.__events.push(e.detail));
    });
    await fillValid(page, { method: 'email' });
    await submit(page);
    expect(await opened(page)).toHaveLength(1);
    expect(await page.evaluate(() => window.__events)).toEqual([]);
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toMatch(/Prueba|ejemplo|41|30_50/);
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
    // Con scroll-behavior: smooth, WebKit sigue desplazándose un momento; se toca cuando la página se detiene,
    // como haría una persona.
    await settleScroll(page);
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
