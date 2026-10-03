// Variables de la plantilla de WhatsApp que recibe Luis.
// Solo incluye lo que el formulario solicita, más folio y hora de recepción del servidor.
import { SAVINGS_LABELS } from '../shared/lead-schema.js';

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
 * {{1}} folio · {{2}} nombre · {{3}} edad · {{4}} teléfono · {{5}} ahorro/retiro · {{6}} recibida
 */
export function buildNotificationVariables({ leadId, lead, receivedAt }) {
  return {
    1: templateValue(leadId, 20),
    2: templateValue(lead.name, 80),
    3: templateValue(String(lead.age), 3),
    4: templateValue(lead.phoneDisplay, 24),
    5: templateValue(SAVINGS_LABELS[lead.savings], 40),
    6: templateValue(formatReceivedAt(receivedAt), 60),
  };
}
