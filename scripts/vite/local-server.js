// Paridad local con Vercel para `vite` (dev) y `vite preview` (build de producción):
//  - /api/<nombre> ejecuta api/<nombre>.js con la firma Web estándar (fetch).
//  - /aviso-de-privacidad se sirve sin extensión (como cleanUrls en Vercel).
//  - En preview se aplican los headers declarados en vercel.json y el 404.html.
// Solo se usa en local; en Vercel las funciones y headers los resuelve la plataforma.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const API_ROUTES = new Set(['leads', 'twilio-status']);
const CLEAN_ROUTES = { '/aviso-de-privacidad': '/aviso-de-privacidad.html' };
const MAX_LOCAL_BODY = 64 * 1024;

function apiFileFor(pathname) {
  const match = /^\/api\/([a-z-]+)\/?$/.exec(pathname);
  if (!match || !API_ROUTES.has(match[1])) return null;
  const file = resolve(ROOT, 'api', `${match[1]}.js`);
  return existsSync(file) ? file : null;
}

async function toWebRequest(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_LOCAL_BODY) break;
    chunks.push(chunk);
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value != null) headers.set(key, value);
  }
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  return new Request(new URL(req.url, `http://${req.headers.host || 'localhost'}`), {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
    duplex: 'half',
  });
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function runApi(mod, req, res) {
  const handler = mod.default?.fetch ?? mod[req.method];
  if (typeof handler !== 'function') {
    res.statusCode = 405;
    res.end();
    return;
  }
  const response = await handler(await toWebRequest(req));
  await sendWebResponse(res, response);
}

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

function applyHeaders(rules, pathname, res, host = '') {
  // En la red local (http://192.168…) upgrade-insecure-requests forzaría HTTPS y rompería la
  // carga; solo se omite en este servidor local. En Vercel la directiva se mantiene.
  const lan = !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  for (const rule of rules) {
    if (rule.pattern.test(pathname)) {
      for (const { key, value } of rule.headers) {
        const finalValue =
          lan && key === 'Content-Security-Policy' ? value.replace(/;\s*upgrade-insecure-requests/, '') : value;
        res.setHeader(key, finalValue);
      }
    }
  }
}

export function localServer() {
  return {
    name: 'lb-local-server',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (CLEAN_ROUTES[url.pathname]) {
          req.url = CLEAN_ROUTES[url.pathname] + url.search;
          return next();
        }
        const file = apiFileFor(url.pathname);
        if (!file) return next();
        try {
          const mod = await server.ssrLoadModule(file);
          await runApi(mod, req, res);
        } catch (error) {
          server.config.logger.error(`[api] ${error?.message || error}`);
          res.statusCode = 500;
          res.end();
        }
      });
    },

    configurePreviewServer(server) {
      const rules = loadVercelHeaders();
      const distDir = resolve(ROOT, server.config.build.outDir || 'dist');
      const notFoundFile = resolve(distDir, '404.html');

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        applyHeaders(rules, url.pathname, res, req.headers.host);
        if (CLEAN_ROUTES[url.pathname]) req.url = CLEAN_ROUTES[url.pathname] + url.search;
        const file = apiFileFor(url.pathname);
        if (!file) return next();
        try {
          const mod = await import(pathToFileURL(file).href);
          await runApi(mod, req, res);
        } catch (error) {
          server.config.logger.error(`[api] ${error?.message || error}`);
          res.statusCode = 500;
          res.end();
        }
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
