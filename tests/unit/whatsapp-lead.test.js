import { describe, expect, it } from 'vitest';
import '../../shared/phone-lib.js';
import { validateLead } from '../../shared/lead-schema.js';
import { WHATSAPP_GREETING, buildWhatsAppMessage, buildWhatsAppUrl } from '../../src/lib/whatsappLead.js';

// Datos ficticios.
const base = { name: 'José Ñúñez Peña', age: '41', income: '30_50', consent: true, website: '' };
const lead = (extra) => {
  const result = validateLead({ ...base, ...extra }, { strict: false });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
};
const decode = (url) => new URL(url).searchParams.get('text');

describe('mensaje de WhatsApp para Luis (se arma en el navegador)', () => {
  it('va al chat de Luis y empieza con el saludo acordado', () => {
    const url = buildWhatsAppUrl(buildWhatsAppMessage(lead({ contactMethod: 'phone', phoneCountry: 'MX', phone: '686 000 0042' })));
    expect(url.startsWith('https://wa.me/526863872193?text=')).toBe(true);
    expect(new URL(url).searchParams.size).toBe(1);
    expect(decode(url).split('\n')[0]).toBe(WHATSAPP_GREETING);
    expect(WHATSAPP_GREETING).toBe('Hola Luis, vengo de tu página y me interesa cotizar un plan de ahorro.');
  });

  it('por teléfono: nombre, edad, ingresos, medio y el teléfono con prefijo; sin correo', () => {
    const text = buildWhatsAppMessage(lead({ contactMethod: 'phone', phoneCountry: 'MX', phone: '686 000 0042' }));
    expect(text).toBe(
      [
        WHATSAPP_GREETING,
        '',
        'Nombre: José Ñúñez Peña',
        'Edad: 41 años',
        'Ingresos mensuales: De $30,000 a menos de $50,000 MXN',
        'Medio de contacto preferido: Teléfono (llamada o WhatsApp)',
        'Teléfono: +52 686 000 0042',
      ].join('\n'),
    );
    expect(text).not.toMatch(/correo|@/i);
  });

  it('teléfono de otro país en formato internacional', () => {
    const text = buildWhatsAppMessage(lead({ contactMethod: 'phone', phoneCountry: 'US', phone: '(213) 373-4253' }));
    expect(text).toContain('Teléfono: +1 213 373 4253');
  });

  it('por correo: el correo y la preferencia de respuesta por correo; sin teléfono', () => {
    const text = buildWhatsAppMessage(lead({ contactMethod: 'email', email: ' Prueba.Ficticia@Ejemplo.COM ', income: '50_mas' }));
    expect(text).toBe(
      [
        WHATSAPP_GREETING,
        '',
        'Nombre: José Ñúñez Peña',
        'Edad: 41 años',
        'Ingresos mensuales: $50,000 MXN o más',
        'Medio de contacto preferido: Correo electrónico',
        'Correo: Prueba.Ficticia@ejemplo.com',
        '',
        'Prefiero que me respondas por correo electrónico, aunque te envío esta solicitud por WhatsApp.',
      ].join('\n'),
    );
    expect(text).not.toMatch(/Teléfono:|\+52/);
  });

  it('codifica acentos, ñ, signos y saltos de línea, y se decodifica igual', () => {
    const message = buildWhatsAppMessage(lead({ contactMethod: 'email', email: 'a+b@ejemplo.com' }));
    const url = buildWhatsAppUrl(message);
    const query = url.split('?text=')[1];
    expect(query).not.toMatch(/[\s\n#&?ñáéíóúÑ$,+@]/);
    expect(query).toContain('%0A');
    expect(query).toContain('%C3%B1'); // ñ en UTF-8
    expect(decodeURIComponent(query)).toBe(message);
    expect(decode(url)).toBe(message);
  });

  it('cada rango de ingresos se describe sin ambigüedad', () => {
    for (const [income, label] of [
      ['20_30', 'De $20,000 a menos de $30,000 MXN'],
      ['30_50', 'De $30,000 a menos de $50,000 MXN'],
      ['50_mas', '$50,000 MXN o más'],
    ]) {
      expect(buildWhatsAppMessage(lead({ income, contactMethod: 'phone', phone: '686 000 0042' }))).toContain(`Ingresos mensuales: ${label}`);
    }
  });
});
