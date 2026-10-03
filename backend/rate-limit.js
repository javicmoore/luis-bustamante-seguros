// Límites de uso con ventanas fijas en almacenamiento compartido.
// Las llaves usan seudónimos HMAC de IP y teléfono (nunca valores en claro) y expiran solas.

const TEN_MINUTES = 600;
const DAY = 86400;

const windowStart = (nowMs, sizeSec) => Math.floor(nowMs / 1000 / sizeSec);
const secondsLeft = (nowMs, sizeSec) => sizeSec - (Math.floor(nowMs / 1000) % sizeSec);

/** Límite general por IP para cualquier POST (incluye inválidos y reintentos). */
export async function checkRequestRate(store, { ipHash, nowMs = Date.now(), limit = 30 }) {
  const [count] = await store.incrMany([
    { key: `rl:req:${ipHash}:${windowStart(nowMs, TEN_MINUTES)}`, ttl: TEN_MINUTES },
  ]);
  return count > limit
    ? { limited: true, retryAfter: secondsLeft(nowMs, TEN_MINUTES), rule: 'requests' }
    : { limited: false };
}

/** Límites para solicitudes nuevas y válidas (las que pueden generar una notificación). */
export async function checkLeadRate(store, { ipHash, phoneHash, dailyCap, nowMs = Date.now() }) {
  const day = windowStart(nowMs, DAY);
  const rules = [
    { rule: 'ip_10min', limit: 5, size: TEN_MINUTES, key: `rl:ip:${ipHash}:${windowStart(nowMs, TEN_MINUTES)}` },
    { rule: 'ip_day', limit: 20, size: DAY, key: `rl:ipd:${ipHash}:${day}` },
    { rule: 'phone_day', limit: 3, size: DAY, key: `rl:ph:${phoneHash}:${day}` },
    { rule: 'global_day', limit: dailyCap, size: DAY, key: `rl:all:${day}` },
  ];
  const counts = await store.incrMany(rules.map(({ key, size }) => ({ key, ttl: size })));
  for (let i = 0; i < rules.length; i += 1) {
    if (counts[i] > rules[i].limit) {
      return { limited: true, retryAfter: secondsLeft(nowMs, rules[i].size), rule: rules[i].rule };
    }
  }
  return { limited: false };
}
