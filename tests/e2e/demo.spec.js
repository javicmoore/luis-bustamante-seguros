import { expect, test } from '@playwright/test';
import { open } from './utils.js';

// Solo corre contra un build hecho con SITE_MODE=demo: E2E_DEMO=1 npx playwright test tests/e2e/demo.spec.js
test.skip(!process.env.E2E_DEMO, 'Requiere un build de demostración (SITE_MODE=demo).');

test.describe('despliegue de demostración', () => {
  test('aviso visible en todas las páginas, sin tapar el header, y noindex', async ({ page }) => {
    for (const path of ['/', '/aviso-de-privacidad', '/no-existe']) {
      await open(page, path);
      const banner = page.locator('.demo-banner');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText('Versión de demostración');
      const b = await banner.boundingBox();
      const h = await page.locator('.site-header__bar').boundingBox();
      expect(h.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
    }
  });

  test('el formulario valida pero no envía nada ni simula recepción', async ({ page }) => {
    let requests = 0;
    page.on('request', (r) => r.url().includes('/api/') && (requests += 1));
    await open(page, '/#asesoria');
    await expect(page.locator('.lead-form__demo')).toBeVisible();
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    await expect(page.locator('.lead-summary')).toBeVisible();
    await page.locator('#lead-name').fill('Prueba Ficticia');
    await page.locator('#lead-age').fill('40');
    await page.locator('label.choice__option').filter({ hasText: /^Teléfono$/ }).click();
    await page.locator('#lead-phone').fill('686 000 0042');
    await page.locator('label.choice__option').filter({ hasText: /^\$50,000 o más$/ }).click();
    await page.locator('label.consent__label').click();
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    const result = page.locator('.lead-result');
    await expect(result).toContainText('no se envió nada');
    await expect(result).toContainText('Luis no recibió ninguna solicitud');
    await expect(result).not.toContainText('fue recibida');
    await expect(result.locator('.lead-result__folio')).toHaveCount(0);
    expect(requests).toBe(0);
  });

  test('en teléfonos el aviso cabe en su espacio y no tapa el header ni los destinos', async ({ page }) => {
    for (const width of [320, 375, 390, 414]) {
      await page.setViewportSize({ width, height: 740 });
      await open(page, '/');
      const m = await page.evaluate(() => {
        const banner = document.querySelector('.demo-banner').getBoundingClientRect();
        const bar = document.querySelector('.site-header__bar').getBoundingClientRect();
        return {
          banner: banner.height,
          reserved: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--demo-h')),
          gap: bar.top - banner.bottom,
        };
      });
      expect(m.banner).toBeLessThanOrEqual(m.reserved + 0.5);
      expect(m.gap).toBeGreaterThanOrEqual(0);
      // Al desplazarse, la franja blanca empieza justo debajo del aviso (sin hueco por donde se vea el contenido).
      await page.evaluate(() => window.scrollTo(0, document.getElementById('simulador').offsetTop + 120));
      await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
      const below = await page.evaluate(() => {
        const bottom = document.querySelector('.demo-banner').getBoundingClientRect().bottom;
        return document.elementFromPoint(innerWidth / 2, bottom + 2)?.closest('.site-header') !== null;
      });
      expect(below).toBe(true);
      // Destino de ancla: el título queda visible debajo del header.
      await page.locator('.site-header__toggle').click();
      await page.locator('#mobile-menu').getByRole('link', { name: /FAQ/ }).click();
      await page.waitForTimeout(1300);
      const title = await page.locator('#faq-title').boundingBox();
      const bar = await page.locator('.site-header__bar').boundingBox();
      expect(title.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
    }
  });

  test('"Conoce a Luis" va justo después de "Sobre Luis" con el video y su miniatura, sin desbordar', async ({ page }) => {
    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [768, 1024],
      [1366, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await open(page, '/');
      const ids = await page.$$eval('main > section', (els) => els.map((el) => el.id));
      expect(ids[ids.indexOf('sobre-luis') + 1]).toBe('video');
      const section = page.locator('#video');
      await expect(section.locator('#video-title')).toHaveText('Conoce a Luis');
      await expect(section).not.toContainText('próximamente');
      await section.scrollIntoViewIfNeeded();
      const video = section.locator('video[controls]');
      await expect(video).toHaveAttribute('poster', '/media/luis-presentacion-poster.jpg');
      const m = await video.evaluate((v) => {
        const r = v.getBoundingClientRect();
        return { ratio: r.width / r.height, width: r.width, container: v.closest('.container').clientWidth };
      });
      expect(Math.abs(m.ratio - 16 / 9)).toBeLessThan(0.01);
      expect(m.width).toBeLessThanOrEqual(Math.min(880, m.container) + 0.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    }
  });

  test('sin scroll horizontal en móvil con el aviso', async ({ page }) => {
    for (const width of [320, 375, 390, 414]) {
      await page.setViewportSize({ width, height: 700 });
      await open(page, '/');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await expect(page.locator('#hero-actions .btn--gold')).toBeInViewport();
    }
  });
});
