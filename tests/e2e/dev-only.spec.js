import { expect, test } from '@playwright/test';
import { open } from './utils.js';

// Bloques que en esta etapa solo existen en desarrollo (fixtures y pendientes identificados).
test.use({ baseURL: 'http://127.0.0.1:5173' });

test.describe('pendientes identificados', () => {
  test('video real con controles nativos; testimonios muestran el pendiente', async ({ page }) => {
    await open(page, '/');
    await expect(page.locator('#video video[controls]')).toHaveCount(1);
    await expect(page.locator('#video [data-dev-note]')).toHaveCount(0);
    await expect(page.locator('#video')).not.toContainText('próximamente');
    await expect(page.locator('#testimonios [data-dev-note]')).toBeVisible();
    await expect(page.locator('#testimonios blockquote')).toHaveCount(0);
  });
});
