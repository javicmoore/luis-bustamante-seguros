// Paridad local con Vercel para `vite` (dev) y `vite preview` (build de producción):
//  - /aviso-de-privacidad se sirve sin extensión (como cleanUrls en Vercel).
//  - En preview se aplican los headers declarados en vercel.json y el 404.html.
// Solo se usa en local; en Vercel las rutas y los headers los resuelve la plataforma.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const CLEAN_ROUTES = { '/aviso-de-privacidad': '/aviso-de-privacidad.html' };

function loadVercelHeaders() {
  try {
    const config = JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf8'));
    return (config.headers || []).map((rule) => ({
      pattern: new RegExp(`^${rule.source}$`),
      headers: rule.headers,
    }));
  } catch {
    return [];
  }
}

function applyHeaders(rules, pathname, res) {
  // Este servidor local sirve por HTTP: upgrade-insecure-requests forzaría HTTPS (Safari/WebKit lo
  // aplica incluso en 127.0.0.1) y nada cargaría. Solo se omite aquí; en Vercel se mantiene.
  for (const rule of rules) {
    if (rule.pattern.test(pathname)) {
      for (const { key, value } of rule.headers) {
        const finalValue =
          key === 'Content-Security-Policy' ? value.replace(/;\s*upgrade-insecure-requests/, '') : value;
        res.setHeader(key, finalValue);
      }
    }
  }
}

export function localServer() {
  return {
    name: 'lb-local-server',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (CLEAN_ROUTES[url.pathname]) req.url = CLEAN_ROUTES[url.pathname] + url.search;
        next();
      });
    },

    configurePreviewServer(server) {
      const rules = loadVercelHeaders();
      const distDir = resolve(ROOT, server.config.build.outDir || 'dist');
      const notFoundFile = resolve(distDir, '404.html');

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        applyHeaders(rules, url.pathname, res);
        if (CLEAN_ROUTES[url.pathname]) req.url = CLEAN_ROUTES[url.pathname] + url.search;
        next();
      });

      // Después de los estáticos y del fallback HTML de Vite (que solo reescribe la URL):
      // si no corresponde a una página existente, responde 404.html con estado 404.
      return () => {
        server.middlewares.use((req, res, next) => {
          const { pathname } = new URL(req.url, 'http://localhost');
          const file = resolve(distDir, `.${decodeURIComponent(pathname)}`);
          if (pathname.endsWith('.html') && file.startsWith(distDir) && existsSync(file)) return next();
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(existsSync(notFoundFile) ? readFileSync(notFoundFile) : 'No encontrado');
        });
      };
    },
  };
}
