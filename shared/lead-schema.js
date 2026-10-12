// Esquema de la solicitud de asesoría, compartido por el formulario y el servidor.
// El servidor vuelve a validar todo: el navegador nunca es fuente de confianza.

export const LEAD_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 80,
  ageMin: 18,
  ageMax: 99,
  phoneRawMax: 24,
});

export const SAVINGS_OPTIONS = Object.freeze([
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
  { value: 'no_aplica', label: 'Busco un seguro / No aplica' },
]);

export const SAVINGS_LABELS = Object.freeze(
  Object.fromEntries(SAVINGS_OPTIONS.map((o) => [o.value, o.label])),
);

// Interés del prospecto: una sola elección, cuyas opciones dependen de la respuesta anterior.
//  - "Busco un seguro / No aplica" → rama de seguros.
//  - "Sí" o "No" → rama de ahorro y retiro (responder "No" nunca bloquea la solicitud).
// `headline` completa "Nuevo prospecto …" en el aviso a Luis; `label` es el texto del formulario y
// `notice` el que se muestra en el aviso.
export const INSURANCE_INTERESTS = Object.freeze([
  { value: 'gmm', label: 'Gastos médicos mayores (GMM)', notice: 'Gastos médicos mayores (GMM)', headline: 'para GMM' },
  { value: 'auto', label: 'Auto', notice: 'Auto', headline: 'para Auto' },
  { value: 'auto_turista', label: 'Auto turista', notice: 'Auto turista', headline: 'para Auto turista' },
  { value: 'hogar', label: 'Hogar', notice: 'Hogar', headline: 'para Hogar' },
  { value: 'otro_seguro', label: 'Otro', notice: 'Otro seguro', headline: '— Otro seguro' },
]);

export const ADVICE_INTERESTS = Object.freeze([
  { value: 'ppr_retiro', label: 'PPR / retiro', notice: 'PPR / retiro', headline: 'para PPR' },
  { value: 'ahorro_inversion', label: 'Ahorro e inversión', notice: 'Ahorro e inversión', headline: 'para Ahorro e inversión' },
  { value: 'educacion', label: 'Educación', notice: 'Educación', headline: 'para Educación' },
  { value: 'orientacion', label: 'Necesito orientación', notice: 'Necesita orientación', headline: '— Necesita orientación' },
]);

export const INTEREST_BY_VALUE = Object.freeze(
  Object.fromEntries([...INSURANCE_INTERESTS, ...ADVICE_INTERESTS].map((o) => [o.value, o])),
);

/** Rama del interés según la respuesta de ahorro: 'seguro', 'ahorro' o null. */
export function interestBranch(savings) {
  if (savings === 'no_aplica') return 'seguro';
  if (savings === 'si' || savings === 'no') return 'ahorro';
  return null;
}

export function interestOptionsFor(savings) {
  const branch = interestBranch(savings);
  if (branch === 'seguro') return INSURANCE_INTERESTS;
  if (branch === 'ahorro') return ADVICE_INTERESTS;
  return [];
}

export const INTEREST_QUESTIONS = Object.freeze({
  seguro: '¿Qué seguro te interesa?',
  ahorro: '¿Sobre qué te gustaría recibir asesoría?',
});

/** Encabezado del aviso a Luis, p. ej. "Nuevo prospecto para GMM". */
export function leadHeadline(interest) {
  const option = INTEREST_BY_VALUE[interest];
  return option ? `Nuevo prospecto ${option.headline}` : 'Nuevo prospecto';
}

// Campos aceptados. Cualquier otro (p. ej. un destinatario) invalida la solicitud.
// `website` es un campo trampa (honeypot) que una persona no ve ni llena.
export const ALLOWED_FIELDS = Object.freeze(['name', 'age', 'phone', 'savings', 'interest', 'consent', 'website']);

// Versión del texto de consentimiento que el visitante aceptó.
export const CONSENT_VERSION = '2026-10-borrador';

// Controles, formato invisible (zero-width, bidi) y separadores de línea/párrafo Unicode.
const CONTROL_CHARS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;

export function normalizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.normalize('NFC').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza un teléfono de contacto.
 * Acepta 10 dígitos nacionales (México), +52 / 52 + 10 dígitos, el antiguo prefijo móvil
 * 521 + 10 dígitos y números de EE. UU./Canadá (+1 + 10 dígitos), frecuentes en la frontera.
 * @returns {{ e164: string, display: string } | null}
 */
export function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LEAD_LIMITS.phoneRawMax) return null;
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  let national = null;
  let country = '52';
  if (!hasPlus && digits.length === 10) national = digits;
  else if (digits.length === 12 && digits.startsWith('52')) national = digits.slice(2);
  else if (digits.length === 13 && digits.startsWith('521')) national = digits.slice(3);
  else if (hasPlus && digits.length === 11 && digits.startsWith('1')) {
    country = '1';
    national = digits.slice(1);
  }
  if (!national || !/^[2-9]\d{9}$/.test(national) || /^(\d)\1{9}$/.test(national)) return null;

  const display =
    country === '52'
      ? `+52 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
      : `+1 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  return { e164: `+${country}${national}`, display };
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
  if (input.age === undefined || input.age === null || input.age === '') errors.age = 'required';
  else {
    age = parseAge(input.age);
    if (!Number.isInteger(age)) errors.age = 'invalid';
    else if (age < LEAD_LIMITS.ageMin || age > LEAD_LIMITS.ageMax) errors.age = 'out_of_range';
  }

  let phone = null;
  if (typeof input.phone !== 'string' || !input.phone.trim()) errors.phone = 'required';
  else {
    phone = normalizePhone(input.phone);
    if (!phone) errors.phone = 'invalid';
  }

  if (input.savings === undefined || input.savings === null || input.savings === '') {
    errors.savings = 'required';
  } else if (typeof input.savings !== 'string' || !(input.savings in SAVINGS_LABELS)) {
    errors.savings = 'invalid';
  }

  // Interés: obligatorio, de las opciones definidas y compatible con la respuesta de ahorro.
  const options = errors.savings ? [] : interestOptionsFor(input.savings);
  if (input.interest === undefined || input.interest === null || input.interest === '') {
    if (!errors.savings) errors.interest = 'required';
  } else if (typeof input.interest !== 'string' || !Object.prototype.hasOwnProperty.call(INTEREST_BY_VALUE, input.interest)) {
    errors.interest = 'invalid';
  } else if (!errors.savings && !options.some((o) => o.value === input.interest)) {
    errors.interest = 'incompatible';
  }

  if (input.consent !== true) errors.consent = 'required';

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      age,
      phoneE164: phone.e164,
      phoneDisplay: phone.display,
      savings: input.savings,
      interest: input.interest,
      consent: true,
    },
  };
}
