// Adaptador de notificación: Twilio Messages API + plantilla de contenido de WhatsApp.
// Docs verificadas (oct-2026): POST /2010-04-01/Accounts/{AccountSid}/Messages.json con
// To/From "whatsapp:+E164", ContentSid (HX…) y ContentVariables (JSON en texto).
// Fuera de la ventana de 24 h WhatsApp exige una plantilla APROBADA.
//
// Resultados:
//   accepted  → Twilio creó el mensaje (aceptado ≠ entregado; la entrega llega por callback).
//   failed    → rechazo definitivo (4xx) o error de red antes de enviar: no hubo mensaje.
//   uncertain → timeout, 5xx o red a mitad de la petición: pudo o no crearse. No reintentar a ciegas.

const API_BASE = 'https://api.twilio.com/2010-04-01';
const CONNECT_FAILURES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'UND_ERR_CONNECT_TIMEOUT',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

export function createTwilioWhatsAppNotifier(cfg, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const endpoint = `${API_BASE}/Accounts/${encodeURIComponent(cfg.accountSid)}/Messages.json`;
  const authorization = `Basic ${Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString('base64')}`;

  return {
    name: 'twilio-whatsapp',
    demo: false,
    async send({ variables, statusCallbackUrl }) {
      const body = new URLSearchParams();
      body.set('To', `whatsapp:${cfg.to}`);
      body.set('From', `whatsapp:${cfg.from}`);
      body.set('ContentSid', cfg.contentSid);
      body.set('ContentVariables', JSON.stringify(variables));
      if (statusCallbackUrl) body.set('StatusCallback', statusCallbackUrl);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body,
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) return { outcome: 'uncertain', reason: 'timeout' };
        const code = error?.cause?.code || error?.code;
        if (CONNECT_FAILURES.has(code)) return { outcome: 'failed', reason: 'connect_failed' };
        return { outcome: 'uncertain', reason: 'network' };
      } finally {
        clearTimeout(timer);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.status === 201 || response.status === 200) {
        const sid = typeof data?.sid === 'string' && /^(SM|MM)[0-9a-f]{32}$/i.test(data.sid) ? data.sid : null;
        if (!sid) return { outcome: 'uncertain', reason: 'unexpected_response' };
        return { outcome: 'accepted', sid, providerStatus: String(data.status || 'queued') };
      }
      if (response.status >= 500) return { outcome: 'uncertain', reason: `http_${response.status}` };
      return {
        outcome: 'failed',
        reason: `http_${response.status}`,
        code: Number.isInteger(data?.code) ? data.code : null,
      };
    },
  };
}
