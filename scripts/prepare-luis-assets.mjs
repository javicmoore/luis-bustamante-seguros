// Copias web del logo y los retratos de Luis a partir de assets-originales/ (que no se modifican).
//
// Logo: ya trae fondo transparente. Solo se eliminan píxeles residuales casi invisibles
// (alpha ≤ 8 de 255) y el margen vacío; no se cambian formas, colores ni tipografía.
//   - public/brand/logo.{webp,png}     logo completo (isotipo + nombre + lema)
//   - public/brand/isotipo.{webp,png}  solo el isotipo (para fondos oscuros va sobre una placa clara)
// Retratos: sin retoque ni alteraciones; solo redimensionado y compresión (AVIF/WebP/JPG) sin
// metadatos. El avatar es un recorte cuadrado convencional del rostro de la foto de traje.
//
// Uso: node scripts/prepare-luis-assets.mjs   (imprime los objetos para src/content/media.js)
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const SRC = resolve('assets-originales');
const BRAND = resolve('public/brand');
const MEDIA = resolve('public/media');
await mkdir(BRAND, { recursive: true });
await mkdir(MEDIA, { recursive: true });

// ---------- Logo ----------
const logoFile = resolve(SRC, 'Luis Bustamante Logo.png');
const { data, info } = await sharp(logoFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let cleared = 0;
for (let i = 3; i < data.length; i += 4) {
  if (data[i] > 0 && data[i] <= 8) {
    data[i - 3] = 0;
    data[i - 2] = 0;
    data[i - 1] = 0;
    data[i] = 0;
    cleared += 1;
  }
}
const cleanLogo = await sharp(data, { raw: info }).png().toBuffer();
console.log(`Logo: ${cleared} píxeles residuales (alpha ≤ 8) eliminados.`);

async function exportLogo(buffer, name, height) {
  const trimmed = await sharp(buffer).trim({ threshold: 0 }).toBuffer();
  const resized = sharp(trimmed).resize({ height, withoutEnlargement: true });
  const webp = await resized.clone().webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(resolve(BRAND, `${name}.webp`));
  const png = await resized.clone().png({ compressionLevel: 9 }).toFile(resolve(BRAND, `${name}.png`));
  console.log(`  /brand/${name}.webp ${webp.width}x${webp.height} (${(webp.size / 1024).toFixed(1)} KB) · png ${(png.size / 1024).toFixed(1)} KB`);
  return { width: webp.width, height: webp.height };
}

const full = await exportLogo(cleanLogo, 'logo', 300);
// Isotipo: filas 0–700 (antes del nombre; hay una franja vacía entre 688 y 740).
const isoBuffer = await sharp(cleanLogo).extract({ left: 0, top: 0, width: info.width, height: 700 }).png().toBuffer();
const iso = await exportLogo(isoBuffer, 'isotipo', 192);
// Versión grande del isotipo para favicon e imagen social.
await sharp(isoBuffer).trim({ threshold: 0 }).resize({ height: 512 }).png().toFile(resolve(BRAND, 'isotipo-512.png'));

// ---------- Retratos ----------
async function exportPortrait(file, name, widths, alt, focus) {
  const input = resolve(SRC, file);
  const meta = await sharp(input).metadata();
  const avif = [];
  const webp = [];
  let fallback = null;
  for (const w of widths.filter((x) => x <= meta.width)) {
    const base = sharp(input).resize({ width: w });
    await base.clone().avif({ quality: 56, effort: 6 }).toFile(resolve(MEDIA, `${name}-${w}.avif`));
    await base.clone().webp({ quality: 80, effort: 6 }).toFile(resolve(MEDIA, `${name}-${w}.webp`));
    avif.push({ src: `/media/${name}-${w}.avif`, w });
    webp.push({ src: `/media/${name}-${w}.webp`, w });
    if (w <= 768 || !fallback) {
      await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(resolve(MEDIA, `${name}-${w}.jpg`));
      fallback = `/media/${name}-${w}.jpg`;
    }
  }
  return { alt, width: meta.width, height: meta.height, avif, webp, fallback, focus };
}

const hero = await exportPortrait(
  'luis-hero.png',
  'luis-hero',
  [480, 720, 960, 1088],
  'Luis Bustamante, agente de seguros, de traje azul y camisa blanca, sonriendo',
  'upper',
);
const about = await exportPortrait(
  'luis.png',
  'luis-sobre',
  [480, 720, 960, 1088],
  'Luis Bustamante con camisa azul, sonriendo',
  'top',
);

// Avatar: recorte cuadrado del rostro (foto de traje), sin otros cambios.
const avatarRegion = { left: 360, top: 70, width: 360, height: 360 };
const avatar = { alt: '', width: 192, height: 192, avif: [], webp: [], fallback: '/media/luis-avatar-192.jpg', focus: 'center' };
for (const w of [96, 192]) {
  const base = sharp(resolve(SRC, 'luis-hero.png')).extract(avatarRegion).resize({ width: w });
  await base.clone().avif({ quality: 60 }).toFile(resolve(MEDIA, `luis-avatar-${w}.avif`));
  await base.clone().webp({ quality: 82 }).toFile(resolve(MEDIA, `luis-avatar-${w}.webp`));
  await base.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(resolve(MEDIA, `luis-avatar-${w}.jpg`));
  avatar.avif.push({ src: `/media/luis-avatar-${w}.avif`, w });
  avatar.webp.push({ src: `/media/luis-avatar-${w}.webp`, w });
}

console.log('\nlogo:', JSON.stringify({ full, iso }));
console.log('\nheroPortrait:', JSON.stringify(hero));
console.log('\naboutPortrait:', JSON.stringify(about));
console.log('\navatar:', JSON.stringify(avatar));
