import { describe, expect, it } from 'vitest';
import { normalizePhone, validateLead } from '../../shared/lead-schema.js';

const valid = { name: 'Ana López', age: '34', phone: '686 000 1234', savings: 'si', consent: true, website: '' };

describe('validación de la solicitud', () => {
  it('acepta una solicitud válida y normaliza el teléfono', () => {
    const result = validateLead(valid);
    expect(result.ok).toBe(true);
    expect(result.value.phoneE164).toBe('+526860001234');
    expect(result.value.age).toBe(34);
  });

  it('una respuesta "No" o "No aplica" no bloquea la solicitud', () => {
    expect(validateLead({ ...valid, savings: 'no' }).ok).toBe(true);
    expect(validateLead({ ...valid, savings: 'no_aplica' }).ok).toBe(true);
  });

  it('exige consentimiento explícito (true), no valores "truthy"', () => {
    for (const consent of [false, 'true', 1, undefined]) {
      const result = validateLead({ ...valid, consent });
      expect(result.ok).toBe(false);
      expect(result.errors.consent).toBe('required');
    }
  });

  it('rechaza campos inesperados, como un destinatario inyectado', () => {
    const result = validateLead({ ...valid, to: '+15550001111' });
    expect(result.ok).toBe(false);
    expect(result.unexpected).toEqual(['to']);
    expect(validateLead({ ...valid, __proto__: { x: 1 }, template: 'HX1' }).ok).toBe(false);
  });

  it('detecta el campo trampa (honeypot)', () => {
    const result = validateLead({ ...valid, website: 'https://spam.example' });
    expect(result.ok).toBe(false);
    expect(result.honeypot).toBe(true);
  });

  it('valida nombre, edad y opciones permitidas', () => {
    expect(validateLead({ ...valid, name: 'A' }).errors.name).toBe('too_short');
    expect(validateLead({ ...valid, name: 'x'.repeat(81) }).errors.name).toBe('too_long');
    expect(validateLead({ ...valid, name: 'Ana <script>' }).errors.name).toBe('invalid');
    expect(validateLead({ ...valid, name: 'Ana 123' }).errors.name).toBe('invalid');
    expect(validateLead({ ...valid, age: '17' }).errors.age).toBe('out_of_range');
    expect(validateLead({ ...valid, age: '100' }).errors.age).toBe('out_of_range');
    expect(validateLead({ ...valid, age: '3.5' }).errors.age).toBe('invalid');
    expect(validateLead({ ...valid, age: 34.5 }).errors.age).toBe('invalid');
    expect(validateLead({ ...valid, savings: 'tal vez' }).errors.savings).toBe('invalid');
    expect(validateLead({ ...valid, savings: '' }).errors.savings).toBe('required');
  });

  it('acepta nombres con acentos, ñ, apóstrofos y guiones', () => {
    for (const name of ['José Ñúñez', "María O'Connor", 'Ana-Lucía Pérez', 'Juan Ma. Ruiz']) {
      expect(validateLead({ ...valid, name }).ok).toBe(true);
    }
  });

  it('elimina caracteres de control e invisibles del nombre', () => {
    const dirty = `Ana${String.fromCharCode(0x200b, 0x07)}  López${String.fromCharCode(0x2028)}`;
    const result = validateLead({ ...valid, name: dirty });
    expect(result.ok).toBe(true);
    expect(result.value.name).toBe('Ana López');
  });

  it('rechaza tipos inválidos y payloads no-objeto', () => {
    expect(validateLead(null).ok).toBe(false);
    expect(validateLead([]).ok).toBe(false);
    expect(validateLead('texto').ok).toBe(false);
    expect(validateLead({ ...valid, name: ['Ana'] }).errors.name).toBe('required');
    expect(validateLead({ ...valid, phone: 6860001234 }).errors.phone).toBe('required');
  });
});

describe('normalización de teléfonos', () => {
  it.each([
    ['6860001234', '+526860001234'],
    ['686-000-1234', '+526860001234'],
    ['(686) 000 1234', '+526860001234'],
    ['+52 686 000 1234', '+526860001234'],
    ['52 686 000 1234', '+526860001234'],
    ['+521 686 000 1234', '+526860001234'],
    ['+1 619 555 0101', '+16195550101'],
  ])('%s → %s', (raw, e164) => {
    expect(normalizePhone(raw)?.e164).toBe(e164);
  });

  it.each(['12345', '0000000000', '1234567890', '+44 20 7946 0958', '686 000 12345', 'abc6860001234', '+5268600012'])(
    'rechaza %s',
    (raw) => {
      expect(normalizePhone(raw)).toBeNull();
    },
  );
});
