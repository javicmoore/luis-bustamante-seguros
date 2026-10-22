// Variables de la plantilla de WhatsApp que recibe Luis.
// Solo incluye lo que el formulario solicita, más folio y hora de recepción del servidor.
import { CONTACT_METHOD_BY_VALUE, INCOME_BY_VALUE, INTEREST_BY_VALUE, leadHeadline } from '../shared/lead-schema.js';

const RECEIVED_FORMAT = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Tijuana',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// WhatsApp rechaza variables con saltos de línea, tabuladores o más de 4 espacios seguidos.
export function templateValue(value, max = 120) {
  const clean = String(value ?? '')
    .replace(/[\r\n\t\p{Zl}\p{Zp}\p{Cc}\p{Cf}]+/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max);
  return clean || '—';
}

export function formatReceivedAt(date) {
  return `${RECEIVED_FORMAT.format(date)} (hora de Mexicali)`;
}

/**
 * Variables de la plantilla v3 (ver docs/WHATSAPP-TWILIO.md). WhatsApp no admite una variable al
 * inicio del texto, por eso {{1}} completa "Nuevo prospecto {{1}}" (p. ej. "para GMM").
 *
 * {{1}} complemento del encabezado · {{2}} folio · {{3}} nombre · {{4}} edad
 * {{5}} medio de contacto preferido · {{6}} correo o teléfono (E.164 con formato internacional)
 * {{7}} interés · {{8}} rango de ingresos mensuales · {{9}} recibida
 *
 * El interés es el que eligió la persona; nunca se deduce. El rango de ingresos solo orienta la
 * conversación: no aprueba ni rechaza a nadie.
 */
export function buildNotificationVariables({ leadId, lead, receivedAt }) {
  const interest = INTEREST_BY_VALUE[lead.interest];
  const method = CONTACT_METHOD_BY_VALUE[lead.contactMethod];
  const contact = lead.contactMethod === 'email' ? lead.email : lead.phoneDisplay;
  return {
    1: templateValue(interest?.headline, 40),
    2: templateValue(leadId, 20),
    3: templateValue(lead.name, 80),
    4: templateValue(String(lead.age), 3),
    5: templateValue(method?.notice, 40),
    6: templateValue(contact, 254),
    7: templateValue(interest?.notice, 60),
    8: templateValue(INCOME_BY_VALUE[lead.income]?.notice, 60),
    9: templateValue(formatReceivedAt(receivedAt), 60),
  };
}

/** Vista previa del aviso con la plantilla propuesta (pruebas y documentación; no se envía). */
export function previewNotification({ leadId, lead, receivedAt }) {
  const v = buildNotificationVariables({ leadId, lead, receivedAt });
  return [
    `Nuevo prospecto ${v[1]}`,
    '',
    `Folio: ${v[2]}`,
    `Nombre: ${v[3]}`,
    `Edad: ${v[4]} años`,
    `Contacto preferido: ${v[5]}`,
    `Dato de contacto: ${v[6]}`,
    `Interés: ${v[7]}`,
    `Ingresos mensuales: ${v[8]}`,
    `Recibida: ${v[9]}`,
    '',
    'Este aviso se generó automáticamente desde el formulario de tu sitio.',
  ].join('\n');
}

export { leadHeadline };
