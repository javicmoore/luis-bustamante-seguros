// Esquema de la solicitud de asesoría, compartido por el formulario y el servidor.
// El servidor vuelve a validar todo: el navegador nunca es fuente de confianza.
import { COUNTRY_BY_CODE } from './countries.js';

// Reglas telefónicas de otros países (libphonenumber-js). Se registran desde shared/phone-lib.js:
// el servidor y las pruebas lo cargan al inicio; el navegador, solo cuando se usa el formulario
// (así sus metadatos no pesan en la carga inicial). México se valida sin la librería.
let phoneLib = null;
export function setPhoneLibrary(lib) {
  phoneLib = lib;
}
export const hasPhoneLibrary = () => phoneLib !== null;

export const LEAD_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 80,
  ageMin: 18,
  ageMax: 99,
  phoneRawMax: 32,
  emailMax: 254,
});

// Medio de contacto preferido. La solicitud siempre llega al WhatsApp de Luis; esto indica cómo
// prefiere el visitante que Luis le responda. Solo se pide el dato del medio elegido.
export const CONTACT_METHODS = Object.freeze([
  { value: 'email', label: 'Correo electrónico', notice: 'Correo electrónico' },
  { value: 'phone', label: 'Teléfono', notice: 'Teléfono (llamada o WhatsApp)' },
]);
export const CONTACT_METHOD_BY_VALUE = Object.freeze(Object.fromEntries(CONTACT_METHODS.map((o) => [o.value, o])));

export const DEFAULT_PHONE_COUNTRY = 'MX';

// Rango de ingresos mensuales (MXN), con límites inequívocos. Solo orienta la conversación:
// nunca se usa para aprobar o rechazar prospectos ni para afirmar que califican a un producto.
export const INCOME_OPTIONS = Object.freeze([
  { value: '20_30', label: 'De $20,000 a menos de $30,000', notice: 'De $20,000 a menos de $30,000 MXN' },
  { value: '30_50', label: 'De $30,000 a menos de $50,000', notice: 'De $30,000 a menos de $50,000 MXN' },
  { value: '50_mas', label: '$50,000 o más', notice: '$50,000 MXN o más' },
]);
export const INCOME_BY_VALUE = Object.freeze(Object.fromEntries(INCOME_OPTIONS.map((o) => [o.value, o])));

// Campos aceptados. Cualquier otro (p. ej. un destinatario) invalida la solicitud.
// `website` es un campo trampa (honeypot) que una persona no ve ni llena.
export const ALLOWED_FIELDS = Object.freeze([
  'name',
  'age',
  'contactMethod',
  'email',
  'phoneCountry',
  'phone',
  'income',
  'consent',
  'website',
]);

// Versión del texto de consentimiento que el visitante aceptó (cambia con el medio elegido).
export const CONSENT_VERSION = '2026-10-21-borrador';

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const blank = (value) => value === undefined || value === null || value === '';

// Controles, formato invisible (zero-width, bidi) y separadores de línea/párrafo Unicode.
const CONTROL_CHARS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
const HAS_CONTROL = new RegExp(CONTROL_CHARS.source, 'u');
const NAME_PATTERN =/^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;

export function normalizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.normalize('NFC').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

// Correo: una parte local y un dominio con al menos un punto, sin espacios ni caracteres de control.
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/** @returns {string | null} correo normalizado (dominio en minúsculas) o null si no es válido. */
export function normalizeEmail(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LEAD_LIMITS.emailMax || HAS_CONTROL.test(trimmed)) return null;
  if (!EMAIL_PATTERN.test(trimmed)) return null;
  const at = trimmed.lastIndexOf('@');
  const local = trimmed.slice(0, at);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  return `${local}@${trimmed.slice(at + 1).toLowerCase()}`;
}

const formatMx = (national) => `+52 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;

function validMxNational(national) {
  return /^[2-9]\d{9}$/.test(national) && !/^(\d)\1{9}$/.test(national);
}

/**
 * Normaliza un teléfono de contacto a E.164.
 * - México: 10 dígitos nacionales (también acepta 52/521 + 10 dígitos, con o sin "+").
 * - Otros países: según las reglas del país elegido (libphonenumber-js).
 * - Un número completo con "+" o "00" se interpreta por su prefijo, cuando es inequívoco.
 * @param {string} raw
 * @param {string} [country] código ISO del país elegido (por defecto México)
 * @returns {{ e164: string, display: string, country: string } | null}
 */
export function normalizePhone(raw, country = DEFAULT_PHONE_COUNTRY) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LEAD_LIMITS.phoneRawMax) return null;
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  if (!has(COUNTRY_BY_CODE, country)) return null;
  const international = trimmed.startsWith('+') || trimmed.startsWith('00');
  const digits = trimmed.replace(/\D/g, '');

  if (international) {
    const full = trimmed.startsWith('00') ? digits.slice(2) : digits;
    if (full.startsWith('52')) {
      // México con prefijo (+52 o el antiguo +521 de móviles): 10 dígitos nacionales.
      const rest = full.slice(2);
      const national = rest.length === 11 && rest.startsWith('1') ? rest.slice(1) : rest;
      return validMxNational(national) ? { e164: `+52${national}`, display: formatMx(national), country: 'MX' } : null;
    }
    if (!phoneLib) return null;
    const parsed = phoneLib.parsePhoneNumberFromString(`+${full}`);
    if (!parsed || !parsed.isValid()) return null;
    return { e164: parsed.number, display: parsed.formatInternational(), country: parsed.country || country };
  }

  if (country === 'MX') {
    let national = null;
    if (digits.length === 10) national = digits;
    else if (digits.length === 12 && digits.startsWith('52')) national = digits.slice(2);
    else if (digits.length === 13 && digits.startsWith('521')) national = digits.slice(3);
    return national && validMxNational(national) ? { e164: `+52${national}`, display: formatMx(national), country: 'MX' } : null;
  }

  if (!phoneLib || !phoneLib.isValidPhoneNumber(trimmed, country)) return null;
  const parsed = phoneLib.parsePhoneNumberFromString(trimmed, country);
  return parsed ? { e164: parsed.number, display: parsed.formatInternational(), country: parsed.country || country } : null;
}

function parseAge(raw) {
  if (typeof raw === 'number') return Number.isInteger(raw) ? raw : NaN;
  if (typeof raw !== 'string') return NaN;
  const trimmed = raw.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return NaN;
  return Number(trimmed);
}

/**
 * Valida y normaliza la solicitud.
 * @param {unknown} input
 * @param {{ strict?: boolean }} [options] strict: rechaza campos desconocidos (servidor).
 * @returns {{ ok: true, value: object } | { ok: false, errors: Record<string, string>, unexpected?: string[], honeypot?: boolean }}
 */
export function validateLead(input, { strict = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { _form: 'invalid' } };
  }

  if (strict) {
    const unexpected = Object.keys(input).filter((key) => !ALLOWED_FIELDS.includes(key));
    if (unexpected.length) return { ok: false, errors: { _form: 'unexpected_field' }, unexpected };
  }

  if (input.website !== undefined && input.website !== '') {
    return { ok: false, errors: { _form: 'rejected' }, honeypot: true };
  }

  const errors = {};

  const name = normalizeName(input.name);
  if (typeof input.name !== 'string' || !name) errors.name = 'required';
  else if (name.length < LEAD_LIMITS.nameMin) errors.name = 'too_short';
  else if (name.length > LEAD_LIMITS.nameMax) errors.name = 'too_long';
  else if (!NAME_PATTERN.test(name)) errors.name = 'invalid';

  let age = NaN;
  if (blank(input.age)) errors.age = 'required';
  else {
    age = parseAge(input.age);
    if (!Number.isInteger(age)) errors.age = 'invalid';
    else if (age < LEAD_LIMITS.ageMin || age > LEAD_LIMITS.ageMax) errors.age = 'out_of_range';
  }

  // Medio de contacto: solo se exige (y se acepta) el dato del medio elegido.
  const method = input.contactMethod;
  let email = null;
  let phone = null;
  if (blank(method)) errors.contactMethod = 'required';
  else if (typeof method !== 'string' || !has(CONTACT_METHOD_BY_VALUE, method)) errors.contactMethod = 'invalid';
  else if (method === 'email') {
    if (blank(input.email)) errors.email = 'required';
    else {
      email = normalizeEmail(input.email);
      if (!email) errors.email = 'invalid';
    }
    if (!blank(input.phone)) errors.phone = 'not_allowed';
  } else {
    const country = blank(input.phoneCountry) ? DEFAULT_PHONE_COUNTRY : input.phoneCountry;
    if (typeof country !== 'string' || !has(COUNTRY_BY_CODE, country)) errors.phoneCountry = 'invalid';
    else if (typeof input.phone !== 'string' || !input.phone.trim()) errors.phone = 'required';
    else {
      phone = normalizePhone(input.phone, country);
      if (!phone) errors.phone = 'invalid';
    }
    if (!blank(input.email)) errors.email = 'not_allowed';
  }

  if (blank(input.income)) errors.income = 'required';
  else if (typeof input.income !== 'string' || !has(INCOME_BY_VALUE, input.income)) errors.income = 'invalid';

  if (input.consent !== true) errors.consent = 'required';

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      age,
      contactMethod: method,
      email,
      phoneE164: phone?.e164 ?? null,
      phoneDisplay: phone?.display ?? null,
      phoneCountry: phone?.country ?? null,
      income: input.income,
      consent: true,
    },
  };
}
