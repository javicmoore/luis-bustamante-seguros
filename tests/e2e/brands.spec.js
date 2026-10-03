import { expect, test } from '@playwright/test';
import { open } from './utils.js';

const NAMES = ['Allianz', 'Zurich', 'Skandia', 'Insignia Life', 'La Latino Seguros', 'MAPFRE'];

test.describe('carrusel de marcas (build de producción)', () => {
  test('debajo del hero, con título, seis logos cargados y textos alternativos', async ({ page }) => {
    await open(page, '/');
    const order = await page.$$eval('main > section', (els) => els.map((el) => el.id || el.className.split(' ')[0]));
    expect(order.slice(0, 3)).toEqual(['inicio', 'brands', 'simulador']);
    await expect(page.getByRole('heading', { name: 'Marcas con las que trabajo' })).toBeVisible();
    const imgs = page.locator('.brands__set').first().locator('img');
    await expect(imgs).toHaveCount(6);
    expect(await imgs.evaluateAll((els) => els.map((el) => el.alt))).toEqual(NAMES);
    await expect
      .poll(() => imgs.evaluateAll((els) => els.every((el) => el.complete && el.naturalWidth > 0)))
      .toBe(true);
  });

  test('copias repetidas fuera del árbol accesible y sin foco', async ({ page }) => {
    await open(page, '/');
    const sets = page.locator('.brands__set');
    await expect(sets).toHaveCount(2);
    await expect(sets.nth(1)).toHaveAttribute('aria-hidden', 'true');
    expect(await sets.nth(1).evaluate((el) => el.inert)).toBe(true);
    const tree = await page.locator('.brands').ariaSnapshot();
    for (const name of NAMES) expect(tree.split(name).length - 1).toBe(1);
  });

  test('pausa con foco, botón y cursor; reanuda', async ({ page }) => {
    await open(page, '/');
    const track = page.locator('.brands__track');
    await expect(track).toHaveCSS('animation-play-state', 'running');
    const toggle = page.getByRole('button', { name: 'Pausar el movimiento de las marcas' });
    await toggle.focus();
    await expect(track).toHaveCSS('animation-play-state', 'paused');
    await toggle.blur();
    await expect(track).toHaveCSS('animation-play-state', 'running');
    await toggle.click();
    await expect(track).toHaveCSS('animation-play-state', 'paused');
    await page.getByRole('button', { name: 'Reanudar el movimiento de las marcas' }).click();
    await expect(track).toHaveCSS('animation-play-state', 'running');
    await page.locator('.brands__viewport').hover();
    await expect(track).toHaveCSS('animation-play-state', 'paused');
  });

  test('loop continuo y logos sin deformación', async ({ page }) => {
    await open(page, '/');
    const widths = await page.$$eval('.brands__set', (els) => els.map((el) => el.getBoundingClientRect().width));
    expect(Math.abs(widths[0] - widths[1])).toBeLessThan(0.5);
    const ratios = await page.$$eval('.brands__set:first-child img', (els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return Math.abs(r.width / r.height - el.naturalWidth / el.naturalHeight) / (el.naturalWidth / el.naturalHeight);
      }),
    );
    for (const diff of ratios) expect(diff).toBeLessThan(0.03);
  });

  for (const width of [320, 375, 390]) {
    test(`sin scroll horizontal a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await open(page, '/');
      await page.locator('.brands').scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('carrusel con movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 375, height: 700 } });
  test('lista estática, sin copias visibles ni control de pausa', async ({ page }) => {
    await open(page, '/');
    await expect(page.locator('.brands__track')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.brands__set').nth(1)).toBeHidden();
    await expect(page.locator('.brands__toggle')).toBeHidden();
    for (const img of await page.locator('.brands__set').first().locator('img').all()) await expect(img).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
