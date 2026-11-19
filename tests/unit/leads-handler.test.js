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
    expect(Object.keys(vars)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(vars[1]).toBe(body.id);
    expect(vars[2]).toBe('Ana López');
    expect(vars[3]).toBe('34');
    expect(vars[4]).toBe('Teléfono (llamada o WhatsApp)');
    expect(vars[5]).toBe('+52 686 000 1234');
    expect(vars[6]).toBe('De $30,000 a menos de $50,000 MXN');
    expect(vars[7]).toMatch(/hora de Mexicali/);
    for (const v of Object.values(vars)) expect(v).not.toMatch(/[\r\n\t]| {5,}/);

    const record = await store.hgetall(`lead:${body.id}`);
    expect(record).toMatchObject({
      name: 'Ana López',
      age: '34',
      contactMethod: 'phone',
      phone: '+526860001234',
      email: '',
      income: '30_50',
      notify: 'accepted',
    });
    expect(record).not.toHaveProperty('interestType');
    expect(record).not.toHaveProperty('interest');
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

  it('campos de interés ya retirados → 400 sin notificar', async () => {
    const { handle, notifier } = setup();
    for (const extra of [{ interestType: 'seguro' }, { interest: 'gmm' }]) {
      const res = await handle(leadRequest({ ...validLead(), ...extra }));
      expect(res.status).toBe(400);
    }
    expect(notifier.calls).toHaveLength(0);
  });

  it('por correo: 201 con el correo en el aviso y sin teléfono', async () => {
    const { handle, notifier, store } = setup();
    const lead = { ...validLead(), contactMethod: 'email', email: 'Ana@Ejemplo.com', phone: undefined, phoneCountry: undefined };
    const res = await handle(leadRequest(lead));
    expect(res.status).toBe(201);
    const body = await res.json();
    const vars = notifier.calls[0].variables;
    expect(vars[4]).toBe('Correo electrónico');
    expect(vars[5]).toBe('Ana@ejemplo.com');
    const record = await store.hgetall(`lead:${body.id}`);
    expect(record).toMatchObject({ contactMethod: 'email', email: 'Ana@ejemplo.com', phone: '' });
  });

  it('teléfono extranjero: E.164 completo en el aviso', async () => {
    const { handle, notifier } = setup();
    const res = await handle(leadRequest({ ...validLead(), phoneCountry: 'ES', phone: '612 345 678' }));
    expect(res.status).toBe(201);
    expect(notifier.calls[0].variables[5]).toBe('+34 612 34 56 78');
  });

  it('dato oculto del otro medio → 400 sin notificar', async () => {
    const { handle, notifier } = setup();
    const res = await handle(leadRequest({ ...validLead(), contactMethod: 'email', email: 'ana@ejemplo.com' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ fields: { phone: 'not_allowed' } });
    expect(notifier.calls).toHaveLength(0);
  });

  it('valores fuera de rango o de tipo incorrecto → 400', async () => {
    const { handle } = setup();
    const cases = [
      { age: '12' },
      { age: '' },
      { phone: '123' },
      { income: 'quizá' },
      { contactMethod: 'carta' },
      { phoneCountry: 'ZZ' },
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

describe('cupo diario: solo las solicitudes admitidas lo consumen', () => {
  // Contadores de una regla (p. ej. 'rl:all:') en el almacenamiento de prueba.
  const counters = (store, prefix) =>
    [...store._dump()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => Number(v.value));
  const total = (store, prefix) => counters(store, prefix).reduce((a, b) => a + b, 0);
  const leadFor = (i) => ({ ...validLead(), phone: `686 222 ${String(1000 + i)}` });

  it('un rechazo por límite de IP no consume el cupo global', async () => {
    const { handle, store } = setup({ env: devEnv({ LEAD_DAILY_CAP: '50' }) });
    const statuses = [];
    for (let i = 0; i < 8; i += 1) statuses.push((await handle(leadRequest(leadFor(i), { ip: '198.51.100.30' }))).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429, 429, 429]);
    expect(total(store, 'rl:all:')).toBe(5);
    expect(total(store, 'rl:ip:')).toBe(5);
    expect(total(store, 'rl:ipd:')).toBe(5);
  });

  it('un rechazo por límite de contacto no consume el cupo global ni el de la IP', async () => {
    const { handle, store } = setup();
    const statuses = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await handle(leadRequest(validLead(), { ip: `192.0.2.${i + 10}` }))).status);
    expect(statuses).toEqual([201, 201, 201, 429, 429, 429]);
    expect(total(store, 'rl:all:')).toBe(3);
    expect(total(store, 'rl:ct:')).toBe(3);
    expect(total(store, 'rl:ip:')).toBe(3);
  });

  it('con el tope global lleno, los rechazos no mueven ningún contador', async () => {
    const { handle, store } = setup({ env: devEnv({ LEAD_DAILY_CAP: '2' }) });
    for (let i = 0; i < 2; i += 1) expect((await handle(leadRequest(leadFor(i), { ip: '192.0.2.77' }))).status).toBe(201);
    // rl:req: es el límite general de peticiones por IP: cuenta todo POST a propósito.
    const before = JSON.stringify([...store._dump()].filter(([k]) => k.startsWith('rl:') && !k.startsWith('rl:req:')));
    for (let i = 2; i < 6; i += 1) expect((await handle(leadRequest(leadFor(i), { ip: '192.0.2.77' }))).status).toBe(429);
    expect(JSON.stringify([...store._dump()].filter(([k]) => k.startsWith('rl:') && !k.startsWith('rl:req:')))).toBe(before);
  });

  it('una solicitud rechazada libera su llave: reintentarla con la misma llave vuelve a evaluarla', async () => {
    const { handle, store, notifier } = setup({ env: devEnv({ LEAD_DAILY_CAP: '1' }) });
    expect((await handle(leadRequest(leadFor(0), { ip: '192.0.2.80' }))).status).toBe(201);
    const key = newKey();
    expect((await handle(leadRequest(leadFor(1), { key, ip: '192.0.2.81' }))).status).toBe(429);
    expect(store._dump().has(`idem:${key}`)).toBe(false);
    expect(total(store, 'rl:all:')).toBe(1);
    expect(notifier.calls).toHaveLength(1);
  });

  it('reintentar con la misma llave (fallo del proveedor o respuesta repetida) no consume otro lugar', async () => {
    const { handle, store, notifier } = setup({ outcomes: ['failed', 'accepted'] });
    const key = newKey();
    expect((await handle(leadRequest(validLead(), { key }))).status).toBe(502);
    expect(total(store, 'rl:all:')).toBe(1);
    expect((await handle(leadRequest(validLead(), { key }))).status).toBe(201);
    expect(total(store, 'rl:all:')).toBe(1);
    const again = await handle(leadRequest(validLead(), { key }));
    expect((await again.json()).replayed).toBe(true);
    expect(total(store, 'rl:all:')).toBe(1);
    expect(total(store, 'rl:ct:')).toBe(1);
    expect(notifier.calls).toHaveLength(2);
  });

  it('solicitudes simultáneas: nunca se admiten más que el tope y cada una consume un solo lugar', async () => {
    const { handle, store, notifier } = setup({ env: devEnv({ LEAD_DAILY_CAP: '5' }), notifierOptions: { delayMs: 5 } });
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) => handle(leadRequest(leadFor(i), { ip: `203.0.113.${100 + i}` }))),
    );
    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(15);
    expect(total(store, 'rl:all:')).toBe(5);
    expect(notifier.calls).toHaveLength(5);
  });

  it('doble envío simultáneo con la misma llave: un solo lugar', async () => {
    const { handle, store } = setup({ notifierOptions: { delayMs: 20 } });
    const key = newKey();
    const statuses = (await Promise.all(Array.from({ length: 5 }, () => handle(leadRequest(validLead(), { key }))))).map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(4);
    expect(total(store, 'rl:all:')).toBe(1);
    expect(total(store, 'rl:ct:')).toBe(1);
  });

  // Interrupción justo después de reservar: la siguiente operación del almacenamiento falla
  // (como si la función se detuviera) y el reintento llega con la misma llave pasados 60 s.
  for (const [label, crashOn] of [
    ['antes de guardar el avance', 'set'],
    ['antes de crear el registro', 'createLead'],
  ]) {
    it(`interrupción tras reservar (${label}): el reintento no cobra otro lugar ni duplica el aviso`, async () => {
      let t = Date.parse('2026-11-17T18:00:00Z');
      const store = memoryStore();
      let armed = false;
      let crashed = false;
      const crashing = {
        ...store,
        async reserve(...args) {
          const result = await store.reserve(...args);
          if (result.ok && !crashed) armed = true;
          return result;
        },
        async [crashOn](...args) {
          if (armed) {
            armed = false;
            crashed = true;
            throw new StoreError('store_timeout');
          }
          return store[crashOn](...args);
        },
      };
      const notifier = fakeNotifier();
      const handle = createLeadsHandler({ env: devEnv(), store: crashing, notifier, now: () => new Date(t) });
      const key = newKey();

      const first = await handle(leadRequest(validLead(), { key }));
      expect(first.status).toBe(503);
      expect(total(store, 'rl:all:')).toBe(1);
      expect(notifier.calls).toHaveLength(0);

      // Antes de 60 s sigue "en proceso".
      t += 30_000;
      expect((await handle(leadRequest(validLead(), { key }))).status).toBe(409);

      t += 31_000;
      const retry = await handle(leadRequest(validLead(), { key }));
      expect(retry.status).toBe(201);
      expect(total(store, 'rl:all:')).toBe(1);
      expect(total(store, 'rl:ct:')).toBe(1);
      expect(total(store, 'rl:ip:')).toBe(1);
      expect(notifier.calls).toHaveLength(1);

      // Un reintento más devuelve el mismo folio sin volver a avisar.
      const again = await (await handle(leadRequest(validLead(), { key }))).json();
      expect(again).toMatchObject({ id: (await retry.json()).id, replayed: true });
      expect(notifier.calls).toHaveLength(1);
      expect(total(store, 'rl:all:')).toBe(1);
    });
  }

  // Almacenamiento de prueba con fallos programables:
  //   reserveFails: 'applied' → la reserva se aplica pero Redis no lo confirma (timeout de respuesta)
  //                 'not_applied' → la reserva no se aplica y falla
  //   slowIdemReads: retrasa la lectura de llaves idem: para que varios reintentos lean el mismo estado.
  function faultyStore({ reserveFails, slowIdemReads = false }) {
    const store = memoryStore();
    let failed = false;
    return {
      raw: store,
      ...store,
      async get(key) {
        const value = await store.get(key);
        if (slowIdemReads && key.startsWith('idem:')) await new Promise((r) => setTimeout(r, 15));
        return value;
      },
      async reserve(...args) {
        if (reserveFails && !failed) {
          failed = true;
          if (reserveFails === 'applied') await store.reserve(...args);
          throw new StoreError('store_timeout');
        }
        return store.reserve(...args);
      },
    };
  }
  const leadRecords = (store) => [...store._dump().keys()].filter((k) => k.startsWith('lead:')).length;

  for (const reserveFails of ['applied', 'not_applied']) {
    it(`Redis no confirma la reserva (${reserveFails === 'applied' ? 'sí se aplicó' : 'no se aplicó'}): se conserva la llave y se cobra un solo lugar`, async () => {
      let t = Date.parse('2026-11-18T18:00:00Z');
      const store = faultyStore({ reserveFails });
      const notifier = fakeNotifier();
      const handle = createLeadsHandler({ env: devEnv(), store, notifier, now: () => new Date(t) });
      const key = newKey();

      expect((await handle(leadRequest(validLead(), { key }))).status).toBe(503);
      // La llave se conserva: no se sabe si el lugar quedó cobrado.
      expect(store.raw._dump().has(`idem:${key}`)).toBe(true);
      expect(total(store.raw, 'rl:all:')).toBe(reserveFails === 'applied' ? 1 : 0);
      expect((await handle(leadRequest(validLead(), { key }))).status).toBe(409);

      t += 61_000;
      const retry = await handle(leadRequest(validLead(), { key }));
      expect(retry.status).toBe(201);
      expect(total(store.raw, 'rl:all:')).toBe(1);
      expect(total(store.raw, 'rl:ct:')).toBe(1);
      expect(notifier.calls).toHaveLength(1);
      expect(leadRecords(store.raw)).toBe(1);
    });

    it(`varios reintentos simultáneos de una solicitud interrumpida (${reserveFails === 'applied' ? 'con' : 'sin'} lugar ya cobrado): uno solo la reclama`, async () => {
      let t = Date.parse('2026-11-18T18:00:00Z');
      const store = faultyStore({ reserveFails, slowIdemReads: true });
      const notifier = fakeNotifier(['accepted'], { delayMs: 10 });
      const handle = createLeadsHandler({ env: devEnv(), store, notifier, now: () => new Date(t) });
      const key = newKey();

      expect((await handle(leadRequest(validLead(), { key }))).status).toBe(503);
      t += 61_000;
      const statuses = (
        await Promise.all(Array.from({ length: 6 }, () => handle(leadRequest(validLead(), { key }))))
      ).map((r) => r.status);
      expect(statuses.filter((code) => code === 201)).toHaveLength(1);
      expect(statuses.filter((code) => code === 409)).toHaveLength(5);
      expect(total(store.raw, 'rl:all:')).toBe(1);
      expect(total(store.raw, 'rl:ct:')).toBe(1);
      expect(notifier.calls).toHaveLength(1);
      expect(leadRecords(store.raw)).toBe(1);
    });
  }

  it('varios reintentos simultáneos tras una interrupción después de reservar: un solo lugar y un solo aviso', async () => {
    let t = Date.parse('2026-11-18T18:00:00Z');
    const base = memoryStore();
    let crashNext = false;
    let crashed = false;
    const store = {
      ...base,
      async get(key) {
        const value = await base.get(key);
        if (key.startsWith('idem:')) await new Promise((r) => setTimeout(r, 15));
        return value;
      },
      async reserve(...args) {
        const result = await base.reserve(...args);
        if (result.ok && !crashed) crashNext = true;
        return result;
      },
      async createLead(...args) {
        if (crashNext) {
          crashNext = false;
          crashed = true;
          throw new StoreError('store_timeout');
        }
        return base.createLead(...args);
      },
    };
    const notifier = fakeNotifier(['accepted'], { delayMs: 10 });
    const handle = createLeadsHandler({ env: devEnv(), store, notifier, now: () => new Date(t) });
    const key = newKey();

    expect((await handle(leadRequest(validLead(), { key }))).status).toBe(503);
    t += 61_000;
    const statuses = (await Promise.all(Array.from({ length: 6 }, () => handle(leadRequest(validLead(), { key }))))).map(
      (r) => r.status,
    );
    expect(statuses.filter((code) => code === 201)).toHaveLength(1);
    expect(statuses.filter((code) => code === 409)).toHaveLength(5);
    expect(total(base, 'rl:all:')).toBe(1);
    expect(notifier.calls).toHaveLength(1);
    expect(leadRecords(base)).toBe(1);
  });

  it('simultáneas desde una misma IP: el límite de 5 por 10 minutos se mantiene sin gastar el global', async () => {
    const { handle, store } = setup({ notifierOptions: { delayMs: 5 } });
    const statuses = (
      await Promise.all(Array.from({ length: 12 }, (_, i) => handle(leadRequest(leadFor(i), { ip: '198.51.100.99' }))))
    ).map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(total(store, 'rl:all:')).toBe(5);
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

describe('modo de demostración (SITE_MODE=demo)', () => {
  it('el endpoint no procesa, no guarda y no notifica', async () => {
    const store = memoryStore();
    const notifier = fakeNotifier();
    const handle = createLeadsHandler({ env: devEnv({ SITE_MODE: 'demo' }), store, notifier });
    const res = await handle(leadRequest(validLead()));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'demo' });
    expect(notifier.calls).toHaveLength(0);
    expect(store._dump().size).toBe(0);
  });
});
