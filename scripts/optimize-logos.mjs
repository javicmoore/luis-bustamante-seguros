// Copias web de los logos de marcas a partir de assets-originales/logos-marcas (que no se modifican).
// - Solo se recorta el margen transparente vacío; no se recolorea, deforma ni recorta la marca.
// - SVG: se copia tal cual (se verifica que no tenga scripts ni referencias externas).
// - Mapas de bits: WebP sin pérdida, a 2× del tamaño mostrado.
// Uso: npm run logos   → imprime width/height para src/content/brands.js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const SRC = resolve('assets-originales/logos-marcas');
const OUT = resolve('public/brands');
const TARGET_HEIGHT = 120; // px del archivo (se muestra a ~36–44 px de alto)

const files = {
  allianz: 'allianz-logo.svg',
  zurich: 'zurich-logo.webp',
  skandia: 'skandia-logo.png',
  'insignia-life': 'insignia-life-logo.png',
  'la-latino': 'la-latina-seguros.png',
  mapfre: 'mapfre-logo.png',
};

await mkdir(OUT, { recursive: true });
for (const [id, file] of Object.entries(files)) {
  const input = resolve(SRC, file);
  if (file.endsWith('.svg')) {
    const svg = await readFile(input, 'utf8');
    if (/<script|on\w+=|<foreignObject|href="(?!#)/i.test(svg)) throw new Error(`${file}: SVG con contenido activo o externo`);
    await writeFile(resolve(OUT, `${id}.svg`), svg);
    const m = await sharp(Buffer.from(svg)).metadata();
    console.log(`${id}: /brands/${id}.svg  width ${m.width} height ${m.height}`);
    continue;
  }
  const trimmed = await sharp(input).trim({ threshold: 1 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const height = Math.min(TARGET_HEIGHT, meta.height);
  const info = await sharp(trimmed)
    .resize({ height, withoutEnlargement: true })
    .webp({ lossless: true, effort: 6 })
    .toFile(resolve(OUT, `${id}.webp`));
  console.log(`${id}: /brands/${id}.webp  width ${info.width} height ${info.height}  (${(info.size / 1024).toFixed(1)} KB)`);
}
