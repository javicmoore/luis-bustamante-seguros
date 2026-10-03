import { defineConfig } from '@playwright/test';

// E2E contra el build de producción servido en modo demostración (sin envíos reales)
// y, para los bloques que solo existen en desarrollo, contra el servidor de Vite.
// Uso: npm run build && npm run test:e2e
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    locale: 'es-MX',
    trace: 'off',
  },
  webServer: [
    {
      command: 'node scripts/preview-demo.mjs --port 4173',
      url: 'http://127.0.0.1:4173/',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npx vite --port 5173 --strictPort --host 127.0.0.1',
      url: 'http://127.0.0.1:5173/',
      reuseExistingServer: true,
      timeout: 60_000,
      env: { LEAD_PROVIDER: 'mock' },
    },
  ],
});
