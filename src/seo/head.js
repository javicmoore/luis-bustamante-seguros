// Etiquetas de <head> que dependen del contenido o del dominio confirmado (SITE_URL).
// Sin dominio definitivo no se generan canonical, og:url ni og:image (requieren URL absoluta).
import { site } from '../content/site.js';
import { isPrivacyFinal } from '../content/privacy.js';

const PATHS = { home: '/', privacy: '/aviso-de-privacidad' };

const escapeAttr = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

export function personSchema(siteUrl) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    jobTitle: site.role,
    telephone: site.phone.e164,
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.location.city,
      addressRegion: site.location.state,
      addressCountry: 'MX',
    },
    areaServed: { '@type': 'Country', name: 'México' },
    sameAs: [site.instagram.href],
  };
  if (siteUrl) data.url = `${siteUrl}/`;
  return data;
}

/**
 * @param {'home'|'privacy'|'notFound'} page
 * @param {{ siteUrl?: string|null, socialImage?: { path: string, width: number, height: number, alt: string }|null }} options
 */
export function buildHead(page, { siteUrl = null, socialImage = null } = {}) {
  const tags = [];
  const path = PATHS[page];

  if (siteUrl && path) {
    const url = `${siteUrl}${path}`;
    tags.push(`<link rel="canonical" href="${escapeAttr(url)}" />`);
    tags.push(`<meta property="og:url" content="${escapeAttr(url)}" />`);
    if (socialImage) {
      tags.push(`<meta property="og:image" content="${escapeAttr(siteUrl + socialImage.path)}" />`);
      tags.push(`<meta property="og:image:width" content="${socialImage.width}" />`);
      tags.push(`<meta property="og:image:height" content="${socialImage.height}" />`);
      tags.push(`<meta property="og:image:alt" content="${escapeAttr(socialImage.alt)}" />`);
    }
  }

  if (page === 'home') tags.push(jsonLd(personSchema(siteUrl)));

  // El borrador del aviso no debe indexarse como si fuera definitivo.
  if (page === 'privacy' && !isPrivacyFinal()) tags.push('<meta name="robots" content="noindex, follow" />');

  return tags.join('\n    ');
}
