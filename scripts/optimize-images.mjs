// Genera versiones responsivas (AVIF, WebP y JPG) de una foto original sin modificarla.
// Los originales viven en media-originales/ (fuera de git y de lo publicado).
//
// Uso:
//   npm run images -- media-originales/luis-hero.jpg --name luis-hero [--focus upper|top|center]
//   npm run images -- media-originales/poster.jpg --name video-poster --widths 960,1440,1920
//
// Imprime el objeto para pegar en src/content/media.js.
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : fallback;
};

if (!input || !existsSync(input)) {
  console.error('Indica una imagen existente: npm run images -- media-originales/foto.jpg --name luis-hero');
  process.exit(1);
}

const name = option('name', basename(input, extname(input)).toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
const focus = option('focus', 'upper');
const widths = option('widths', '480,768,1080,1440')
  .split(',')
  .map(Number)
  .filter((n) => n > 0);
const outDir = resolve(process.cwd(), 'public/media');
await mkdir(outDir, { recursive: true });

// rotate() aplica la orientación EXIF; los metadatos (incluida la ubicación GPS) no se copian.
const base = sharp(input).rotate();
const meta = await base.metadata();
const sourceWidth = meta.autoOrient?.width ?? meta.width;
const sourceHeight = meta.autoOrient?.height ?? meta.height;
const targets = [...new Set(widths.map((w) => Math.min(w, sourceWidth)))].sort((a, b) => a - b);

const avif = [];
const webp = [];
let fallback = null;
for (const w of targets) {
  const resized = base.clone().resize({ width: w, withoutEnlargement: true });
  const stem = `${name}-${w}`;
  await resized.clone().avif({ quality: 55, effort: 5 }).toFile(resolve(outDir, `${stem}.avif`));
  await resized.clone().webp({ quality: 74 }).toFile(resolve(outDir, `${stem}.webp`));
  avif.push({ src: `/media/${stem}.avif`, w });
  webp.push({ src: `/media/${stem}.webp`, w });
  if (!fallback || w <= 1080) {
    await resized.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(resolve(outDir, `${stem}.jpg`));
    fallback = `/media/${stem}.jpg`;
  }
}

const entry = {
  alt: 'DESCRIBIR: p. ej. "Luis Bustamante, agente de seguros, sonriendo en su oficina en Mexicali"',
  width: sourceWidth,
  height: sourceHeight,
  avif,
  webp,
  fallback,
  focus,
};
console.log(`\n${targets.length} tamaños generados en public/media/ (${sourceWidth}×${sourceHeight}).`);
console.log('Pega esto en src/content/media.js y escribe un texto alternativo real:\n');
console.log(JSON.stringify(entry, null, 2));
