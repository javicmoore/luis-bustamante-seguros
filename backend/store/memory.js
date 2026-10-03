// Almacenamiento en memoria SOLO para desarrollo y pruebas (modo demostración).
// No es compartido entre instancias serverless: config.js impide usarlo en producción.

export function createMemoryStore({ now = () => Date.now() } = {}) {
  const data = new Map();

  const alive = (key) => {
    const entry = data.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= now()) {
      data.delete(key);
      return null;
    }
    return entry;
  };
  const expiry = (ttlSec) => (ttlSec ? now() + ttlSec * 1000 : null);

  return {
    kind: 'memory',
    async get(key) {
      const entry = alive(key);
      return entry && typeof entry.value === 'string' ? entry.value : null;
    },
    async setNX(key, value, ttlSec) {
      if (alive(key)) return false;
      data.set(key, { value: String(value), expiresAt: expiry(ttlSec) });
      return true;
    },
    async set(key, value, ttlSec) {
      data.set(key, { value: String(value), expiresAt: expiry(ttlSec) });
    },
    async del(key) {
      data.delete(key);
    },
    async incrMany(entries) {
      return entries.map(({ key, ttl }) => {
        const entry = alive(key);
        if (!entry) {
          data.set(key, { value: '1', expiresAt: expiry(ttl) });
          return 1;
        }
        const next = Number(entry.value) + 1;
        entry.value = String(next);
        return next;
      });
    },
    async createLead(key, fields, ttlSec) {
      if (alive(key)) return false;
      const hash = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)]));
      data.set(key, { value: hash, expiresAt: expiry(ttlSec) });
      return true;
    },
    async hgetall(key) {
      const entry = alive(key);
      return entry && typeof entry.value === 'object' ? { ...entry.value } : null;
    },
    async updateNotify(key, rank, fields, { force = false, sid = '' } = {}) {
      const entry = alive(key);
      if (!entry || typeof entry.value !== 'object') return 'missing';
      const hash = entry.value;
      if (!force && sid && hash.notifySid && hash.notifySid !== sid) return 'stale';
      if (!force && rank < Number(hash.notifyRank || 0)) return 'stale';
      hash.notifyRank = String(rank);
      for (const [k, v] of Object.entries(fields)) hash[k] = String(v);
      return 'updated';
    },
    // Solo para pruebas.
    _dump() {
      return data;
    },
  };
}
