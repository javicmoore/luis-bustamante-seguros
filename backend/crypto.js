import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';

// Alfabeto Crockford (sin I, L, O, U) para folios legibles por teléfono.
const FOLIO_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function newLeadId() {
  let id = '';
  for (let i = 0; i < 8; i += 1) id += FOLIO_ALPHABET[randomInt(FOLIO_ALPHABET.length)];
  return `LB-${id}`;
}

export const LEAD_ID_PATTERN = /^LB-[0-9A-HJKMNP-TV-Z]{8}$/;

export function hmacHex(secret, value) {
  return createHmac('sha256', secret).update(String(value)).digest('hex');
}

export function sha256Hex(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
