import { describe, expect, it, vi } from 'vitest';
import { createUpstashStore, StoreError } from '../../backend/store/upstash.js';

const ok = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('cliente REST de Upstash', () => {
  it('envía comandos como arreglo JSON con token Bearer', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ result: 'OK' }));
    const store = createUpstashStore({ url: 'https://demo.upstash.io/', token: 'tkn', fetchImpl });
    expect(await store.setNX('idem:k', 'v', 86400)).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://demo.upstash.io');
    expect(init.headers.Authorization).toBe('Bearer tkn');
    expect(JSON.parse(init.body)).toEqual(['SET', 'idem:k', 'v', 'EX', '86400', 'NX']);
  });

  it('usa /multi-exec para contadores con expiración', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok([{ result: 'OK' }, { result: 1 }, { result: null }, { result: 4 }]));
    const store = createUpstashStore({ url: 'https://demo.upstash.io', token: 't', fetchImpl });
    const counts = await store.incrMany([
      { key: 'a', ttl: 600 },
      { key: 'b', ttl: 86400 },
    ]);
    expect(counts).toEqual([1, 4]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://demo.upstash.io/multi-exec');
    expect(JSON.parse(init.body)).toEqual([
      ['SET', 'a', '0', 'EX', '600', 'NX'],
      ['INCR', 'a'],
      ['SET', 'b', '0', 'EX', '86400', 'NX'],
      ['INCR', 'b'],
    ]);
  });

  it('convierte errores HTTP, de comando y timeouts en StoreError', async () => {
    const http = createUpstashStore({ url: 'https://d.io', token: 't', fetchImpl: vi.fn().mockResolvedValue(new Response('', { status: 401 })) });
    await expect(http.get('k')).rejects.toBeInstanceOf(StoreError);
    const cmd = createUpstashStore({ url: 'https://d.io', token: 't', fetchImpl: vi.fn().mockResolvedValue(ok({ error: 'ERR' })) });
    await expect(cmd.get('k')).rejects.toMatchObject({ code: 'store_command' });
    const slow = createUpstashStore({
      url: 'https://d.io',
      token: 't',
      timeoutMs: 10,
      fetchImpl: (u, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('abort')))),
    });
    await expect(slow.get('k')).rejects.toMatchObject({ code: 'store_timeout' });
  });

  it('crea el registro con un script atómico y expiración', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ result: 1 }));
    const store = createUpstashStore({ url: 'https://d.io', token: 't', fetchImpl });
    expect(await store.createLead('lead:LB-1', { id: 'LB-1', age: 34 }, 2592000)).toBe(true);
    const cmd = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(cmd[0]).toBe('EVAL');
    expect(cmd.slice(2)).toEqual(['1', 'lead:LB-1', '2592000', 'id', 'LB-1', 'age', '34']);
  });
});
