import { describe, expect, it } from 'vitest';
import { isAllowedOrigin, resolveLeadConfig } from '../../backend/config.js';

describe('orígenes permitidos', () => {
  it('fuera de producción: localhost y red privada (pruebas desde el teléfono)', () => {
    expect(isAllowedOrigin('http://localhost:5173', {})).toBe(true);
    expect(isAllowedOrigin('http://192.168.1.20:4173', {})).toBe(true);
    expect(isAllowedOrigin('http://10.0.0.5:4173', {})).toBe(true);
    expect(isAllowedOrigin('http://172.32.1.1:4173', {})).toBe(false);
    expect(isAllowedOrigin('http://8.8.8.8', {})).toBe(false);
  });

  it('en producción solo el dominio configurado y las URLs de Vercel', () => {
    const env = { VERCEL_ENV: 'production', SITE_URL: 'https://luis.example', VERCEL_URL: 'luis-abc.vercel.app' };
    expect(isAllowedOrigin('https://luis.example', env)).toBe(true);
    expect(isAllowedOrigin('https://luis-abc.vercel.app', env)).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', env)).toBe(false);
    expect(isAllowedOrigin('http://192.168.1.20:4173', env)).toBe(false);
    expect(isAllowedOrigin('https://evil.example', env)).toBe(false);
    expect(isAllowedOrigin('null', env)).toBe(false);
    expect(isAllowedOrigin(null, env)).toBe(false);
  });
});

describe('configuración del proveedor', () => {
  const twilioEnv = {
    LEAD_PROVIDER: 'twilio',
    TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`,
    TWILIO_API_KEY: `SK${'b'.repeat(32)}`,
    TWILIO_API_SECRET: 'secret',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155550100',
    TWILIO_CONTENT_SID: `HX${'c'.repeat(32)}`,
    LEAD_NOTIFICATION_TO: '+526860000000',
    UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 't',
    LEAD_HASH_SECRET: 'x'.repeat(40),
  };

  it('configuración completa es válida y normaliza el prefijo whatsapp:', () => {
    const config = resolveLeadConfig(twilioEnv);
    expect(config.ok).toBe(true);
    expect(config.twilio.from).toBe('+14155550100');
  });

  it('reporta problemas por nombre de variable, nunca por valor', () => {
    const config = resolveLeadConfig({ ...twilioEnv, TWILIO_API_SECRET: '', TWILIO_CONTENT_SID: 'mal' });
    expect(config.ok).toBe(false);
    expect(config.problems.join(' ')).toMatch(/TWILIO_API_SECRET/);
    expect(config.problems.join(' ')).toMatch(/TWILIO_CONTENT_SID/);
    expect(config.problems.join(' ')).not.toMatch(/secret|mal/);
  });

  it('acepta los nombres de la integración de Vercel (KV_REST_API_*)', () => {
    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, ...rest } = twilioEnv;
    void UPSTASH_REDIS_REST_URL;
    void UPSTASH_REDIS_REST_TOKEN;
    const config = resolveLeadConfig({ ...rest, KV_REST_API_URL: 'https://y.upstash.io', KV_REST_API_TOKEN: 'k' });
    expect(config.ok).toBe(true);
    expect(config.store.url).toBe('https://y.upstash.io');
  });

  it('sin Auth Token no se solicita callback de estado', () => {
    expect(resolveLeadConfig(twilioEnv).statusCallbacks).toBe(false);
    expect(resolveLeadConfig({ ...twilioEnv, TWILIO_AUTH_TOKEN: 'tok' }).statusCallbacks).toBe(true);
  });
});
