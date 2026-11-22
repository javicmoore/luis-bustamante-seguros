// Mensaje de WhatsApp para Luis, armado en el navegador con los datos ya validados del formulario.
// Nada de esto pasa por el servidor: la persona revisa el mensaje en WhatsApp y decide si lo envía.
import { CONTACT_METHOD_BY_VALUE, INCOME_BY_VALUE } from '../../shared/lead-schema.js';
import { site } from '../content/site.js';

export const WHATSAPP_GREETING = 'Hola Luis, vengo de tu página y me interesa cotizar un plan de ahorro.';

/**
 * @param {object} lead valor normalizado de validateLead (name, age, contactMethod, email, phoneDisplay, income)
 * @returns {string} texto con saltos de línea; solo incluye el dato del medio elegido.
 */
export function buildWhatsAppMessage(lead) {
  const lines = [
    WHATSAPP_GREETING,
    '',
    `Nombre: ${lead.name}`,
    `Edad: ${lead.age} años`,
    `Ingresos mensuales: ${INCOME_BY_VALUE[lead.income].notice}`,
    `Medio de contacto preferido: ${CONTACT_METHOD_BY_VALUE[lead.contactMethod].notice}`,
  ];
  if (lead.contactMethod === 'email') {
    lines.push(
      `Correo: ${lead.email}`,
      '',
      'Prefiero que me respondas por correo electrónico, aunque te envío esta solicitud por WhatsApp.',
    );
  } else {
    lines.push(`Teléfono: ${lead.phoneDisplay}`);
  }
  return lines.join('\n');
}

/** Enlace al chat de Luis con el mensaje en el parámetro `text` (codificado). */
export function buildWhatsAppUrl(message) {
  return `${site.whatsapp.href}?text=${encodeURIComponent(message)}`;
}
