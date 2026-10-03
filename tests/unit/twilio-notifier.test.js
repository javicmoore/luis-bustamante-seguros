import { describe, expect, it, vi } from 'vitest';
import { createTwilioWhatsAppNotifier } from '../../backend/notify/twilio-whatsapp.js';

const cfg = {
  accountSid: `AC${'1'.repeat(32)}`,
  apiKey: `SK${'2'.repeat(32)}`,
  apiSecret: 'api-secret',
  from: '+14155550100',
  to: '+526860000000',
  contentSid: `HX${'3'.repeat(32)}`,
};
const variables = { 1: 'LB-ABCDEFGH', 2: 'Ana López', 3: '34', 4: '+52 686 000 1234', 5: 'Sí', 6: '2 oct 2026' };

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('adaptador Twilio WhatsApp', () => {
  it('envía la plantilla aprobada al destinatario configurado (no al prospecto)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { sid: `SM${'a'.repeat(32)}`, status: 'queued' }));
    const notifier = createTwilioWhatsAppNotifier(cfg, { fetchImpl });
    const result = await notifier.send({ variables, statusCallbackUrl: 'https://example.com/api/twilio-status?lead=LB-ABCDEFGH' });

    expect(result).toEqual({ outcome: 'accepted', sid: `SM${'a'.repeat(32)}`, providerStatus: 'queued' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString('base64')}`);
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    const params = new URLSearchParams(init.body.toString());
    expect(params.get('To')).toBe('whatsapp:+526860000000');
    expect(params.get('From')).toBe('whatsapp:+14155550100');
    expect(params.get('ContentSid')).toBe(cfg.contentSid);
    expect(JSON.parse(params.get('ContentVariables'))).toEqual(variables);
    expect(params.get('StatusCallback')).toBe('https://example.com/api/twilio-status?lead=LB-ABCDEFGH');
    expect(params.has('Body')).toBe(false);
  });

  it('4xx del proveedor → fallo definitivo con código', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(400, { code: 63016, message: 'detalle interno' }));
    const result = await createTwilioWhatsAppNotifier(cfg, { fetchImpl }).send({ variables });
    expect(result).toEqual({ outcome: 'failed', reason: 'http_400', code: 63016 });
  });

  it('5xx del proveedor → resultado incierto (no se reintenta a ciegas)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    const result = await createTwilioWhatsAppNotifier(cfg, { fetchImpl }).send({ variables });
    expect(result.outcome).toBe('uncertain');
  });

  it('timeout → incierto', async () => {
    const fetchImpl = vi.fn((url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const result = await createTwilioWhatsAppNotifier(cfg, { fetchImpl, timeoutMs: 20 }).send({ variables });
    expect(result).toEqual({ outcome: 'uncertain', reason: 'timeout' });
  });

  it('error de conexión antes de enviar → fallo; error a mitad → incierto', async () => {
    const dns = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    const reset = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } });
    const a = await createTwilioWhatsAppNotifier(cfg, { fetchImpl: vi.fn().mockRejectedValue(dns) }).send({ variables });
    const b = await createTwilioWhatsAppNotifier(cfg, { fetchImpl: vi.fn().mockRejectedValue(reset) }).send({ variables });
    expect(a.outcome).toBe('failed');
    expect(b.outcome).toBe('uncertain');
  });

  it('201 sin SID válido → incierto', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { status: 'queued' }));
    const result = await createTwilioWhatsAppNotifier(cfg, { fetchImpl }).send({ variables });
    expect(result.outcome).toBe('uncertain');
  });
});
