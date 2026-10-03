import { createMemoryStore } from '../../backend/store/memory.js';

export const ORIGIN = 'http://localhost:5173';

export const validLead = () => ({
  name: 'Ana López',
  age: '34',
  phone: '686 000 1234',
  savings: 'si',
  consent: true,
  website: '',
});

let keyCounter = 0;
export function newKey() {
  keyCounter += 1;
  return `00000000-0000-4000-8000-${String(keyCounter).padStart(12, '0')}`;
}

export function leadRequest(body, { key = newKey(), headers = {}, method = 'POST', ip = '203.0.113.7', raw } = {}) {
  return new Request('http://localhost:5173/api/leads', {
    method,
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'sec-fetch-site': 'same-origin',
      'idempotency-key': key,
      'x-real-ip': ip,
      ...headers,
    },
    body: method === 'GET' || method === 'HEAD' ? undefined : raw ?? JSON.stringify(body),
  });
}

/** Notificador falso que registra llamadas y devuelve resultados programados. */
export function fakeNotifier(outcomes = ['accepted'], { demo = false, delayMs = 0 } = {}) {
  const calls = [];
  let i = 0;
  return {
    name: 'fake',
    demo,
    calls,
    async send(args) {
      calls.push(args);
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      const outcome = outcomes[Math.min(i, outcomes.length - 1)];
      i += 1;
      if (outcome === 'accepted') return { outcome, sid: `SM${String(i).padStart(32, '0')}`, providerStatus: 'queued' };
      if (outcome === 'failed') return { outcome, reason: 'http_400', code: 63016 };
      return { outcome: 'uncertain', reason: 'timeout' };
    },
  };
}

export const devEnv = (extra = {}) => ({ LEAD_PROVIDER: 'mock', ...extra });

export function memoryStore() {
  return createMemoryStore();
}
