// Inserta el HTML prerenderizado en dist/, genera robots.txt y (con dominio) sitemap.xml.
// Uso: se ejecuta al final de `npm run build`.
import { readFile, writeFile, rm, access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const ssrDir = resolve(root, '.ssr-build');

function normalizeSiteUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') throw new Error('SITE_URL debe usar https');
    return url.origin;
  } catch (error) {
    console.warn(`[prerender] SITE_URL ignorada: ${error.message}`);
    return null;
  }
}

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

// SITE_MODE=demo: versión de revisión; no debe indexarse ni anunciar sitemap/canonical.
const demo = process.env.SITE_MODE === 'demo';
const siteUrl = demo ? null : normalizeSiteUrl(process.env.SITE_URL);
const socialImagePath = '/og/og-default.png';
const socialImage = (await exists(resolve(dist, socialImagePath.slice(1))))
  ? {
      path: socialImagePath,
      width: 1200,
      height: 630,
      alt: 'Luis Bustamante · Seguros y planeación patrimonial · Mexicali y todo México',
    }
  : null;

const entry = (await exists(resolve(ssrDir, 'entry-server.js')))
  ? resolve(ssrDir, 'entry-server.js')
  : resolve(ssrDir, 'entry-server.mjs');
const { render } = await import(pathToFileURL(entry).href);

const pages = [
  { page: 'home', file: 'index.html' },
  { page: 'privacy', file: 'aviso-de-privacidad.html' },
  { page: 'notFound', file: '404.html' },
];

const indexable = new Set();
for (const { page, file } of pages) {
  const target = resolve(dist, file);
  const template = await readFile(target, 'utf8');
  if (!template.includes('<!--app-html-->')) throw new Error(`[prerender] ${file} no tiene <!--app-html-->`);
  const { appHtml, head } = render(page, { siteUrl, socialImage });

  // La CSP de producción no permite estilos inline: el HTML no debe contener atributos style.
  if (/\sstyle="/i.test(appHtml)) throw new Error(`[prerender] ${file} contiene atributos style inline`);

  let html = template.replace('<!--app-html-->', appHtml).replace('<!--head-extra-->', head);
  if (demo && !/name="robots"/.test(html)) {
    html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow" />\n  </head>');
  }
  if (!/name="robots" content="noindex/.test(html)) indexable.add(page);
  await writeFile(target, html);
  console.log(`[prerender] ${file} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
}

const robots = demo ? ['User-agent: *', 'Disallow: /'] : ['User-agent: *', 'Allow: /', 'Disallow: /api/'];
if (demo) console.log('[prerender] SITE_MODE=demo: noindex en todas las páginas y robots.txt con Disallow: /');
if (siteUrl) robots.push('', `Sitemap: ${siteUrl}/sitemap.xml`);
await writeFile(resolve(dist, 'robots.txt'), `${robots.join('\n')}\n`);

if (siteUrl) {
  // Solo páginas indexables (el aviso en borrador lleva noindex y queda fuera).
  const urls = [['home', '/'], ['privacy', '/aviso-de-privacidad']]
    .filter(([page]) => indexable.has(page))
    .map(([, path]) => `  <url><loc>${siteUrl}${path}</loc></url>`)
    .join(`
`);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  await writeFile(resolve(dist, 'sitemap.xml'), sitemap);
  console.log('[prerender] sitemap.xml generado');
} else {
  console.log('[prerender] Sin SITE_URL: no se generan canonical, og:url, og:image ni sitemap.');
}

await rm(ssrDir, { recursive: true, force: true });
