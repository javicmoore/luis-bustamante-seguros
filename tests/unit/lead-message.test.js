import { describe, expect, it } from 'vitest';
import { buildNotificationVariables, previewNotification } from '../../backend/lead-message.js';
import { validateLead } from '../../shared/lead-schema.js';
import { validLead } from './helpers.js';

const receivedAt = new Date('2026-10-11T18:30:00Z');

const notice = (overrides) => {
  const result = validateLead({ ...validLead(), ...overrides });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  const args = { leadId: 'LB-TEST01', lead: result.value, receivedAt };
  return { vars: buildNotificationVariables(args), text: previewNotification(args) };
};

describe('aviso de WhatsApp para Luis', () => {
  it.each([
    ['no_aplica', 'gmm', 'Nuevo prospecto para GMM', 'Gastos médicos mayores (GMM)'],
    ['no_aplica', 'auto', 'Nuevo prospecto para Auto', 'Auto'],
    ['no_aplica', 'auto_turista', 'Nuevo prospecto para Auto turista', 'Auto turista'],
    ['no_aplica', 'hogar', 'Nuevo prospecto para Hogar', 'Hogar'],
    ['no_aplica', 'otro_seguro', 'Nuevo prospecto — Otro seguro', 'Otro seguro'],
    ['si', 'ppr_retiro', 'Nuevo prospecto para PPR', 'PPR / retiro'],
    ['no', 'ahorro_inversion', 'Nuevo prospecto para Ahorro e inversión', 'Ahorro e inversión'],
    ['si', 'educacion', 'Nuevo prospecto para Educación', 'Educación'],
    ['no', 'orientacion', 'Nuevo prospecto — Necesita orientación', 'Necesita orientación'],
  ])('%s + %s → "%s"', (savings, interest, headline, interestText) => {
    const { vars, text } = notice({ savings, interest });
    const lines = text.split('\n');
    expect(lines[0]).toBe(headline);
    expect(text).toContain(`Interés: ${interestText}`);
    expect(vars[6]).toBe(interestText);
  });

  it('incluye nombre, edad, teléfono, interés y respuesta de ahorro, más folio y hora', () => {
    const { text } = notice({ savings: 'no_aplica', interest: 'gmm' });
    expect(text).toContain('Folio: LB-TEST01');
    expect(text).toContain('Nombre: Ana López');
    expect(text).toContain('Edad: 34 años');
    expect(text).toContain('Teléfono: +52 686 000 1234');
    expect(text).toContain('Interés: Gastos médicos mayores (GMM)');
    expect(text).toContain('¿Puede destinar parte de sus ingresos a ahorro o retiro?: Busco un seguro / No aplica');
    expect(text).toMatch(/Recibida: .*\(hora de Mexicali\)/);
  });

  it('no deduce PPR de la respuesta "Sí": usa el interés elegido', () => {
    const { vars, text } = notice({ savings: 'si', interest: 'orientacion' });
    expect(vars[1]).toBe('— Necesita orientación');
    expect(vars[7]).toBe('Sí');
    expect(text).not.toMatch(/PPR/);
  });

  it('respeta las reglas de WhatsApp para variables: sin saltos, tabuladores ni 5+ espacios', () => {
    const { vars } = notice({ savings: 'no_aplica', interest: 'auto_turista', name: 'Ana    María\tLópez' });
    expect(Object.keys(vars)).toHaveLength(8);
    for (const value of Object.values(vars)) {
      expect(value).not.toBe('');
      expect(value).not.toMatch(/[\r\n\t]| {5,}/);
    }
    expect(vars[3]).toBe('Ana María López');
  });
});
