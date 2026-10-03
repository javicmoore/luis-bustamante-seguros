// Comprueba que el HTML prerenderizado hidrata sin diferencias, con React en modo desarrollo
// (mensajes completos). Genera un build temporal en .qa-hydration/ y lo borra al terminar.
// Uso: node scripts/qa/hydration.mjs
import { build } from 'vite';
import { createServer } from 'node:http';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';

process.env.NODE_ENV = 'development';
const root = resolve('.qa-hydration');
const outDir = resolve(root, 'client');
const ssrDir = resolve(root, 'ssr');
const define = { 'process.env.NODE_ENV': '"development"' };

await build({ mode: 'production', logLevel: 'warn', define, build: { outDir, minify: false, emptyOutDir: true } });
await build({ mode: 'production', logLevel: 'warn', define, build: { ssr: 'src/entry-server.jsx', outDir: ssrDir, emptyOutDir: true } });
const { render } = await import(pathToFileURL(resolve(ssrDir, 'entry-server.js')).href);
for (const [page, file] of [
  ['home', 'index.html'],
  ['privacy', 'aviso-de-privacidad.html'],
  ['notFound', '404.html'],
]) {
  const template = await readFile(resolve(outDir, file), 'utf8');
  const { appHtml, head } = render(page, {});
  await writeFile(resolve(outDir, file), template.replace('<!--app-html-->', appHtml).replace('<!--head-extra-->', head));
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  const file = resolve(outDir, `.${path === '/' ? '/index.html' : path}`);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(4999);

const browser = await chromium.launch();
const page = await browser.newPage();
const problems = [];
page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) problems.push(`[${msg.type()}] ${msg.text().slice(0, 600)}`);
});
page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message.slice(0, 600)}`));
for (const path of ['/', '/aviso-de-privacidad.html', '/404.html']) {
  await page.goto(`http://127.0.0.1:4999${path}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('html[data-hydrated="true"]', { state: 'attached', timeout: 15000 });
  await page.waitForTimeout(500);
}
await browser.close();
server.close();
await rm(root, { recursive: true, force: true });

if (problems.length) {
  console.log('Problemas de hidratación o consola:');
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}
console.log('Hidratación sin advertencias en landing, aviso de privacidad y 404 (React en modo desarrollo).');
