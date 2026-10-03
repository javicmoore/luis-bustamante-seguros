// Recepción de una solicitud válida: idempotencia, registro mínimo y notificación a Luis.
//
// Estados de idempotencia (llave enviada por el navegador en Idempotency-Key):
//   processing → en curso · accepted → notificación aceptada · pending → resultado incierto
//   failed → el proveedor rechazó; un reintento con la misma llave reutiliza el mismo folio.
import { hmacHex, newLeadId } from './crypto.js';
import { checkLeadRate } from './rate-limit.js';
import { buildNotificationVariables } from './lead-message.js';
import { CONSENT_VERSION } from '../shared/lead-schema.js';
import { logEvent } from './log.js';

export const IDEMPOTENCY_TTL = 86400;
const STALE_PROCESSING_MS = 60_000;
const DAY = 86400;

// Orden de estados de la notificación (los callbacks pueden llegar desordenados).
export const NOTIFY_RANK = Object.freeze({
  notifying: 0,
  send_failed: 1,
  uncertain: 1,
  accepted: 2,
  queued: 2,
  sending: 3,
  sent: 4,
  delivered: 5,
  read: 6,
  undelivered: 7,
  failed: 7,
  canceled: 7,
});

const leadKey = (id) => `lead:${id}`;

function received(leadId, notification, demo, replayed) {
  const body = { ok: true, status: 'received', id: leadId, notification };
  if (demo) body.demo = true;
  if (replayed) body.replayed = true;
  return { status: notification === 'accepted' ? 201 : 202, body };
}

function parseRecord(raw) {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

async function createLeadRecord(store, lead, config, receivedAt) {
  const ttl = config.retentionDays * DAY;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = newLeadId();
    const created = await store.createLead(
      leadKey(id),
      {
        id,
        receivedAt: receivedAt.toISOString(),
        name: lead.name,
        age: lead.age,
        phone: lead.phoneE164,
        savings: lead.savings,
        consentAt: receivedAt.toISOString(),
        consentVersion: CONSENT_VERSION,
        notify: 'notifying',
        notifyRank: NOTIFY_RANK.notifying,
      },
      ttl,
    );
    if (created) return id;
  }
  throw new Error('lead_id_collision');
}

/**
 * @param {object} args
 * @param {object} args.lead       Solicitud validada y normalizada.
 * @param {string} args.idempotencyKey
 * @param {string} args.ipHash     Seudónimo HMAC de la IP.
 * @param {object} args.deps       { store, notifier, config, now? }
 */
export async function processLead({ lead, idempotencyKey, ipHash, deps }) {
  const { store, notifier, config } = deps;
  const now = deps.now ?? (() => new Date());
  const demo = Boolean(notifier.demo);
  const fingerprint = hmacHex(
    config.hashSecret,
    JSON.stringify([lead.name, lead.age, lead.phoneE164, lead.savings]),
  );
  const idemKey = `idem:${idempotencyKey}`;
  const saveState = (state) =>
    store.set(idemKey, JSON.stringify({ ...state, fp: fingerprint, at: now().getTime() }), IDEMPOTENCY_TTL);

  let existing = null;
  const existingRaw = await store.get(idemKey);
  if (existingRaw) {
    existing = parseRecord(existingRaw);
    if (!existing || existing.fp !== fingerprint) {
      return { status: 422, body: { ok: false, error: 'idempotency_mismatch' } };
    }
    if (existing.state === 'accepted') return received(existing.leadId, 'accepted', demo, true);
    if (existing.state === 'pending') return received(existing.leadId, 'pending', demo, true);
    if (existing.state === 'processing') {
      const stale = now().getTime() - Number(existing.at || 0) > STALE_PROCESSING_MS;
      if (!stale) return { status: 409, body: { ok: false, error: 'in_progress' } };
      if (existing.leadId) {
        // Una ejecución anterior se interrumpió tras registrar: el aviso es incierto.
        await saveState({ state: 'pending', leadId: existing.leadId });
        return received(existing.leadId, 'pending', demo, true);
      }
      await store.del(idemKey);
      existing = null;
    }
  }

  let leadId;
  let receivedAt = now();

  if (!existing) {
    const phoneHash = hmacHex(config.hashSecret, lead.phoneE164).slice(0, 32);
    const limit = await checkLeadRate(store, {
      ipHash,
      phoneHash,
      dailyCap: config.dailyCap,
      nowMs: receivedAt.getTime(),
    });
    if (limit.limited) {
      logEvent('lead_rate_limited', { rule: limit.rule });
      return {
        status: 429,
        body: { ok: false, error: 'rate_limited' },
        headers: { 'Retry-After': String(limit.retryAfter) },
      };
    }
    const claimed = await store.setNX(
      idemKey,
      JSON.stringify({ state: 'processing', fp: fingerprint, at: receivedAt.getTime() }),
      IDEMPOTENCY_TTL,
    );
    if (!claimed) return { status: 409, body: { ok: false, error: 'in_progress' } };
    leadId = await createLeadRecord(store, lead, config, receivedAt);
    await saveState({ state: 'processing', leadId });
    logEvent('lead_received', { leadId, store: store.kind });
  } else {
    // Reintento tras un rechazo del proveedor: mismo folio, sin duplicar el registro.
    const locked = await store.setNX(`lock:${idempotencyKey}`, '1', 30);
    if (!locked) return { status: 409, body: { ok: false, error: 'in_progress' } };
    leadId = existing.leadId;
    const record = await store.hgetall(leadKey(leadId));
    if (!record) {
      await store.del(idemKey);
      return { status: 409, body: { ok: false, error: 'expired' } };
    }
    receivedAt = new Date(record.receivedAt);
    await saveState({ state: 'processing', leadId });
    await store.updateNotify(
      leadKey(leadId),
      NOTIFY_RANK.notifying,
      { notify: 'notifying', attempts: Number(record.attempts || 1) + 1 },
      { force: true },
    );
    logEvent('lead_retry', { leadId });
  }

  const statusCallbackUrl =
    config.provider === 'twilio' && config.statusCallbacks && config.statusCallbackBase
      ? `${config.statusCallbackBase}/api/twilio-status?lead=${encodeURIComponent(leadId)}`
      : undefined;

  const result = await notifier.send({
    variables: buildNotificationVariables({ leadId, lead, receivedAt }),
    statusCallbackUrl,
  });
  const updatedAt = now().toISOString();

  try {
    if (result.outcome === 'accepted') {
      await store.updateNotify(
        leadKey(leadId),
        NOTIFY_RANK.accepted,
        { notify: 'accepted', notifySid: result.sid, notifyUpdatedAt: updatedAt },
        { sid: result.sid },
      );
      await saveState({ state: 'accepted', leadId });
    } else if (result.outcome === 'failed') {
      await store.updateNotify(leadKey(leadId), NOTIFY_RANK.send_failed, {
        notify: 'send_failed',
        notifyError: result.code ?? result.reason,
        notifyUpdatedAt: updatedAt,
      });
      await saveState({ state: 'failed', leadId });
    } else {
      await store.updateNotify(leadKey(leadId), NOTIFY_RANK.uncertain, {
        notify: 'uncertain',
        notifyError: result.reason,
        notifyUpdatedAt: updatedAt,
      });
      await saveState({ state: 'pending', leadId });
    }
  } catch (error) {
    // El registro y la notificación ya ocurrieron; solo falló la actualización de estado.
    logEvent('lead_state_update_failed', { leadId, reason: error?.code || 'unknown' });
  } finally {
    if (existing) await store.del(`lock:${idempotencyKey}`).catch(() => {});
  }

  logEvent('lead_notification', {
    leadId,
    outcome: result.outcome,
    reason: result.reason,
    code: result.code ?? undefined,
    provider: notifier.name,
  });

  if (result.outcome === 'accepted') return received(leadId, 'accepted', demo, false);
  if (result.outcome === 'uncertain') return received(leadId, 'pending', demo, false);
  return { status: 502, body: { ok: false, error: 'notification_failed', id: leadId } };
}
