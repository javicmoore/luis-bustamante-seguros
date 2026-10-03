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
    await page.locator('#lead-phone').fill('686 000 0042');
    await page.locator('label.choice__option', { hasText: 'No' }).first().click();
    await page.locator('label.consent__label').click();
    await page.getByRole('button', { name: 'Solicitar mi asesoría' }).click();
    const result = page.locator('.lead-result');
    await expect(result).toContainText('no se envió nada');
    await expect(result).toContainText('Luis no recibió ninguna solicitud');
    await expect(result).not.toContainText('fue recibida');
    await expect(result.locator('.lead-result__folio')).toHaveCount(0);
    expect(requests).toBe(0);
  });

  test('sin scroll horizontal en móvil con el aviso', async ({ page }) => {
    for (const width of [320, 375, 390]) {
      await page.setViewportSize({ width, height: 700 });
      await open(page, '/');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await expect(page.locator('#hero-actions .btn--gold')).toBeInViewport();
    }
  });
});
