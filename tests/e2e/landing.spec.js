import { expect, test } from '@playwright/test';
import { open } from './utils.js';

const WIDTHS = [
  [320, 568],
  [375, 667],
  [390, 844],
  [768, 1024],
  [1366, 768],
  [1920, 1080],
];

test.describe('estructura y contenido', () => {
  test('bloques en orden, anclas del header y sin secciones eliminadas', async ({ page }) => {
    await open(page, '/');
    const ids = await page.$$eval('main > section', (els) => els.map((el) => el.id));
    const expected = ['inicio', 'simulador', 'asesoria', 'servicios', 'sobre-luis', 'faq'];
    // En producción, marcas/video/testimonios solo aparecen con contenido real.
    expect(ids.filter((id) => expected.includes(id))).toEqual(expected);
    await expect(page.locator('#site-footer')).toBeVisible();

    const nav = await page.$$eval('.site-header__nav a', (as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    expect(nav).toEqual([
      ['Inicio', '#inicio'],
      ['Simulador', '#simulador'],
      ['Asesoría', '#asesoria'],
      ['Sobre Luis', '#sobre-luis'],
      ['FAQ', '#faq'],
    ]);
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/Cómo funciona|El punto de partida/i);
    expect(body).not.toMatch(/Lucy/i);
  });

  test('identidad y teléfonos vigentes en todo el sitio', async ({ page }) => {
    for (const path of ['/', '/aviso-de-privacidad']) {
      await open(page, path);
      const tels = await page.$$eval('a[href^="tel:"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
      expect(tels).toEqual(['tel:+526863303727']);
      const wa = await page.$$eval('a[href*="wa.me"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
      expect(wa).toEqual(['https://wa.me/526863303727']);
      const text = await page.locator('body').innerText();
      const phones = text.match(/\b\d{3}\s?\d{3}\s?\d{4}\b/g) || [];
      for (const phone of phones) expect(phone.replace(/\s/g, '')).toBe('6863303727');
      await expect(page.locator('a[href="https://www.instagram.com/luisbustamante.seguros/"]').first()).toBeAttached();
    }
  });

  test('aviso de privacidad: ruta directa, borrador identificado y noindex', async ({ page }) => {
    const res = await open(page, '/aviso-de-privacidad');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Aviso de privacidad' })).toBeVisible();
    await expect(page.getByText('Borrador pendiente de revisión.')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('ruta inexistente responde 404 con página propia', async ({ page }) => {
    const res = await open(page, '/no-existe');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'No encontramos esta página.' })).toBeVisible();
  });
});

test.describe('layout responsivo', () => {
  for (const [width, height] of WIDTHS) {
    test(`sin scroll horizontal a ${width}px y CTA visible en el primer viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page, '/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const cta = page.locator('#hero-actions .btn--gold');
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
      // Recorre la página: no debe quedar texto oculto por animaciones.
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(height * 0.75)) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(900);
      const hidden = await page.$$eval('[data-reveal]', (els) => els.filter((el) => getComputedStyle(el).opacity === '0').length);
      expect(hidden).toBe(0);
    });
  }
});

test.describe('header y navegación', () => {
  test('cambia de superficie al avanzar sin cambiar de altura', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await open(page, '/');
    const header = page.locator('.site-header');
    const bar = page.locator('.site-header__bar');
    const h1 = (await bar.boundingBox()).height;
    await expect(header).not.toHaveClass(/is-scrolled/);
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveClass(/is-scrolled/);
    await page.waitForTimeout(400);
    expect((await bar.boundingBox()).height).toBe(h1);
  });

  test('las anclas dejan el título debajo del header', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await open(page, '/');
    for (const [label, id] of [['Simulador', 'sim-title'], ['Asesoría', 'lead-title'], ['FAQ', 'faq-title'], ['Sobre Luis', 'about-title']]) {
      await page.locator('.site-header__nav').getByRole('link', { name: label }).click();
      await page.waitForTimeout(1200);
      const headerBottom = (await page.locator('.site-header__bar').boundingBox()).y + (await page.locator('.site-header__bar').boundingBox()).height;
      const title = await page.locator(`#${id}`).boundingBox();
      expect(title.y).toBeGreaterThanOrEqual(headerBottom - 1);
      expect(title.y).toBeLessThan(768);
    }
  });

  test('menú móvil accesible: foco, Escape, cierre al navegar e inert', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await open(page, '/');
    const toggle = page.locator('.site-header__toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-menu a').first()).toBeFocused();
    expect(await page.evaluate(() => document.getElementById('main').inert)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.getElementById('main').inert)).toBe(false);

    await toggle.click();
    await page.locator('#mobile-menu').getByRole('link', { name: /FAQ/ }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.waitForTimeout(1300);
    const faqTitle = await page.locator('#faq-title').boundingBox();
    expect(faqTitle.y).toBeGreaterThan(0);
    expect(faqTitle.y).toBeLessThan(667);
    await expect(page.locator('#faq-title')).toBeFocused();
  });

  test('foco visible por teclado en el primer recorrido', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await open(page, '/');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    // El enlace entra con una transición corta: esperar a que termine antes de medir.
    await expect.poll(async () => (await skip.boundingBox()).y).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    expect(outline).not.toBe('none');
  });
});

test.describe('simulador', () => {
  test('tasa inicial 0 %: escenario igual a aportaciones; cambios recalculan cifras y gráfico', async ({ page }) => {
    await open(page, '/');
    const figures = page.locator('.sim-figure dd');
    await expect(figures.nth(0)).toHaveText('$540,000');
    await expect(figures.nth(1)).toHaveText('$540,000');
    await expect(page.getByText('Con una tasa de 0 %, el escenario ilustrativo es igual a tus aportaciones.')).toBeVisible();

    const before = await page.locator('.sim-chart__line-scenario').getAttribute('d');
    const rate = page.locator('#sim-rate-input');
    await rate.fill('6');
    await rate.press('Enter');
    await page.waitForTimeout(400);
    // FV de 3,000 mensuales por 180 meses al 6 % efectivo anual, aportación vencida.
    const i = Math.pow(1.06, 1 / 12) - 1;
    const fv = 3000 * ((Math.pow(1 + i, 180) - 1) / i);
    const expected = `$${Math.round(fv).toLocaleString('en-US')}`;
    await expect(figures.nth(1)).toHaveText(expected);
    await expect(figures.nth(0)).toHaveText('$540,000');
    expect(await page.locator('.sim-chart__line-scenario').getAttribute('d')).not.toBe(before);
  });

  test('aportación cero, plazos límite y teclado en los sliders', async ({ page }) => {
    await open(page, '/');
    const amount = page.locator('#sim-contribution-input');
    await amount.fill('0');
    await amount.press('Enter');
    await expect(page.locator('.sim-figure dd').nth(0)).toHaveText('$0');
    await expect(page.locator('.sim-figure dd').nth(1)).toHaveText('$0');

    const years = page.locator('#sim-years-range');
    await years.focus();
    await page.keyboard.press('End');
    await expect(years).toHaveValue('40');
    await page.keyboard.press('Home');
    await expect(years).toHaveValue('1');
    await expect(years).toHaveAttribute('aria-valuetext', '1 año');

    // Valor fuera de rango en el campo exacto: se ajusta al máximo permitido.
    await amount.fill('999999');
    await amount.press('Enter');
    await expect(page.locator('#sim-contribution-range')).toHaveValue('50000');
  });
});

test.describe('FAQ', () => {
  test('acordeón con estado accesible y contenido oculto al cerrar', async ({ page }) => {
    await open(page, '/');
    const button = page.getByRole('button', { name: '¿La asesoría tiene algún costo?' });
    const panel = page.locator('#faq-panel-costo');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).not.toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('La cotización y la asesoría son gratuitas.');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });
  test('todo el contenido visible sin animaciones', async ({ page }) => {
    await open(page, '/');
    await page.waitForTimeout(300);
    expect(await page.locator('.is-pending').count()).toBe(0);
    const opacity = await page.locator('.hero__title .hero__line-inner').first().evaluate((el) => getComputedStyle(el).transform);
    expect(opacity === 'none' || opacity === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    await page.locator('#faq').scrollIntoViewIfNeeded();
    await expect(page.locator('#faq-title')).toBeVisible();
  });
});

test.describe('seguridad del frontend', () => {
  test('sin violaciones de CSP ni errores de consola en landing y aviso', async ({ page }) => {
    const problems = [];
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
    page.on('pageerror', (e) => problems.push(e.message));
    for (const path of ['/', '/aviso-de-privacidad']) {
      const res = await open(page, path);
      expect(res.headers()['content-security-policy']).toContain("script-src 'self'");
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => window.__csp)).toEqual([]);
    }
    expect(problems).toEqual([]);
  });

  test('el bundle del navegador no contiene credenciales ni variables privadas', async ({ page, request }) => {
    await open(page, '/');
    const scripts = await page.$$eval('script[src]', (s) => s.map((el) => el.getAttribute('src')));
    const modules = await page.$$eval('link[rel="modulepreload"]', (s) => s.map((el) => el.getAttribute('href')));
    for (const src of [...scripts, ...modules]) {
      const js = await (await request.get(src)).text();
      expect(js).not.toMatch(/TWILIO_|UPSTASH|LEAD_HASH_SECRET|LEAD_NOTIFICATION_TO|api\.twilio\.com|KV_REST_API/);
    }
  });
});
