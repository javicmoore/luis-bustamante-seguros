import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { localServer } from './scripts/vite/local-server.js';

export default defineConfig(({ mode }) => {
  // Variables sin prefijo VITE_ quedan solo del lado del servidor local (/api).
  // Nunca se exponen al bundle del navegador.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('VITE_') && process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), localServer()],
    appType: 'mpa',
    define: {
      // Mismo valor en el build del cliente y en el prerender (evita diferencias al hidratar).
      'import.meta.env.VITE_BUILD_YEAR': JSON.stringify(String(new Date().getFullYear())),
      // SITE_MODE=demo: despliegue de revisión. El formulario no envía nada y se avisa en pantalla.
      'import.meta.env.VITE_SITE_DEMO': JSON.stringify(process.env.SITE_MODE === 'demo' ? 'true' : 'false'),
    },
    build: {
      // Sin data: URIs para mantener una CSP estricta (img-src 'self').
      assetsInlineLimit: 0,
      // Un solo CSS compartido por las tres páginas (menos peticiones bloqueantes).
      cssCodeSplit: false,
      sourcemap: false,
      rolldownOptions: {
        input: {
          main: 'index.html',
          privacy: 'aviso-de-privacidad.html',
          notFound: '404.html',
        },
      },
    },
    server: { port: 5173 },
    preview: { port: 4173 },
  };
});
