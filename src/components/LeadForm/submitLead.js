// Cliente del endpoint POST /api/leads. Solo envía los datos del formulario: el servidor
// decide destinatario, plantilla y credenciales.

export const CLIENT_TIMEOUT_MS = 15000;

function uuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Misma llave de idempotencia mientras los datos no cambien: un reintento tras timeout o
 * fallo nunca genera una segunda solicitud.
 */
export function createIdempotencyTracker() {
  let last = null;
  return (fingerprint) => {
    if (!last || last.fingerprint !== fingerprint) last = { fingerprint, key: uuidV4() };
    return last.key;
  };
}

/**
 * @returns {Promise<{ kind: 'response', status: number, data: any } | { kind: 'timeout' } | { kind: 'network' }>}
 */
export async function submitLead(payload, idempotencyKey, { timeoutMs = CLIENT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { kind: 'response', status: response.status, data };
  } catch {
    return controller.signal.aborted ? { kind: 'timeout' } : { kind: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
