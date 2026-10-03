import { describe, expect, it, vi } from 'vitest';
import { createLeadsHandler } from '../../backend/leads-handler.js';
import { StoreError } from '../../backend/store/upstash.js';
import { devEnv, fakeNotifier, leadRequest, memoryStore, newKey, validLead } from './helpers.js';

const LEAD_ID = /^LB-[0-9A-HJKMNP-TV-Z]{8}$/;

function setup({ outcomes, env = devEnv(), store = memoryStore(), notifierOptions } = {}) {
  const notifier = fakeNotifier(outcomes, notifierOptions);
  const handle = createLeadsHandler({ env, store, notifier });
  return { handle, notifier, store };
}

describe('POST /api/leads — recepción correcta', () => {
  it('registra, notifica a Luis y responde 201 con folio', async () => {
    const { handle, notifier, store } = setup();
    const res = await handle(leadRequest(validLead()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, status: 'received', notification: 'accepted' });
    expect(body.id).toMatch(LEAD_ID);
    expect(body.demo).toBeUndefined();

    // Sin datos personales reflejados en la respuesta.
    const text = JSON.stringify(body);
    expect(text).not.toContain('Ana');
    expect(text).not.toContain('686');

    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');

    expect(notifier.calls).toHaveLength(1);
    const vars = notifier.calls[0].variables;
    expect(Object.keys(vars)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(vars[1]).toBe(body.id);
    expect(vars[2]).toBe('Ana López');
    expect(vars[3]).toBe('34');
    expect(vars[4]).toBe('+52 686 000 1234');
    expect(vars[5]).toBe('Sí');
    expect(vars[6]).toMatch(/hora de Mexicali/);
    for (const v of Object.values(vars)) expect(v).not.toMatch(/[\r\n\t]| {5,}/);

    const record = await store.hgetall(`lead:${body.id}`);
    expect(record).toMatchObject({ name: 'Ana López', age: '34', phone: '+526860001234', savings: 'si', notify: 'accepted' });
    expect(record.consentAt).toBeTruthy();
  });

  it('marca la respuesta como demostración cuando el proveedor es simulado', async () => {
    const { handle } = setup({ notifierOptions: { demo: true } });
    const body = await (await handle(leadRequest(validLead()))).json();
    expect(body.demo).toBe(true);
  });
});

describe('idempotencia y reintentos', () => {
  it('un reintento con la misma llave no duplica la notificación', async () => {
    const { handle, notifier } = setup();
    const key = newKey();
    const first = await (await handle(leadRequest(validLead(), { key }))).json();
    const res2 = await handle(leadRequest(validLead(), { key }));
    const second = await res2.json();
    expect(res2.status).toBe(201);
    expect(second).toMatchObject({ id: first.id, replayed: true });
    expect(notifier.calls).toHaveLength(1);
  });

  it('la misma llave con datos distintos se rechaza (422)', async () => {
    const { handle, notifier } = setup();
    const key = newKey();
    await handle(leadRequest(validLead(), { key }));
    const res = await handle(leadRequest({ ...validLead(), name: 'Otra Persona' }, { key }));
    expect(res.status).toBe(422);
    expect(notifier.calls).toHaveLength(1);
  });

  it('doble envío simultáneo: el segundo recibe 409 mientras el primero procesa', async () => {
    const { handle, notifier } = setup({ notifierOptions: { delayMs: 60 } });
    const key = newKey();
    const [a, b] = await Promise.all([
      handle(leadRequest(validLead(), { key })),
      handle(leadRequest(validLead(), { key })),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(notifier.calls).toHaveLength(1);
  });

  it('fallo del proveedor: 502 conservando el folio; el reintento reutiliza el mismo registro', async () => {
    const { handle, notifier, store } = setup({ outcomes: ['failed', 'accepted'] });
    const key = newKey();
    const res1 = await handle(leadRequest(validLead(), { key }));
    expect(res1.status).toBe(502);
    const body1 = await res1.json();
    expect(body1).toMatchObject({ ok: false, error: 'notification_failed' });
    expect((await store.hgetall(`lead:${body1.id}`)).notify).toBe('send_failed');

    const res2 = await handle(leadRequest(validLead(), { key }));
    expect(res2.status).toBe(201);
    const body2 = await res2.json();
    expect(body2.id).toBe(body1.id);
    expect(notifier.calls).toHaveLength(2);
    const record = await store.hgetall(`lead:${body1.id}`);
    expect(record.notify).toBe('accepted');
    expect(record.attempts).toBe('2');
    const leadKeys = [...store._dump().keys()].filter((k) => k.startsWith('lead:'));
    expect(leadKeys).toHaveLength(1);
  });

  it('timeout del proveedor: resultado incierto (202), sin reenviar al reintentar', async () => {
    const { handle, notifier } = setup({ outcomes: ['uncertain'] });
    const key = newKey();
    const res1 = await handle(leadRequest(validLead(), { key }));
    expect(res1.status).toBe(202);
    expect(await res1.json()).toMatchObject({ ok: true, notification: 'pending' });
    const res2 = await handle(leadRequest(validLead(), { key }));
    expect(res2.status).toBe(202);
    expect((await res2.json()).replayed).toBe(true);
    expect(notifier.calls).toHaveLength(1);
  });
});

describe('validación y manipulación de campos', () => {
  it('consentimiento ausente → 400 con el campo señalado y sin notificar', async () => {
    const { handle, notifier } = setup();
    const res = await handle(leadRequest({ ...validLead(), consent: false }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid', fields: { consent: 'required' } });
    expect(notifier.calls).toHaveLength(0);
  });

  it('destinatario/plantilla inyectados → 400 y el destino nunca sale del navegador', async () => {
    const { handle, notifier } = setup();
    for (const extra of [{ to: '+15550001111' }, { contentSid: 'HX123' }, { recipient: 'x' }]) {
      const res = await handle(leadRequest({ ...validLead(), ...extra }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('unexpected_field');
    }
    expect(notifier.calls).toHaveLength(0);
  });

  it('honeypot lleno → 400 genérico, sin éxito ficticio', async () => {
    const { handle, notifier } = setup();
    const res = await handle(leadRequest({ ...validLead(), website: 'http://spam' }));
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
    expect(notifier.calls).toHaveLength(0);
  });

  it('valores fuera de rango o de tipo incorrecto → 400', async () => {
    const { handle } = setup();
    const cases = [
      { age: '12' },
      { age: '' },
      { phone: '123' },
      { savings: 'quizá' },
      { name: '' },
      { name: 'x'.repeat(200) },
    ];
    for (const c of cases) {
      const res = await handle(leadRequest({ ...validLead(), ...c }));
      expect(res.status).toBe(400);
    }
  });

  it('JSON inválido, cuerpo excesivo, tipo de contenido y método', async () => {
    const { handle } = setup();
    expect((await handle(leadRequest(null, { raw: '{"name": ' }))).status).toBe(400);
    expect((await handle(leadRequest(null, { raw: JSON.stringify({ ...validLead(), name: 'a'.repeat(5000) }) }))).status).toBe(413);
    expect((await handle(leadRequest(validLead(), { headers: { 'content-type': 'text/plain' } }))).status).toBe(415);
    const get = await handle(leadRequest(null, { method: 'GET' }));
    expect(get.status).toBe(405);
    expect(get.headers.get('allow')).toBe('POST');
  });

  it('llave de idempotencia ausente o inválida → 400', async () => {
    const { handle } = setup();
    expect((await handle(leadRequest(validLead(), { key: '' }))).status).toBe(400);
    expect((await handle(leadRequest(validLead(), { key: 'abc' }))).status).toBe(400);
  });

  it('origen ajeno, ausente o petición cross-site → 403', async () => {
    const { handle, notifier } = setup();
    expect((await handle(leadRequest(validLead(), { headers: { origin: 'https://evil.example' } }))).status).toBe(403);
    const noOrigin = leadRequest(validLead());
    noOrigin.headers.delete('origin');
    expect((await handle(noOrigin)).status).toBe(403);
    expect((await handle(leadRequest(validLead(), { headers: { 'sec-fetch-site': 'cross-site' } }))).status).toBe(403);
    expect(notifier.calls).toHaveLength(0);
  });
});

describe('límites de uso', () => {
  it('más de 5 solicitudes nuevas por IP en 10 minutos → 429 con Retry-After', async () => {
    const { handle } = setup();
    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      const phone = `686 000 ${String(1000 + i)}`;
      const res = await handle(leadRequest({ ...validLead(), phone }, { ip: '198.51.100.20' }));
      statuses.push(res.status);
      if (res.status === 429) expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it('más de 3 solicitudes por teléfono al día (desde IPs distintas) → 429', async () => {
    const { handle } = setup();
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await handle(leadRequest(validLead(), { ip: `192.0.2.${i + 1}` }));
      statuses.push(res.status);
    }
    expect(statuses).toEqual([201, 201, 201, 429]);
  });

  it('tope global diario configurable', async () => {
    const { handle } = setup({ env: devEnv({ LEAD_DAILY_CAP: '2' }) });
    const statuses = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await handle(leadRequest({ ...validLead(), phone: `686 111 ${1000 + i}` }, { ip: `192.0.2.${50 + i}` }));
      statuses.push(res.status);
    }
    expect(statuses).toEqual([201, 201, 429]);
  });
});

describe('configuración y almacenamiento', () => {
  it('producción sin credenciales → 503 controlado (nunca éxito ficticio)', async () => {
    const notifier = fakeNotifier();
    const env = { VERCEL_ENV: 'production', SITE_URL: 'https://example.com' };
    const handle = createLeadsHandler({ env, notifier, store: memoryStore() });
    const req = leadRequest(validLead(), { headers: { origin: 'https://example.com' } });
    const res = await handle(req);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'unavailable' });
    expect(notifier.calls).toHaveLength(0);
  });

  it('el proveedor simulado está prohibido en producción', async () => {
    const env = {
      VERCEL_ENV: 'production',
      LEAD_PROVIDER: 'mock',
      SITE_URL: 'https://example.com',
      UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 't',
      LEAD_HASH_SECRET: 'x'.repeat(40),
    };
    const handle = createLeadsHandler({ env, notifier: fakeNotifier(), store: memoryStore() });
    const res = await handle(leadRequest(validLead(), { headers: { origin: 'https://example.com' } }));
    expect(res.status).toBe(503);
  });

  it('remitente igual al destinatario → configuración inválida (503)', async () => {
    const env = {
      LEAD_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`,
      TWILIO_API_KEY: `SK${'b'.repeat(32)}`,
      TWILIO_API_SECRET: 'secret',
      TWILIO_WHATSAPP_FROM: '+5216860000000',
      TWILIO_CONTENT_SID: `HX${'c'.repeat(32)}`,
      LEAD_NOTIFICATION_TO: 'whatsapp:+5216860000000',
      UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 't',
      LEAD_HASH_SECRET: 'x'.repeat(40),
    };
    const handle = createLeadsHandler({ env, notifier: fakeNotifier(), store: memoryStore() });
    expect((await handle(leadRequest(validLead()))).status).toBe(503);
  });

  it('almacenamiento caído → 503 y no se notifica', async () => {
    const store = memoryStore();
    store.incrMany = vi.fn().mockRejectedValue(new StoreError('store_timeout'));
    const { handle, notifier } = setup({ store });
    const res = await handle(leadRequest(validLead()));
    expect(res.status).toBe(503);
    expect(notifier.calls).toHaveLength(0);
  });

  it('fallo del almacenamiento al crear el registro → 503 sin notificar', async () => {
    const store = memoryStore();
    store.createLead = vi.fn().mockRejectedValue(new StoreError('store_http_500'));
    const { handle, notifier } = setup({ store });
    const res = await handle(leadRequest(validLead()));
    expect(res.status).toBe(503);
    expect(notifier.calls).toHaveLength(0);
  });

  it('los registros del servidor no contienen datos personales', async () => {
    const logs = [];
    vi.spyOn(console, 'log').mockImplementation((line) => logs.push(String(line)));
    const { handle } = setup({ outcomes: ['failed'] });
    await handle(leadRequest(validLead()));
    await handle(leadRequest({ ...validLead(), to: '+1555' }));
    const all = logs.join('\n');
    expect(all).not.toMatch(/Ana|López|686|0001234|203\.0\.113/);
    expect(all).toMatch(/lead_notification/);
  });
});
