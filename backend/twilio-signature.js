// Verificación de X-Twilio-Signature (HMAC-SHA1 con el Auth Token de la cuenta).
// Réplica de validateRequest() del SDK oficial (twilio-node 6.x, lib/webhooks/webhooks.js);
// tests/unit/twilio-signature.test.js compara ambos resultados. Se mantiene sin el SDK
// para no cargar sus dependencias en la función.
import { createHmac } from 'node:crypto';
import { parse as parseQs, stringify as stringifyQs } from 'node:querystring';
import { safeEqual } from './crypto.js';

function paramString(name, value) {
  if (Array.isArray(value)) {
    return [...new Set(value)]
      .sort()
      .map((v) => paramString(name, v))
      .join('');
  }
  return name + value;
}

export function expectedTwilioSignature(authToken, url, params) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + paramString(key, params[key]), url);
  return createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
}

function withStandardPort(url) {
  if (url.port) return url.toString();
  const port = url.protocol === 'https:' ? ':443' : ':80';
  const auth = url.username ? `${url.username}${url.password ? `:${url.password}` : ''}@` : '';
  return `${url.protocol}//${auth}${url.host}${port}${url.pathname}${url.search}${url.hash}`;
}

function withoutPort(url) {
  const copy = new URL(url);
  copy.port = '';
  return copy.toString();
}

function withLegacyQuerystring(raw) {
  const url = new URL(raw);
  if (!url.search) return raw;
  const qs = parseQs(url.search.slice(1));
  url.search = '';
  return `${url.toString()}?${stringifyQs(qs)}`;
}

export function validateTwilioRequest(authToken, signature, url, params) {
  if (!authToken || !signature) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const plain = withoutPort(parsed);
  const ported = withStandardPort(parsed);
  const candidates = [plain, ported, withLegacyQuerystring(plain), withLegacyQuerystring(ported)];
  return candidates.some((candidate) =>
    safeEqual(signature, expectedTwilioSignature(authToken, candidate, params)),
  );
}

/** Parámetros de un cuerpo x-www-form-urlencoded, sin prototipo (evita contaminación). */
export function formParams(text) {
  const out = Object.create(null);
  for (const [key, value] of new URLSearchParams(text)) {
    if (key in out) out[key] = Array.isArray(out[key]) ? [...out[key], value] : [out[key], value];
    else out[key] = value;
  }
  return out;
}
