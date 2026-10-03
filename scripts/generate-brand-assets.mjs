// Genera favicon (SVG/ICO/PNG) e imagen social PROVISIONAL a partir de la tipografía de marca.
// No es un logotipo oficial: son las iniciales compuestas con Fraunces. Reemplazar cuando
// exista logo original; la imagen social debe rehacerse con un retrato real de Luis.
// Uso: node scripts/generate-brand-assets.mjs   (requiere Playwright Chromium instalado)
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const root = process.cwd();
const pub = resolve(root, 'public');

async function glyphPath() {
  let fontkit;
  try {
    fontkit = require('fontkit');
  } catch {
    return null;
  }
  const font = fontkit.openSync(resolve(pub, 'fonts/fraunces-500-italic.woff2'));
  const run = font.layout('LB');
  let x = 0;
  const parts = [];
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  run.glyphs.forEach((glyph, i) => {
    const path = glyph.path.translate(x, 0);
    parts.push(path.toSVG());
    const b = path.bbox;
    box.minX = Math.min(box.minX, b.minX);
    box.minY = Math.min(box.minY, b.minY);
    box.maxX = Math.max(box.maxX, b.maxX);
    box.maxY = Math.max(box.maxY, b.maxY);
    x += run.positions[i].xAdvance;
  });
  return { d: parts.join(' '), box };
}

function faviconSvg(glyph) {
  const size = 64;
  const { box } = glyph;
  const scale = Math.min(46 / (box.maxX - box.minX), 34 / (box.maxY - box.minY));
  // Centrado óptico según la caja real de los glifos (el eje Y de la fuente apunta hacia arriba).
  const tx = (size - (box.maxX - box.minX) * scale) / 2 - box.minX * scale;
  const ty = (size + (box.maxY - box.minY) * scale) / 2 + box.minY * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="14" fill="#102A43"/>
  <path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" fill="#D3AD66" d="${glyph.d}"/>
</svg>
`;
}

function icoFromPng(png) {
  // Contenedor ICO con una imagen PNG de 32×32.
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);
  entry.writeUInt8(32, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

const fontUrl = (file) => pathToFileURL(resolve(pub, 'fonts', file)).href;

function ogHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:url('${fontUrl('fraunces-600.woff2')}');font-weight:600}
@font-face{font-family:F;src:url('${fontUrl('fraunces-500-italic.woff2')}');font-weight:500;font-style:italic}
@font-face{font-family:M;src:url('${fontUrl('manrope-var.woff2')}');font-weight:200 800}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;font-family:M,sans-serif;color:#fff;
background:radial-gradient(80% 90% at 92% 0%,rgba(46,84,122,.75),transparent 60%),radial-gradient(50% 60% at 0% 100%,rgba(198,154,73,.12),transparent 70%),#102A43;position:relative}
.orbits{position:absolute;right:-180px;top:50%;transform:translateY(-50%);width:820px;height:820px}
.orbits circle{fill:none;stroke:rgba(198,154,73,.2)}
.wrap{position:absolute;inset:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.eyebrow{display:flex;align-items:center;gap:16px;font-weight:700;font-size:20px;letter-spacing:.18em;text-transform:uppercase;color:#E4C991}
.eyebrow:before{content:'';width:44px;height:2px;background:#C69A49}
h1{font-family:F;font-weight:600;font-size:92px;line-height:1;letter-spacing:-.02em;margin-top:28px}
.t{font-family:F;font-size:44px;line-height:1.15;margin-top:26px;max-width:760px}
.t em{font-style:italic;font-weight:500;color:#E4C991}
.meta{display:flex;gap:36px;font-size:24px;font-weight:600;color:rgba(255,255,255,.82)}
.meta span:before{content:'';display:inline-block;width:10px;height:10px;border-radius:50%;background:#C69A49;margin-right:12px;vertical-align:middle}
</style></head><body>
<svg class="orbits" viewBox="0 0 800 800"><circle cx="400" cy="400" r="210"/><circle cx="400" cy="400" r="300"/><circle cx="400" cy="400" r="390"/></svg>
<div class="wrap"><div><p class="eyebrow">Seguros y planeación patrimonial</p><h1>Luis Bustamante</h1>
<p class="t">Protege lo que has construido. <em>Planea lo que viene.</em></p></div>
<div class="meta"><span>Mexicali, B.C.</span><span>Asesoría en todo México</span><span>686 330 3727</span></div></div>
</body></html>`;
}

const glyph = await glyphPath();
if (!glyph) {
  console.error('Instala fontkit (npm i -D fontkit) para generar el favicon desde la fuente.');
  process.exit(1);
}
const svg = faviconSvg(glyph);
await writeFile(resolve(pub, 'favicon.svg'), svg);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const svgDataPage = (size) =>
  `<!doctype html><html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`;

for (const [size, file] of [
  [32, 'favicon-32.png'],
  [180, 'apple-touch-icon.png'],
  [512, 'icon-512.png'],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(svgDataPage(size));
  const png = await page.screenshot({ omitBackground: size === 32, clip: { x: 0, y: 0, width: size, height: size } });
  await writeFile(resolve(pub, file), png);
  if (size === 32) await writeFile(resolve(pub, 'favicon.ico'), icoFromPng(png));
}

await mkdir(resolve(pub, 'og'), { recursive: true });
await page.setViewportSize({ width: 1200, height: 630 });
const ogFile = resolve(root, '.tmp-og.html');
await writeFile(ogFile, ogHtml());
await page.goto(pathToFileURL(ogFile).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: resolve(pub, 'og/og-default.png') });
await browser.close();
await rm(ogFile, { force: true });

const size = (await readFile(resolve(pub, 'og/og-default.png'))).length;
console.log(`favicon.svg, favicon.ico, favicon-32.png, apple-touch-icon.png, icon-512.png y og/og-default.png (${(size / 1024).toFixed(0)} KB) generados.`);
