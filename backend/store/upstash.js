// Almacenamiento compartido en Upstash Redis mediante su API REST (sin dependencias).
// Acceso privado con token del servidor; nunca exponer la URL/token al navegador.
import { CREATE_LEAD, UPDATE_NOTIFY } from './scripts.js';

export class StoreError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const flatten = (obj) => Object.entries(obj).flatMap(([k, v]) => [k, String(v)]);

export function createUpstashStore({ url, token, fetchImpl = fetch, timeoutMs = 3000 }) {
  const base = url.replace(/\/+$/, '');

  async function call(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(base + path, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new StoreError(controller.signal.aborted ? 'store_timeout' : 'store_network');
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new StoreError(`store_http_${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new StoreError('store_bad_response');
    }
  }

  async function command(...args) {
    const data = await call('', args);
    if (!data || typeof data !== 'object' || 'error' in data) throw new StoreError('store_command');
    return data.result;
  }

  async function transaction(commands) {
    const data = await call('/multi-exec', commands);
    if (!Array.isArray(data)) throw new StoreError('store_transaction');
    return data.map((item) => {
      if (!item || 'error' in item) throw new StoreError('store_command');
      return item.result;
    });
  }

  return {
    kind: 'upstash',
    async get(key) {
      return (await command('GET', key)) ?? null;
    },
    async setNX(key, value, ttlSec) {
      return (await command('SET', key, value, 'EX', String(ttlSec), 'NX')) === 'OK';
    },
    async set(key, value, ttlSec) {
      await command('SET', key, value, 'EX', String(ttlSec));
    },
    async del(key) {
      await command('DEL', key);
    },
    async incrMany(entries) {
      const commands = entries.flatMap(({ key, ttl }) => [
        ['SET', key, '0', 'EX', String(ttl), 'NX'],
        ['INCR', key],
      ]);
      const results = await transaction(commands);
      return entries.map((_, i) => Number(results[i * 2 + 1]));
    },
    async createLead(key, fields, ttlSec) {
      return (await command('EVAL', CREATE_LEAD, '1', key, String(ttlSec), ...flatten(fields))) === 1;
    },
    async hgetall(key) {
      const flat = await command('HGETALL', key);
      if (!Array.isArray(flat) || flat.length === 0) return null;
      const out = {};
      for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
      return out;
    },
    async updateNotify(key, rank, fields, { force = false, sid = '' } = {}) {
      const result = await command(
        'EVAL',
        UPDATE_NOTIFY,
        '1',
        key,
        force ? '1' : '0',
        String(rank),
        sid,
        ...flatten(fields),
      );
      return result === 1 ? 'updated' : result === 0 ? 'stale' : 'missing';
    },
  };
}
