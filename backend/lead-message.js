// Variables de la plantilla de WhatsApp que recibe Luis.
// Solo incluye lo que el formulario solicita, más folio y hora de recepción del servidor.
import { CONTACT_METHOD_BY_VALUE, INCOME_BY_VALUE } from '../shared/lead-schema.js';

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
 * Variables de la plantilla v4 (ver docs/WHATSAPP-TWILIO.md). El encabezado es fijo, "Nuevo
 * prospecto": el formulario no pregunta qué producto busca y nunca se deduce.
 *
 * {{1}} folio · {{2}} nombre · {{3}} edad · {{4}} medio de contacto preferido
 * {{5}} correo o teléfono (E.164 con formato internacional) · {{6}} rango de ingresos · {{7}} recibida
 *
 * El rango de ingresos solo orienta la conversación: no aprueba ni rechaza a nadie.
 */
export function buildNotificationVariables({ leadId, lead, receivedAt }) {
  const method = CONTACT_METHOD_BY_VALUE[lead.contactMethod];
  const contact = lead.contactMethod === 'email' ? lead.email : lead.phoneDisplay;
  return {
    1: templateValue(leadId, 20),
    2: templateValue(lead.name, 80),
    3: templateValue(String(lead.age), 3),
    4: templateValue(method?.notice, 40),
    5: templateValue(contact, 254),
    6: templateValue(INCOME_BY_VALUE[lead.income]?.notice, 60),
    7: templateValue(formatReceivedAt(receivedAt), 60),
  };
}

/** Vista previa del aviso con la plantilla propuesta (pruebas y documentación; no se envía). */
export function previewNotification({ leadId, lead, receivedAt }) {
  const v = buildNotificationVariables({ leadId, lead, receivedAt });
  return [
    'Nuevo prospecto',
    '',
    `Folio: ${v[1]}`,
    `Nombre: ${v[2]}`,
    `Edad: ${v[3]} años`,
    `Contacto preferido: ${v[4]}`,
    `Dato de contacto: ${v[5]}`,
    `Ingresos mensuales: ${v[6]}`,
    `Recibida: ${v[7]}`,
    '',
    'Este aviso se generó automáticamente desde el formulario de tu sitio.',
  ].join('\n');
}

