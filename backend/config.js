// Configuración del servidor. Solo lee variables privadas (sin prefijo VITE_).
// Nunca devuelve valores secretos en mensajes: los problemas citan nombres de variables.

const E164 = /^\+[1-9]\d{7,14}$/;
const LOCAL_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d{2,5})?$/;
const DEV_HASH_SECRET = 'solo-desarrollo-no-usar-en-produccion-0000000000';

function clampInt(raw, fallback, min, max) {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function stripWhatsAppPrefix(value) {
  return String(value || '').trim().replace(/^whatsapp:/i, '');
}

function httpsOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isProductionEnv(env = process.env) {
  return env.VERCEL_ENV === 'production';
}

/**
 * Resuelve la configuración del endpoint de solicitudes.
 * @returns {{ ok: boolean, problems: string[], [key: string]: any }}
 */
export function resolveLeadConfig(env = process.env) {
  const production = isProductionEnv(env);
  const provider = String(env.LEAD_PROVIDER || 'twilio').trim().toLowerCase();
  const problems = [];
  const config = { production, provider, problems };

  if (provider === 'mock') {
    if (production) problems.push('LEAD_PROVIDER=mock no está permitido en producción');
    const outcome = String(env.MOCK_NOTIFY_OUTCOME || 'accepted').toLowerCase();
    config.mock = {
      outcome: ['accepted', 'failed', 'uncertain', 'slow'].includes(outcome) ? outcome : 'accepted',
    };
  } else if (provider === 'twilio') {
    const required = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_API_KEY',
      'TWILIO_API_SECRET',
      'TWILIO_WHATSAPP_FROM',
      'TWILIO_CONTENT_SID',
      'LEAD_NOTIFICATION_TO',
    ];
    for (const key of required) if (!env[key]) problems.push(`Falta ${key}`);
    const from = stripWhatsAppPrefix(env.TWILIO_WHATSAPP_FROM);
    const to = stripWhatsAppPrefix(env.LEAD_NOTIFICATION_TO);
    if (env.TWILIO_ACCOUNT_SID && !/^AC[0-9a-f]{32}$/i.test(env.TWILIO_ACCOUNT_SID)) {
      problems.push('TWILIO_ACCOUNT_SID no tiene el formato AC…');
    }
    if (env.TWILIO_API_KEY && !/^SK[0-9a-f]{32}$/i.test(env.TWILIO_API_KEY)) {
      problems.push('TWILIO_API_KEY no tiene el formato SK…');
    }
    if (env.TWILIO_CONTENT_SID && !/^HX[0-9a-f]{32}$/i.test(env.TWILIO_CONTENT_SID)) {
      problems.push('TWILIO_CONTENT_SID no tiene el formato HX…');
    }
    if (env.TWILIO_WHATSAPP_FROM && !E164.test(from)) problems.push('TWILIO_WHATSAPP_FROM no está en formato E.164');
    if (env.LEAD_NOTIFICATION_TO && !E164.test(to)) problems.push('LEAD_NOTIFICATION_TO no está en formato E.164');
    if (from && to && from === to) problems.push('El remitente y el destinatario de WhatsApp deben ser distintos');
    config.twilio = {
      accountSid: env.TWILIO_ACCOUNT_SID,
      apiKey: env.TWILIO_API_KEY,
      apiSecret: env.TWILIO_API_SECRET,
      from,
      to,
      contentSid: env.TWILIO_CONTENT_SID,
    };
  } else {
    problems.push('LEAD_PROVIDER debe ser "twilio" o "mock"');
  }

  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (redisUrl && redisToken) {
    if (!/^https:\/\//i.test(redisUrl)) problems.push('La URL REST de Redis debe usar https');
    config.store = { kind: 'upstash', url: redisUrl, token: redisToken };
  } else if (provider === 'mock' && !production) {
    config.store = { kind: 'memory' };
  } else {
    problems.push('Falta almacenamiento compartido (UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN)');
  }

  if (env.LEAD_HASH_SECRET) {
    if (env.LEAD_HASH_SECRET.length < 32) problems.push('LEAD_HASH_SECRET debe tener al menos 32 caracteres');
    config.hashSecret = env.LEAD_HASH_SECRET;
  } else if (provider === 'mock' && !production) {
    config.hashSecret = DEV_HASH_SECRET;
  } else {
    problems.push('Falta LEAD_HASH_SECRET');
  }

  config.retentionDays = clampInt(env.LEAD_RETENTION_DAYS, 30, 1, 90);
  config.dailyCap = clampInt(env.LEAD_DAILY_CAP, 50, 1, 1000);
  config.statusCallbackBase =
    httpsOrigin(env.SITE_URL) || (env.VERCEL_URL ? httpsOrigin(env.VERCEL_URL) : null);
  // Sin Auth Token no se pueden verificar las firmas: no se pide callback a Twilio.
  config.statusCallbacks = Boolean(env.TWILIO_AUTH_TOKEN);
  config.allowedOrigins = resolveAllowedOrigins(env);
  config.ok = problems.length === 0;
  return config;
}

export function resolveAllowedOrigins(env = process.env) {
  const origins = new Set();
  for (const raw of String(env.ALLOWED_ORIGINS || '').split(',')) {
    const origin = httpsOrigin(raw.trim());
    if (origin) origins.add(origin);
  }
  for (const key of ['SITE_URL', 'VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
    const origin = httpsOrigin(env[key]);
    if (origin) origins.add(origin);
  }
  return origins;
}

export function isAllowedOrigin(origin, env = process.env, allowed = resolveAllowedOrigins(env)) {
  if (!origin || origin === 'null') return false;
  if (allowed.has(origin)) return true;
  // Desarrollo local (vite / vite preview), incluida la red privada para probar desde un
  // teléfono en la misma Wi-Fi. Nunca en producción.
  if (!isProductionEnv(env) && LOCAL_ORIGIN.test(origin)) return true;
  return false;
}

export function resolveStatusConfig(env = process.env) {
  const problems = [];
  if (!env.TWILIO_AUTH_TOKEN) problems.push('Falta TWILIO_AUTH_TOKEN');
  if (!env.TWILIO_ACCOUNT_SID) problems.push('Falta TWILIO_ACCOUNT_SID');
  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!redisUrl || !redisToken) problems.push('Falta almacenamiento compartido');
  return {
    ok: problems.length === 0,
    problems,
    authToken: env.TWILIO_AUTH_TOKEN,
    accountSid: env.TWILIO_ACCOUNT_SID,
    publicBase: httpsOrigin(env.SITE_URL),
    store: redisUrl && redisToken ? { kind: 'upstash', url: redisUrl, token: redisToken } : null,
  };
}
