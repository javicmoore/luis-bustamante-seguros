// Genera favicon, íconos e imagen social a partir del logotipo y la fotografía reales de Luis.
// Fuentes: public/brand/isotipo-512.png, public/brand/logo.png y public/media/luis-hero-1088.webp
// (copias creadas con `npm run luis:assets`; los originales en assets-originales/ no se tocan).
// El isotipo se coloca sobre una placa clara: sus barras azul marino no se leerían sobre fondo oscuro.
// No se aplican filtros de color ni se redibuja el logotipo; la foto solo se recorta.
// Uso: node scripts/generate-brand-assets.mjs   (requiere sharp y Playwright Chromium)
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { chromium } from '@playwright/test';

const root = process.cwd();
const pub = resolve(root, 'public');
const isotype = resolve(pub, 'brand/isotipo-512.png');

/** Isotipo centrado sobre una placa blanca redondeada (sin alterar sus colores ni proporciones). */
async function iconPng(size, { radius = 0.22, inset = 0.14 } = {}) {
  const r = Math.round(size * radius);
  const plate = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#ffffff"/></svg>`,
  );
  const box = Math.round(size * (1 - inset * 2));
  const mark = await sharp(isotype)
    .resize(box, box, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const offset = Math.round((size - box) / 2);
  return sharp(plate)
    .composite([{ input: mark, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function icoFromPng(png, size) {
  // Contenedor ICO con una sola imagen PNG.
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

const fileUrl = (path) => pathToFileURL(resolve(pub, path)).href;

function ogHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:url('${fileUrl('fonts/fraunces-600.woff2')}');font-weight:600}
@font-face{font-family:F;src:url('${fileUrl('fonts/fraunces-500-italic.woff2')}');font-weight:500;font-style:italic}
@font-face{font-family:M;src:url('${fileUrl('fonts/manrope-var.woff2')}');font-weight:200 800}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;font-family:M,sans-serif;color:#fff;position:relative;
background:radial-gradient(70% 90% at 85% 10%,rgba(56,88,112,.55),transparent 62%),radial-gradient(50% 60% at 0% 100%,rgba(200,128,64,.12),transparent 70%),#0d1f33}
.graphics{position:absolute;inset:0;width:100%;height:100%}
.graphics .grid{stroke:rgba(255,255,255,.05)}
.graphics .bar{fill:rgba(255,255,255,.045)}
.graphics .line{fill:none;stroke:rgba(200,128,64,.38);stroke-width:3;stroke-linejoin:round}
.wrap{position:absolute;left:72px;top:60px;bottom:60px;width:610px;display:flex;flex-direction:column;justify-content:space-between}
.logo{align-self:flex-start;background:#fff;border-radius:22px;padding:18px 26px;box-shadow:0 18px 40px -20px rgba(0,0,0,.6)}
.logo img{display:block;width:250px;height:auto}
.t{font-family:F;font-weight:600;font-size:50px;line-height:1.08;letter-spacing:-.01em}
.t em{display:block;font-style:italic;font-weight:500;color:#e8b98a}
.meta{display:flex;flex-wrap:wrap;gap:12px 26px;font-size:21px;font-weight:600;color:rgba(255,255,255,.85)}
.meta span:before{content:'';display:inline-block;width:9px;height:9px;border-radius:50%;background:#c88040;margin-right:11px;vertical-align:middle}
.photo{position:absolute;right:86px;top:52px;width:392px;height:526px}
.photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 12%;border-radius:999px 999px 26px 26px}
.photo:before{content:'';position:absolute;inset:0;border:1.5px solid rgba(200,128,64,.6);border-radius:999px 999px 30px 30px;transform:translate(14px,14px) rotate(2.5deg)}
</style></head><body>
<svg class="graphics" viewBox="0 0 1200 630" aria-hidden="true">
<path class="grid" d="M0 158H1200M0 316H1200M0 474H1200"/>
<rect class="bar" x="700" y="410" width="46" height="220"/><rect class="bar" x="770" y="360" width="46" height="270"/>
<rect class="bar" x="840" y="300" width="46" height="330"/><rect class="bar" x="910" y="250" width="46" height="380"/>
<rect class="bar" x="980" y="200" width="46" height="430"/><rect class="bar" x="1050" y="160" width="46" height="470"/>
<polyline class="line" points="0,604 150,590 290,600 430,572 540,584 640,556"/>
</svg>
<div class="wrap">
<div class="logo"><img src="${fileUrl('brand/logo.png')}" alt=""></div>
<p class="t">Protege lo que has construido. <em>Planea lo que viene.</em></p>
<div class="meta"><span>Mexicali, B.C.</span><span>Asesoría en todo México</span><span>686 387 2193</span></div>
</div>
<div class="photo"><img src="${fileUrl('media/luis-hero-1088.webp')}" alt=""></div>
</body></html>`;
}

// Íconos: 32 px (pestaña), 180 px (iOS), 192 y 512 px (Android/instalación).
const png32 = await iconPng(32, { radius: 0.2, inset: 0.08 });
await writeFile(resolve(pub, 'favicon-32.png'), png32);
await writeFile(resolve(pub, 'favicon.ico'), icoFromPng(png32, 32));
// iOS aplica su propia máscara redondeada: placa cuadrada completa.
await writeFile(resolve(pub, 'apple-touch-icon.png'), await iconPng(180, { radius: 0, inset: 0.14 }));
await writeFile(resolve(pub, 'icon-192.png'), await iconPng(192));
await writeFile(resolve(pub, 'icon-512.png'), await iconPng(512));
await rm(resolve(pub, 'favicon.svg'), { force: true });

// Imagen social 1200×630.
await mkdir(resolve(pub, 'og'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1200, height: 630 } });
const ogFile = resolve(root, '.tmp-og.html');
await writeFile(ogFile, ogHtml());
await page.goto(pathToFileURL(ogFile).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const shot = await page.screenshot();
await browser.close();
await rm(ogFile, { force: true });
await writeFile(resolve(pub, 'og/og-default.png'), await sharp(shot).png({ compressionLevel: 9, palette: false }).toBuffer());

const size = (await readFile(resolve(pub, 'og/og-default.png'))).length;
console.log(
  `favicon.ico, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png y og/og-default.png (${(size / 1024).toFixed(0)} KB) generados.`,
);
