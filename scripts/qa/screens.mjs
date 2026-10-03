// Capturas y comprobaciones rápidas de layout en varios anchos.
// Uso: node scripts/qa/screens.mjs [baseUrl] [carpeta]   (por defecto http://127.0.0.1:4173 y qa-output/)
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const out = process.argv[3] || 'qa-output';
const only = process.env.QA_WIDTHS ? process.env.QA_WIDTHS.split(',').map(Number) : null;
const fullPage = process.env.QA_FULL !== '0';
const path = process.env.QA_PATH || '/';
const reduced = process.env.QA_REDUCED === '1';

const viewports = [
  { w: 320, h: 568, mobile: true },
  { w: 375, h: 667, mobile: true },
  { w: 390, h: 844, mobile: true },
  { w: 768, h: 1024, mobile: true },
  { w: 1366, h: 768, mobile: false },
  { w: 1920, h: 1080, mobile: false },
].filter((v) => !only || only.includes(v.w));

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    isMobile: vp.mobile && vp.w < 768,
    hasTouch: vp.mobile,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) problems.push(`[console.${msg.type()}] ${msg.text().slice(0, 200)}`);
  });
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1100);
  const tag = `${vp.w}x${vp.h}${reduced ? '-reduced' : ''}`;
  await page.screenshot({ path: `${out}/${tag}-top.png` });

  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
    fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style} ${f.weight}`),
  }));

  if (fullPage) {
    // Recorre la página para disparar las entradas y luego captura completa.
    for (let y = 0; y < metrics.height; y += Math.round(vp.h * 0.7)) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(140);
    }
    await page.waitForTimeout(900);
    const invisible = await page.evaluate(
      () => [...document.querySelectorAll('[data-reveal].is-pending')].filter((el) => Number(getComputedStyle(el).opacity) < 0.05).length,
    );
    if (invisible) problems.push(`${invisible} elementos siguen ocultos tras recorrer la página`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${tag}-full.png`, fullPage: true });
  }

  const overflowAfter = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (metrics.overflow > 0 || overflowAfter > 0) problems.push(`desbordamiento horizontal: ${Math.max(metrics.overflow, overflowAfter)}px`);
  report.push({ viewport: tag, height: metrics.height, fonts: metrics.fonts.length, problems });
  await context.close();
}

await browser.close();
for (const r of report) {
  console.log(`${r.viewport}: alto ${r.height}px, fuentes cargadas ${r.fonts}${r.problems.length ? '' : ' · sin problemas'}`);
  for (const p of r.problems) console.log(`   - ${p}`);
}
