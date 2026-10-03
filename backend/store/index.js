import { createUpstashStore } from './upstash.js';
import { createMemoryStore } from './memory.js';

const instances = new Map();

/** Reutiliza el cliente entre invocaciones de la misma instancia. */
export function getStore(storeConfig) {
  if (!storeConfig) throw new Error('store_not_configured');
  const cacheKey = storeConfig.kind === 'upstash' ? `upstash:${storeConfig.url}` : 'memory';
  if (!instances.has(cacheKey)) {
    instances.set(
      cacheKey,
      storeConfig.kind === 'upstash' ? createUpstashStore(storeConfig) : createMemoryStore(),
    );
  }
  return instances.get(cacheKey);
}
