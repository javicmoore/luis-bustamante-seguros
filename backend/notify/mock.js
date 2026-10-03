// Proveedor simulado y EXPLÍCITO para desarrollo/pruebas. No envía nada.
// Las respuestas llevan demo: true y la interfaz lo indica como demostración.
// config.js impide activarlo en producción.
import { randomBytes } from 'node:crypto';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createMockNotifier({ outcome = 'accepted', delayMs = 450 } = {}) {
  return {
    name: 'mock',
    demo: true,
    async send({ variables }) {
      // Sin datos personales en el log: solo cuántas variables se habrían enviado.
      console.log(JSON.stringify({ event: 'mock_notification', variables: Object.keys(variables).length, outcome }));
      await sleep(outcome === 'slow' ? 4000 : delayMs);
      if (outcome === 'failed') return { outcome: 'failed', reason: 'mock_failed', code: 63016 };
      if (outcome === 'uncertain') return { outcome: 'uncertain', reason: 'mock_timeout' };
      return { outcome: 'accepted', sid: `SM${randomBytes(16).toString('hex')}`, providerStatus: 'queued' };
    },
  };
}
