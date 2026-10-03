import { expect, test } from '@playwright/test';
import { open } from './utils.js';

const GOLD = 'rgb(198, 154, 73)';

test('botones dorados mates: sin sombra ni filtros en reposo, hover y active; foco visible', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await open(page, '/');
  const buttons = page.locator('.btn--gold, .site-header__cta');
  const count = await buttons.count();
  expect(count).toBeGreaterThanOrEqual(4);

  const look = (el) =>
    el.evaluate((node) => {
      const s = getComputedStyle(node);
      const before = getComputedStyle(node, '::before');
      const after = getComputedStyle(node, '::after');
      return { shadow: s.boxShadow, filter: s.filter, bg: s.backgroundColor, pseudo: [before.content, after.content] };
    });

  const hero = page.locator('#hero-actions .btn--gold');
  const rest = await look(hero);
  expect(rest).toMatchObject({ shadow: 'none', filter: 'none', bg: GOLD, pseudo: ['none', 'none'] });

  await hero.hover();
  await page.waitForTimeout(350);
  expect((await look(hero)).shadow).toBe('none');
  await page.mouse.down();
  expect((await look(hero)).shadow).toBe('none');
  await page.mouse.up();

  const header = page.locator('.site-header__cta');
  expect((await look(header)).shadow).toBe('none');
  expect((await look(header)).bg).toBe(GOLD);

  for (const el of await page.locator('.btn--gold').all()) expect((await look(el)).shadow).toBe('none');

  // Foco por teclado visible (contorno).
  await hero.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
});
