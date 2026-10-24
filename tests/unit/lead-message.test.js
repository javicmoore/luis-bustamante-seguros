import { describe, expect, it } from 'vitest';
import '../../shared/phone-lib.js';
import { buildNotificationVariables, previewNotification } from '../../backend/lead-message.js';
import { validateLead } from '../../shared/lead-schema.js';
import { validLead } from './helpers.js';

const receivedAt = new Date('2026-10-21T18:30:00Z');

const notice = (overrides) => {
  const result = validateLead({ ...validLead(), ...overrides });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  const args = { leadId: 'LB-TEST01', lead: result.value, receivedAt };
  return { vars: buildNotificationVariables(args), text: previewNotification(args) };
};
const byEmail = { contactMethod: 'email', email: 'ana@ejemplo.com', phone: undefined, phoneCountry: undefined };

describe('aviso de WhatsApp para Luis (plantilla v4)', () => {
  it('encabezado general "Nuevo prospecto", sin producto ni interés', () => {
    for (const overrides of [{}, byEmail, { income: '50_mas' }]) {
      const { vars, text } = notice(overrides);
      expect(text.split('\n')[0]).toBe('Nuevo prospecto');
      expect(text).not.toMatch(/Interés|seguro|ahorro|retiro|GMM|PPR/i);
      expect(Object.values(vars).join(' ')).not.toMatch(/seguro|ahorro|retiro|GMM|PPR/i);
    }
  });

  it('por teléfono: medio preferido y número completo en formato internacional', () => {
    const { vars, text } = notice({ phoneCountry: 'US', phone: '(213) 373-4253' });
    expect(Object.keys(vars)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(text).toContain('Contacto preferido: Teléfono (llamada o WhatsApp)');
    expect(text).toContain('Dato de contacto: +1 213 373 4253');
    expect(notice({}).text).toContain('Dato de contacto: +52 686 000 1234');
  });

  it('por correo: indica el correo y no incluye teléfono', () => {
    const { vars, text } = notice(byEmail);
    expect(vars[4]).toBe('Correo electrónico');
    expect(vars[5]).toBe('ana@ejemplo.com');
    expect(text).toContain('Contacto preferido: Correo electrónico');
    expect(text).not.toMatch(/\+52/);
  });

  it('incluye nombre, edad, rango de ingresos, folio y hora', () => {
    const { text } = notice({ income: '50_mas' });
    expect(text).toContain('Folio: LB-TEST01');
    expect(text).toContain('Nombre: Ana López');
    expect(text).toContain('Edad: 34 años');
    expect(text).toContain('Ingresos mensuales: $50,000 MXN o más');
    expect(text).toMatch(/Recibida: .*\(hora de Mexicali\)/);
    expect(text).not.toMatch(/destinar parte de sus ingresos/);
  });

  it('respeta las reglas de WhatsApp para variables: sin saltos, tabuladores ni 5+ espacios', () => {
    const { vars } = notice({ name: 'Ana    María\tLópez' });
    for (const value of Object.values(vars)) {
      expect(value).not.toBe('');
      expect(value).not.toMatch(/[\r\n\t]| {5,}/);
    }
    expect(vars[2]).toBe('Ana María López');
  });
});
