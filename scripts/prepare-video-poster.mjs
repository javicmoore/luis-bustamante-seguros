// Miniatura del video de presentación: conserva el original y genera la copia web del póster.
// Uso: npm run video:poster -- <ruta-de-la-miniatura>
//  - Copia el original sin cambios a assets-originales/luis/ (si aún no está).
//  - Genera public/media/luis-presentacion-poster.jpg: imagen completa, sin recortar, con el lado
//    mayor limitado a 1600 px, sin metadatos. El reproductor la muestra completa ("contain").
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) {
  console.error('Indica la ruta de la miniatura: npm run video:poster -- <ruta>');
  process.exit(1);
}

const root = process.cwd();
const originals = resolve(root, 'assets-originales/luis');
await mkdir(originals, { recursive: true });
const keep = resolve(originals, `miniatura-${basename(source)}`);
try {
  await stat(keep);
} catch {
  await copyFile(source, keep);
}

const meta = await sharp(source).metadata();
const out = resolve(root, 'public/media/luis-presentacion-poster.jpg');
await sharp(source)
  .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
  .flatten({ background: '#0a1d30' })
  .jpeg({ quality: 82, mozjpeg: true, progressive: true })
  .toFile(out);
const result = await sharp(out).metadata();
const { size } = await stat(out);
console.log(
  `Original ${meta.width}x${meta.height} (conservado en ${keep.replace(root, '.')}) → póster ${result.width}x${result.height}, ${(size / 1024).toFixed(0)} KB`,
);
