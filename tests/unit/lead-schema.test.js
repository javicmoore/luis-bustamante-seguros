import { describe, expect, it } from 'vitest';
import '../../shared/phone-lib.js';
import {
  INCOME_OPTIONS,
  normalizeEmail,
  normalizePhone,
  validateLead,
} from '../../shared/lead-schema.js';

const base = {
  name: 'Ana López',
  age: '34',
  income: '30_50',
  consent: true,
  website: '',
};
const byPhone = { ...base, contactMethod: 'phone', phoneCountry: 'MX', phone: '686 000 1234' };
const byEmail = { ...base, contactMethod: 'email', email: 'ana@ejemplo.com' };

describe('validación de la solicitud', () => {
  it('acepta una solicitud por teléfono y la normaliza a E.164', () => {
    const result = validateLead(byPhone);
    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({
      contactMethod: 'phone',
      phoneE164: '+526860001234',
      phoneDisplay: '+52 686 000 1234',
      phoneCountry: 'MX',
      email: null,
      age: 34,
      income: '30_50',
    });
    expect(result.value).not.toHaveProperty('interestType');
    expect(result.value).not.toHaveProperty('interest');
  });

  it('acepta una solicitud por correo (dominio en minúsculas)', () => {
    const result = validateLead({ ...byEmail, email: '  Ana.Lopez@Ejemplo.COM ' });
    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({ contactMethod: 'email', email: 'Ana.Lopez@ejemplo.com', phoneE164: null });
  });

  it('el medio de contacto es obligatorio y solo se exige su dato', () => {
    expect(validateLead({ ...base }).errors).toMatchObject({ contactMethod: 'required' });
    expect(validateLead({ ...base, contactMethod: 'fax' }).errors.contactMethod).toBe('invalid');
    expect(validateLead({ ...base, contactMethod: 'email' }).errors.email).toBe('required');
    expect(validateLead({ ...base, contactMethod: 'phone' }).errors.phone).toBe('required');
    // Con correo no hace falta teléfono, y viceversa.
    expect(validateLead(byEmail).ok).toBe(true);
    expect(validateLead(byPhone).ok).toBe(true);
  });

  it('rechaza el dato oculto del otro medio (nunca se envía información que no se ve)', () => {
    expect(validateLead({ ...byEmail, phone: '6860001234' }).errors.phone).toBe('not_allowed');
    expect(validateLead({ ...byPhone, email: 'ana@ejemplo.com' }).errors.email).toBe('not_allowed');
  });

  it('valida el correo', () => {
    for (const email of ['ana', 'ana@', 'ana@ejemplo', 'a b@ejemplo.com', 'ana..x@ejemplo.com', '.ana@ejemplo.com', `${'a'.repeat(65)}@ejemplo.com`]) {
      expect(validateLead({ ...byEmail, email }).errors.email, email).toBe('invalid');
    }
    for (const email of ['ana@ejemplo.com.mx', 'ana.lopez+asesoria@ejemplo.mx', 'a_b@sub.dominio.io']) {
      expect(validateLead({ ...byEmail, email }).ok, email).toBe(true);
    }
  });

  it('rango de ingresos obligatorio, de las opciones definidas', () => {
    expect(INCOME_OPTIONS.map((o) => o.label)).toEqual([
      'De $20,000 a menos de $30,000',
      'De $30,000 a menos de $50,000',
      '$50,000 o más',
    ]);
    expect(validateLead({ ...byPhone, income: '' }).errors.income).toBe('required');
    expect(validateLead({ ...byPhone, income: '100_mas' }).errors.income).toBe('invalid');
    expect(validateLead({ ...byPhone, income: 'toString' }).errors.income).toBe('invalid');
    for (const { value } of INCOME_OPTIONS) expect(validateLead({ ...byPhone, income: value }).ok).toBe(true);
  });

  it('exige consentimiento explícito (true), no valores "truthy"', () => {
    for (const consent of [false, 'true', 1, undefined]) {
      expect(validateLead({ ...byPhone, consent }).errors.consent).toBe('required');
    }
  });

  it('rechaza campos inesperados, como un destinatario inyectado o el campo anterior de ahorro', () => {
    const result = validateLead({ ...byPhone, to: '+15550001111' });
    expect(result.ok).toBe(false);
    expect(result.unexpected).toEqual(['to']);
    expect(validateLead({ ...byPhone, savings: 'si' }).unexpected).toEqual(['savings']);
    expect(validateLead({ ...byPhone, __proto__: { x: 1 }, template: 'HX1' }).ok).toBe(false);
  });

  it('detecta el campo trampa (honeypot)', () => {
    const result = validateLead({ ...byPhone, website: 'https://spam.example' });
    expect(result.ok).toBe(false);
    expect(result.honeypot).toBe(true);
  });

  it('valida nombre y edad', () => {
    expect(validateLead({ ...byPhone, name: 'A' }).errors.name).toBe('too_short');
    expect(validateLead({ ...byPhone, name: 'x'.repeat(81) }).errors.name).toBe('too_long');
    expect(validateLead({ ...byPhone, name: 'Ana <script>' }).errors.name).toBe('invalid');
    expect(validateLead({ ...byPhone, age: '17' }).errors.age).toBe('out_of_range');
    expect(validateLead({ ...byPhone, age: '3.5' }).errors.age).toBe('invalid');
  });

  it('elimina caracteres de control e invisibles del nombre', () => {
    const dirty = `Ana${String.fromCharCode(0x200b, 0x07)}  López${String.fromCharCode(0x2028)}`;
    expect(validateLead({ ...byPhone, name: dirty }).value.name).toBe('Ana López');
  });

  it('rechaza tipos inválidos y payloads no-objeto', () => {
    expect(validateLead(null).ok).toBe(false);
    expect(validateLead([]).ok).toBe(false);
    expect(validateLead({ ...byPhone, phone: 6860001234 }).errors.phone).toBe('required');
    expect(validateLead({ ...byEmail, email: ['ana@ejemplo.com'] }).errors.email).toBe('invalid');
  });
});

describe('sin pregunta de interés', () => {
  it('no exige ni acepta qué producto busca el prospecto', () => {
    expect(validateLead(byPhone).ok).toBe(true);
    expect(validateLead(byEmail).ok).toBe(true);
    for (const extra of [{ interestType: 'seguro' }, { interest: 'gmm' }]) {
      expect(validateLead({ ...byPhone, ...extra })).toMatchObject({ ok: false, errors: { _form: 'unexpected_field' } });
    }
  });
});

describe('teléfono con país y prefijo', () => {
  it.each([
    ['6860001234', 'MX', '+526860001234', '+52 686 000 1234'],
    ['686-000-1234', 'MX', '+526860001234', '+52 686 000 1234'],
    ['52 686 000 1234', 'MX', '+526860001234', '+52 686 000 1234'],
    ['+52 686 000 1234', 'MX', '+526860001234', '+52 686 000 1234'],
    ['+521 686 000 1234', 'MX', '+526860001234', '+52 686 000 1234'],
    ['0052 686 000 1234', 'MX', '+526860001234', '+52 686 000 1234'],
    ['(213) 373-4253', 'US', '+12133734253', '+1 213 373 4253'],
    ['612 345 678', 'ES', '+34612345678', '+34 612 34 56 78'],
    ['020 7946 0958', 'GB', '+442079460958', '+44 20 7946 0958'],
  ])('%s (%s) → %s', (raw, country, e164, display) => {
    expect(normalizePhone(raw, country)).toMatchObject({ e164, display });
  });

  it('un número pegado con prefijo se reconoce aunque el país elegido sea otro', () => {
    expect(normalizePhone('+34 612 345 678', 'MX')).toMatchObject({ e164: '+34612345678', country: 'ES' });
    expect(normalizePhone('+1 213 373 4253', 'MX')).toMatchObject({ e164: '+12133734253', country: 'US' });
    expect(normalizePhone('+52 686 000 1234', 'US')).toMatchObject({ e164: '+526860001234', country: 'MX' });
  });

  it('México exige 10 dígitos nacionales; otros países usan sus propias reglas', () => {
    for (const raw of ['12345', '0000000000', '1234567890', '686 000 12345', '+5268600012']) {
      expect(normalizePhone(raw, 'MX'), raw).toBeNull();
    }
    expect(normalizePhone('612 345 678', 'MX')).toBeNull();
    expect(normalizePhone('6860001234', 'ES')).toBeNull();
    expect(normalizePhone('6860001234', 'XX')).toBeNull();
    expect(normalizePhone('abc6860001234', 'MX')).toBeNull();
  });

  it('valida el país del formulario', () => {
    expect(validateLead({ ...byPhone, phoneCountry: 'XX' }).errors.phoneCountry).toBe('invalid');
    expect(validateLead({ ...byPhone, phoneCountry: 'ES', phone: '612 345 678' }).value.phoneE164).toBe('+34612345678');
    expect(validateLead({ ...byPhone, phoneCountry: 'ES' }).errors.phone).toBe('invalid');
  });
});

describe('correo', () => {
  it('normaliza y rechaza formatos inválidos', () => {
    expect(normalizeEmail(' Luis.BPaz@Outlook.COM ')).toBe('Luis.BPaz@outlook.com');
    expect(normalizeEmail('a@b')).toBeNull();
    expect(normalizeEmail(`ana${String.fromCharCode(0x200b)}@ejemplo.com`)).toBeNull();
  });
});
