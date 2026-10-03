// POST /api/leads — controles HTTP antes de procesar la solicitud.
// Toda petición se trata como no confiable, aunque no venga de la interfaz.
import { resolveLeadConfig, isAllowedOrigin } from './config.js';
import { json, readBodyText, mediaType, clientIp, PayloadTooLargeError } from './http.js';
import { hmacHex, UUID_PATTERN } from './crypto.js';
import { checkRequestRate } from './rate-limit.js';
import { validateLead } from '../shared/lead-schema.js';
import { processLead } from './leads-service.js';
import { getStore } from './store/index.js';
import { getNotifier } from './notify/index.js';
import { StoreError } from './store/upstash.js';
import { logEvent } from './log.js';

export const MAX_LEAD_BODY_BYTES = 2048;

export function createLeadsHandler({ env = process.env, store: injectedStore, notifier: injectedNotifier, now } = {}) {
  return async function handleLeads(request) {
    if (request.method !== 'POST') {
      return json(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });
    }

    // Despliegue de demostración: no se lee el cuerpo, no se guarda nada y no se notifica.
    if (env.SITE_MODE === 'demo') return json(503, { ok: false, error: 'demo' });

    const config = resolveLeadConfig(env);

    // Defensa adicional (no es autenticación): solo el propio sitio envía el formulario.
    const origin = request.headers.get('origin');
    if (!isAllowedOrigin(origin, env, config.allowedOrigins)) {
      return json(403, { ok: false, error: 'forbidden' });
    }
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin') return json(403, { ok: false, error: 'forbidden' });

    if (mediaType(request) !== 'application/json') {
      return json(415, { ok: false, error: 'unsupported_media_type' });
    }

    if (!config.ok) {
      // Configuración ausente en producción: fallo controlado, nunca éxito ficticio.
      logEvent('lead_config_error', { problems: config.problems });
      return json(503, { ok: false, error: 'unavailable' });
    }

    let text;
    try {
      text = await readBodyText(request, MAX_LEAD_BODY_BYTES);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) return json(413, { ok: false, error: 'payload_too_large' });
      return json(400, { ok: false, error: 'invalid_body' });
    }

    const idempotencyKey = request.headers.get('idempotency-key') || '';
    if (!UUID_PATTERN.test(idempotencyKey)) {
      return json(400, { ok: false, error: 'invalid_idempotency_key' });
    }

    const store = injectedStore ?? getStore(config.store);
    const ipHash = hmacHex(config.hashSecret, clientIp(request)).slice(0, 32);

    try {
      const rate = await checkRequestRate(store, { ipHash });
      if (rate.limited) {
        logEvent('lead_rate_limited', { rule: rate.rule });
        return json(429, { ok: false, error: 'rate_limited' }, { 'Retry-After': String(rate.retryAfter) });
      }
    } catch (error) {
      logEvent('lead_store_error', { reason: error?.code || 'unknown' });
      return json(503, { ok: false, error: 'unavailable' });
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return json(400, { ok: false, error: 'invalid_json' });
    }

    const result = validateLead(payload, { strict: true });
    if (!result.ok) {
      if (result.honeypot) {
        logEvent('lead_rejected', { reason: 'honeypot' });
        return json(400, { ok: false, error: 'rejected' });
      }
      if (result.unexpected) {
        logEvent('lead_rejected', { reason: 'unexpected_field' });
        return json(400, { ok: false, error: 'unexpected_field' });
      }
      return json(400, { ok: false, error: 'invalid', fields: result.errors });
    }

    try {
      const notifier = injectedNotifier ?? getNotifier(config);
      const outcome = await processLead({
        lead: result.value,
        idempotencyKey,
        ipHash,
        deps: { store, notifier, config, now },
      });
      return json(outcome.status, outcome.body, outcome.headers);
    } catch (error) {
      if (error instanceof StoreError) {
        logEvent('lead_store_error', { reason: error.code });
        return json(503, { ok: false, error: 'unavailable' });
      }
      // Solo el tipo de error: el mensaje podría arrastrar datos de la solicitud.
      logEvent('lead_internal_error', { reason: error?.name || 'Error' });
      return json(500, { ok: false, error: 'internal' });
    }
  };
}
