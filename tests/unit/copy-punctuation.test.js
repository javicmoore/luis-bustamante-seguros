import { describe, expect, it } from 'vitest';
import * as copy from '../../src/content/copy.js';
import * as faq from '../../src/content/faq.js';
import * as services from '../../src/content/services.js';
import * as privacy from '../../src/content/privacy.js';
import * as site from '../../src/content/site.js';
import {
  ADVICE_INTERESTS,
  CONTACT_METHODS,
  INCOME_OPTIONS,
  INSURANCE_INTERESTS,
  INTEREST_QUESTIONS,
  INTEREST_TYPES,
} from '../../shared/lead-schema.js';

// Guion largo (U+2014) y semiguion (U+2013) no se usan como puntuación en textos visibles.
const DASHES = new RegExp(`[${String.fromCharCode(0x2014)}${String.fromCharCode(0x2013)}]`);

function strings(value, path = '', out = []) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, path ? `${path}.${k}` : k, out);
  return out;
}

describe('redacción de textos visibles', () => {
  it('sin guiones largos en el contenido de la página', () => {
    const visibleFormOptions = [
      ...CONTACT_METHODS.map((o) => o.label),
      ...INCOME_OPTIONS.map((o) => o.label),
      ...INTEREST_TYPES.map((o) => o.label),
      ...INSURANCE_INTERESTS.map((o) => o.label),
      ...ADVICE_INTERESTS.map((o) => o.label),
      ...Object.values(INTEREST_QUESTIONS),
    ];
    const all = [...strings({ copy, faq, services, privacy, site }), ...strings(visibleFormOptions, 'form')];
    const offending = all.filter(([, text]) => DASHES.test(text));
    expect(offending).toEqual([]);
  });

  it('rangos del simulador escritos como "de 10 a 12 %"', () => {
    expect(copy.simulatorCopy.rateHelp).toBe('Tasa anual sugerida para esta simulación: de 10 a 12 %');
    expect(copy.simulatorCopy.rateAssumption).toContain('El rango de 10 a 12 % es un supuesto ilustrativo indicado por Luis');
  });

  it('accesos de WhatsApp del hero con mensajes exactos', () => {
    expect(copy.heroCopy.shortcuts.map((s) => [s.label, s.message])).toEqual([
      ['Auto', 'Hola Luis, me interesa un seguro de auto.'],
      ['Gastos médicos mayores', 'Hola Luis, me interesa un seguro de gastos médicos mayores.'],
      ['Educación', 'Hola Luis, me interesa un plan para la educación.'],
      ['Hogar', 'Hola Luis, me interesa un seguro de hogar.'],
      ['Seguro de vida', 'Hola Luis, me interesa un seguro de vida.'],
    ]);
  });
});
