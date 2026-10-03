// Revisión de lanzamiento: enumera pendientes que impiden recibir prospectos reales.
//
//   npm run check:release          → reporte local; termina con código 1 si hay bloqueantes.
//   node scripts/release-check.mjs --vercel
//       En Vercel: si VERCEL_ENV=production y hay bloqueantes, detiene el build (salvo
//       RELEASE_CHECK=warn, que debe ser una decisión explícita). En Preview solo informa.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { site } from '../src/content/site.js';
import { brands, getPublishableBrands } from '../src/content/brands.js';
import { media, video } from '../src/content/media.js';
import { getPublishableTestimonials, testimonialsDecision } from '../src/content/testimonials.js';
import { privacy, isPrivacyFinal } from '../src/content/privacy.js';
import { copyReview } from '../src/content/review.js';
import { launchChecklist } from '../src/content/launch.js';

const env = process.env;
const vercelMode = process.argv.includes('--vercel');
const production = env.VERCEL_ENV === 'production';
const pub = resolve(process.cwd(), 'public');

const blockers = [];
const warnings = [];
const ok = [];

const publicFile = (src) => typeof src === 'string' && src.startsWith('/') && existsSync(resolve(pub, `.${src}`));

// --- Contenido y assets -----------------------------------------------------
for (const [key, label] of [
  ['heroPortrait', 'Retrato original de Luis para el hero'],
  ['aboutPortrait', 'Retrato original de Luis para "Sobre Luis"'],
]) {
  const image = media[key];
  if (!image) blockers.push(`${label}: no entregado (se muestra monograma provisional).`);
  else if (!publicFile(image.fallback)) blockers.push(`${label}: no existe ${image.fallback} en public/.`);
  else ok.push(`${label}.`);
}

if (!site.logo) warnings.push('Logo original no entregado: se usa el nombre compuesto tipográficamente. Confirmar si existe logo.');
else if (!publicFile(site.logo.src)) blockers.push(`Logo: no existe ${site.logo.src} en public/.`);
else ok.push('Logo original.');

const publishable = getPublishableBrands();
if (publishable.length === 0) {
  blockers.push(
    `Carrusel de marcas: ninguna marca confirmada con logo autorizado (lista de trabajo: ${brands.map((b) => b.name).join(', ')}). La franja no se publica sin confirmación.`,
  );
} else {
  for (const brand of publishable) {
    if (!publicFile(brand.logo.src)) blockers.push(`Logo de ${brand.name}: no existe ${brand.logo.src} en public/.`);
  }
  ok.push(`Marcas confirmadas: ${publishable.map((b) => b.name).join(', ')}.`);
}

if (video.src) {
  if (!/^https:\/\//.test(video.src) && !publicFile(video.src)) blockers.push(`Video: no existe ${video.src}.`);
  if (!video.poster) warnings.push('Video sin póster optimizado.');
  if (!video.captions) warnings.push('Video sin subtítulos (.vtt).');
  if (/^https:\/\//.test(video.src)) warnings.push('Video en host externo: agregar su origen a media-src en la CSP (vercel.json).');
  ok.push('Video de presentación.');
} else if (video.decision === 'omitir') {
  warnings.push('Video: se publicará sin esta sección por decisión explícita.');
} else {
  blockers.push('Video de presentación: falta el archivo real o una decisión explícita (video.decision = "omitir").');
}

const testimonials = getPublishableTestimonials();
if (testimonials.length > 0) ok.push(`Testimonios autorizados: ${testimonials.length}.`);
else if (testimonialsDecision === 'omitir') warnings.push('Testimonios: se publicará sin esta sección por decisión explícita.');
else blockers.push('Testimonios: faltan testimonios reales y autorizados, o una decisión explícita (testimonialsDecision = "omitir").');

if (!isPrivacyFinal()) {
  const missing = Object.entries(privacy.responsible)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  blockers.push(
    `Aviso de privacidad en borrador (faltan: ${[...missing, ...(privacy.updatedAt ? [] : ['updatedAt'])].join(', ') || 'revisión'}; status = "${privacy.status}").`,
  );
} else ok.push('Aviso de privacidad final.');

for (const item of copyReview.filter((c) => c.status !== 'aprobado')) {
  blockers.push(`Texto por validar con Luis — ${item.note} (${item.file}).`);
}

for (const item of launchChecklist.filter((c) => !c.done)) {
  blockers.push(`Verificación pendiente — ${item.label}`);
}

if (!existsSync(resolve(pub, 'og/og-default.png'))) warnings.push('Falta la imagen social (public/og/og-default.png).');
else warnings.push('Imagen social provisional (tipográfica): rehacerla con un retrato real de Luis.');

if (env.SITE_MODE && env.SITE_MODE !== 'demo') blockers.push('SITE_MODE solo admite "demo" (o no definirla).');
if (env.SITE_MODE === 'demo' && !vercelMode) blockers.push('SITE_MODE=demo está activo: el formulario no envía solicitudes.');

// --- Configuración del servidor (solo nombres, nunca valores) -----------------
const checkEnv = vercelMode || process.argv.includes('--env');
if (checkEnv) {
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_API_KEY',
    'TWILIO_API_SECRET',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_FROM',
    'TWILIO_CONTENT_SID',
    'LEAD_NOTIFICATION_TO',
    'LEAD_HASH_SECRET',
  ];
  const missing = required.filter((k) => !env[k]);
  if (!(env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) || !(env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN)) {
    missing.push('UPSTASH_REDIS_REST_URL/TOKEN (o KV_REST_API_URL/TOKEN)');
  }
  if (missing.length) blockers.push(`Variables privadas faltantes: ${missing.join(', ')}.`);
  else ok.push('Variables privadas del servidor presentes.');
  if ((env.LEAD_PROVIDER || 'twilio').toLowerCase() !== 'twilio') blockers.push('LEAD_PROVIDER debe ser "twilio" en producción.');
  if (!env.SITE_URL) warnings.push('SITE_URL no definida: sin canonical, og:url, og:image absoluta, sitemap ni callback con dominio propio.');
  else if (!/^https:\/\//.test(env.SITE_URL)) blockers.push('SITE_URL debe usar https.');
  for (const key of Object.keys(env)) {
    if (key.startsWith('VITE_') && /(SECRET|TOKEN|KEY|PASSWORD|SID)/i.test(key)) {
      blockers.push(`La variable ${key} tiene prefijo VITE_ y terminaría en el navegador.`);
    }
  }
}

// --- Reporte ---------------------------------------------------------------------
const line = (symbol, text) => console.log(`  ${symbol} ${text}`);
console.log('\nRevisión de lanzamiento — Luis Bustamante\n');
if (blockers.length) {
  console.log(`BLOQUEANTES (${blockers.length}):`);
  blockers.forEach((b) => line('✗', b));
}
if (warnings.length) {
  console.log(`\nAVISOS (${warnings.length}):`);
  warnings.forEach((w) => line('!', w));
}
if (ok.length) {
  console.log(`\nLISTO (${ok.length}):`);
  ok.forEach((o) => line('✓', o));
}
console.log('');

if (blockers.length === 0) {
  console.log('Sin bloqueantes.');
  process.exit(0);
}

if (vercelMode) {
  // Despliegue de demostración explícito: se publica para revisar el diseño, con el formulario
  // desactivado en el navegador y en el servidor. No es el lanzamiento y no exime de los bloqueantes.
  if (env.SITE_MODE === 'demo') {
    console.log('SITE_MODE=demo: despliegue de DEMOSTRACIÓN (formulario desactivado, noindex). Se continúa.');
    console.log('Para el lanzamiento real, eliminar SITE_MODE y resolver los bloqueantes.');
    process.exit(0);
  }
  if (production && env.RELEASE_CHECK !== 'warn') {
    console.error('Build de PRODUCCIÓN detenido: el sitio no está listo para recibir prospectos reales.');
    console.error('Resuelve los bloqueantes o, como decisión explícita, define RELEASE_CHECK=warn en Vercel.');
    process.exit(1);
  }
  console.log(production ? 'RELEASE_CHECK=warn: se continúa por decisión explícita.' : 'Despliegue que no es de producción: se continúa.');
  process.exit(0);
}
process.exit(1);
