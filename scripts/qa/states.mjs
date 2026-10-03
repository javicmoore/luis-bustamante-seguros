// Capturas de estados interactivos para revisión visual (menú, formulario, diálogo, páginas).
// Uso: node scripts/qa/states.mjs [baseUrl] [carpeta]
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const out = process.argv[3] || 'qa-output/states';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });

async function open(page, path) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForSelector('html[data-hydrated="true"]', { state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

async function fill(page) {
  await page.locator('#lead-name').fill('Prueba Ficticia');
  await page.locator('#lead-age').fill('41');
  await page.locator('#lead-phone').fill('686 000 0042');
  await page.locator('label.choice__option', { hasText: 'Sí' }).click();
  await page.locator('label.consent__label').click();
}

const mobile = { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const desktop = { viewport: { width: 1366, height: 768 } };

// Menú móvil abierto
{
  const page = await browser.newPage(mobile);
  await open(page, '/');
  await page.locator('.site-header__toggle').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/mobile-menu.png` });
  await page.close();
}

// Formulario: errores, éxito, fallo (móvil y escritorio)
for (const [tag, ctx] of [['mobile', mobile], ['desktop', desktop]]) {
  const page = await browser.newPage(ctx);
  await open(page, '/');
  const form = page.locator('#asesoria .request__card');
  await form.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
  await page.waitForTimeout(400);
  await form.screenshot({ path: `${out}/${tag}-form-errors.png` });

  await page.route('**/api/leads', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: '{"ok":false,"error":"notification_failed","id":"LB-AAAAAAAA"}' }),
  );
  await fill(page);
  await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
  await page.waitForTimeout(500);
  await form.screenshot({ path: `${out}/${tag}-form-failure.png` });

  await page.unroute('**/api/leads');
  await page.route('**/api/leads', (route) =>
    route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true,"status":"received","id":"LB-7K3M9QX2","notification":"accepted","demo":true}' }),
  );
  await page.getByRole('button', { name: 'Reintentar envío' }).click();
  await page.waitForTimeout(700);
  await form.screenshot({ path: `${out}/${tag}-form-success.png` });
  await page.close();
}

// Diálogo de privacidad
{
  const page = await browser.newPage(mobile);
  await open(page, '/');
  await page.locator('#asesoria .request__card').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Leer el aviso de privacidad' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/mobile-privacy-dialog.png` });
  await page.close();
}

// Páginas secundarias y anchos extremos
for (const [name, ctx, path] of [
  ['privacy-page-desktop', desktop, '/aviso-de-privacidad'],
  ['privacy-page-mobile', mobile, '/aviso-de-privacidad'],
  ['notfound-desktop', desktop, '/pagina-que-no-existe'],
  ['hero-320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, '/'],
  ['landscape-740', { viewport: { width: 740, height: 360 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, '/'],
]) {
  const page = await browser.newPage(ctx);
  await open(page, path);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.close();
}

// Header ya desplazado sobre una sección clara, con la barra de contacto móvil visible
{
  const page = await browser.newPage(mobile);
  await open(page, '/');
  await page.evaluate(() => window.scrollTo(0, document.getElementById('servicios').offsetTop + 200));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/mobile-scrolled-services.png` });
  await page.close();
}

await browser.close();
console.log(`Capturas en ${out}/`);
