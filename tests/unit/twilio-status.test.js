import { describe, expect, it } from 'vitest';
import { createTwilioStatusHandler } from '../../backend/twilio-status-handler.js';
import { expectedTwilioSignature } from '../../backend/twilio-signature.js';
import { createMemoryStore } from '../../backend/store/memory.js';
import { NOTIFY_RANK } from '../../backend/leads-service.js';

const ACCOUNT = `AC${'b'.repeat(32)}`;
const TOKEN = 'auth-token-0123456789abcdef0123456';
const env = {
  TWILIO_AUTH_TOKEN: TOKEN,
  TWILIO_ACCOUNT_SID: ACCOUNT,
  UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 't',
  SITE_URL: 'https://example.com',
};
const SID = `SM${'a'.repeat(32)}`;

async function seed(store, id = 'LB-ABCDEFGH', extra = {}) {
  await store.createLead(`lead:${id}`, { id, notify: 'accepted', notifyRank: NOTIFY_RANK.accepted, notifySid: SID, ...extra }, 3600);
}

function callback(params, { lead = 'LB-ABCDEFGH', token = TOKEN, replay, signature } = {}) {
  const url = `https://example.com/api/twilio-status?lead=${lead}`;
  const body = new URLSearchParams(params).toString();
  const sig = signature ?? expectedTwilioSignature(token, url, Object.fromEntries(new URLSearchParams(body)));
  const headers = { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sig };
  if (replay) headers['i-twilio-idempotency-token'] = replay;
  return new Request(url, { method: 'POST', headers, body });
}

const base = { AccountSid: ACCOUNT, MessageSid: SID };

describe('POST /api/twilio-status', () => {
  it('actualiza el estado con firma válida y solo hacia adelante', async () => {
    const store = createMemoryStore();
    await seed(store);
    const handle = createTwilioStatusHandler({ env, store });
    expect((await handle(callback({ ...base, MessageStatus: 'delivered' }))).status).toBe(200);
    expect((await store.hgetall('lead:LB-ABCDEFGH')).notify).toBe('delivered');
    // Llega tarde un "sent": no retrocede.
    await handle(callback({ ...base, MessageStatus: 'sent' }));
    expect((await store.hgetall('lead:LB-ABCDEFGH')).notify).toBe('delivered');
    await handle(callback({ ...base, MessageStatus: 'read' }));
    expect((await store.hgetall('lead:LB-ABCDEFGH')).notify).toBe('read');
  });

  it('registra fallos de entrega con su código', async () => {
    const store = createMemoryStore();
    await seed(store);
    const handle = createTwilioStatusHandler({ env, store });
    await handle(callback({ ...base, MessageStatus: 'undelivered', ErrorCode: '63024' }));
    const record = await store.hgetall('lead:LB-ABCDEFGH');
    expect(record.notify).toBe('undelivered');
    expect(record.notifyError).toBe('63024');
  });

  it('rechaza firmas inválidas o de otra cuenta', async () => {
    const store = createMemoryStore();
    await seed(store);
    const handle = createTwilioStatusHandler({ env, store });
    expect((await handle(callback({ ...base, MessageStatus: 'failed' }, { signature: 'falsa' }))).status).toBe(403);
    expect((await handle(callback({ ...base, MessageStatus: 'failed' }, { token: 'otro-token-000000000000000000000' }))).status).toBe(403);
    expect((await handle(callback({ ...base, AccountSid: `AC${'c'.repeat(32)}`, MessageStatus: 'failed' }))).status).toBe(403);
    expect((await store.hgetall('lead:LB-ABCDEFGH')).notify).toBe('accepted');
  });

  it('ignora repeticiones del mismo webhook (I-Twilio-Idempotency-Token)', async () => {
    const store = createMemoryStore();
    await seed(store, 'LB-ABCDEFGH', { notifyRank: 0, notify: 'uncertain', notifySid: '' });
    const handle = createTwilioStatusHandler({ env, store });
    await handle(callback({ ...base, MessageStatus: 'sent' }, { replay: 'tok-1' }));
    await store.updateNotify('lead:LB-ABCDEFGH', 0, { notify: 'marcador' }, { force: true });
    await handle(callback({ ...base, MessageStatus: 'sent' }, { replay: 'tok-1' }));
    expect((await store.hgetall('lead:LB-ABCDEFGH')).notify).toBe('marcador');
  });

  it('ignora callbacks de un mensaje anterior (SID distinto)', async () => {
    const store = createMemoryStore();
    await seed(store);
    const handle = createTwilioStatusHandler({ env, store });
    await handle(callback({ AccountSid: ACCOUNT, MessageSid: `SM${'f'.repeat(32)}`, MessageStatus: 'failed' }));
    expect((await store.hgetall('lead:LB-ABCDEFGH')).notify).toBe('accepted');
  });

  it('sin configuración → 503; método o tipo incorrecto → 405/415', async () => {
    const handle = createTwilioStatusHandler({ env: {}, store: createMemoryStore() });
    expect((await handle(callback({ ...base, MessageStatus: 'sent' }))).status).toBe(503);
    const ok = createTwilioStatusHandler({ env, store: createMemoryStore() });
    expect((await ok(new Request('https://example.com/api/twilio-status', { method: 'GET' }))).status).toBe(405);
    const wrongType = new Request('https://example.com/api/twilio-status?lead=LB-ABCDEFGH', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect((await ok(wrongType)).status).toBe(415);
  });
});
