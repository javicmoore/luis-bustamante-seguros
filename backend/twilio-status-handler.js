// POST /api/twilio-status?lead=LB-XXXXXXXX — callback de estado de Twilio.
// Verifica la firma, la cuenta y repeticiones; registra el estado sin datos personales.
// "accepted"/"queued" no significan entrega: los fallos llegan como failed/undelivered.
import { resolveStatusConfig } from './config.js';
import { empty, json, readBodyText, mediaType } from './http.js';
import { sha256Hex, LEAD_ID_PATTERN } from './crypto.js';
import { validateTwilioRequest, formParams } from './twilio-signature.js';
import { NOTIFY_RANK } from './leads-service.js';
import { getStore } from './store/index.js';
import { logEvent } from './log.js';

const CALLBACK_STATUSES = ['queued', 'sending', 'sent', 'delivered', 'read', 'undelivered', 'failed', 'canceled'];

export function createTwilioStatusHandler({ env = process.env, store: injectedStore, now = () => new Date() } = {}) {
  return async function handleStatus(request) {
    if (request.method !== 'POST') return json(405, { ok: false }, { Allow: 'POST' });

    if (env.SITE_MODE === 'demo') return empty(503);

    const config = resolveStatusConfig(env);
    if (!config.ok) {
      logEvent('status_config_error', { problems: config.problems });
      return empty(503);
    }
    if (mediaType(request) !== 'application/x-www-form-urlencoded') return empty(415);

    let text;
    try {
      text = await readBodyText(request, 16 * 1024);
    } catch {
      return empty(413);
    }
    const params = formParams(text);

    const signature = request.headers.get('x-twilio-signature') || '';
    const url = new URL(request.url);
    const candidates = [request.url];
    if (config.publicBase) candidates.push(`${config.publicBase}${url.pathname}${url.search}`);
    const valid = candidates.some((candidate) =>
      validateTwilioRequest(config.authToken, signature, candidate, params),
    );
    if (!valid) {
      logEvent('status_signature_invalid');
      return empty(403);
    }
    if (params.AccountSid !== config.accountSid) {
      logEvent('status_account_mismatch');
      return empty(403);
    }

    const store = injectedStore ?? getStore(config.store);
    try {
      // Repetición: Twilio identifica cada intento de webhook con este token.
      const replayToken = request.headers.get('i-twilio-idempotency-token');
      if (replayToken) {
        const fresh = await store.setNX(`cb:${sha256Hex(replayToken)}`, '1', 2 * 86400);
        if (!fresh) return empty(200);
      }

      const leadId = url.searchParams.get('lead') || '';
      const status = String(params.MessageStatus || '').toLowerCase();
      if (!LEAD_ID_PATTERN.test(leadId) || !CALLBACK_STATUSES.includes(status)) {
        logEvent('status_ignored', { reason: 'unknown_lead_or_status' });
        return empty(200);
      }

      const sid = /^(SM|MM)[0-9a-f]{32}$/i.test(params.MessageSid || '') ? params.MessageSid : '';
      const errorCode = /^\d{3,6}$/.test(params.ErrorCode || '') ? params.ErrorCode : null;
      const fields = { notify: status, notifyUpdatedAt: now().toISOString() };
      if (sid) fields.notifySid = sid;
      if (errorCode) fields.notifyError = errorCode;

      const outcome = await store.updateNotify(`lead:${leadId}`, NOTIFY_RANK[status], fields, { sid });
      logEvent('lead_notification_status', { leadId, status, code: errorCode ?? undefined, outcome });
      if (status === 'failed' || status === 'undelivered') {
        logEvent('lead_notification_undelivered', { leadId, code: errorCode ?? undefined });
      }
      return empty(200);
    } catch (error) {
      logEvent('status_store_error', { reason: error?.code || 'unknown' });
      // 5xx: Twilio puede reintentar según su política de conexión.
      return empty(503);
    }
  };
}
