// Scripts Lua para operaciones atómicas en Redis (Upstash admite EVAL por REST).

// Reserva de cupo todo o nada: incrementa todos los contadores solo si ninguno llegó a su tope y,
// en el mismo paso, guarda la marca de avance (la llave de idempotencia con "ya reservó"). Así una
// interrupción nunca deja un lugar cobrado sin su marca, ni una marca sin su lugar.
// KEYS[1..n]=contadores, KEYS[n+1]=marca (opcional)
// ARGV[1]=n, ARGV[2..n+1]=topes, ARGV[n+2..2n+1]=expiración (s), ARGV[2n+2]=valor de la marca,
// ARGV[2n+3]=expiración de la marca (s)
// → 0 reservado, o la posición (desde 1) del primer contador que ya alcanzó su tope.
export const RESERVE = `
local n = tonumber(ARGV[1])
for i = 1, n do
  local current = tonumber(redis.call('GET', KEYS[i]) or '0') or 0
  if current >= tonumber(ARGV[1 + i]) then return i end
end
for i = 1, n do
  if redis.call('INCR', KEYS[i]) == 1 then redis.call('EXPIRE', KEYS[i], tonumber(ARGV[1 + n + i])) end
end
if #KEYS > n then
  redis.call('SET', KEYS[n + 1], ARGV[2 * n + 2], 'EX', tonumber(ARGV[2 * n + 3]))
end
return 0
`;

// Reemplazo condicional: escribe el valor nuevo solo si la llave conserva exactamente el valor esperado.
// KEYS[1]=llave, ARGV[1]=valor esperado, ARGV[2]=valor nuevo, ARGV[3]=expiración (s) → 1 reemplazado, 0 no.
export const REPLACE_IF_EQUAL = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
`;

// KEYS[1]=lead, ARGV[1]=ttl, ARGV[2..]=campo,valor... → 1 creado, 0 ya existía.
export const CREATE_LEAD = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
local fields = {}
for i = 2, #ARGV do fields[#fields + 1] = ARGV[i] end
redis.call('HSET', KEYS[1], unpack(fields))
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
return 1
`;

// Actualiza el estado de la notificación solo si avanza (los callbacks pueden llegar
// desordenados) y si corresponde al mismo mensaje.
// KEYS[1]=lead, ARGV[1]=force(0|1), ARGV[2]=rango, ARGV[3]=sid esperado ('' = sin control),
// ARGV[4..]=campo,valor... → 1 actualizado, 0 obsoleto, -1 no existe.
export const UPDATE_NOTIFY = `
if redis.call('EXISTS', KEYS[1]) == 0 then return -1 end
local force = ARGV[1] == '1'
local sid = ARGV[3]
if (not force) and sid ~= '' then
  local current = redis.call('HGET', KEYS[1], 'notifySid')
  if current and current ~= '' and current ~= sid then return 0 end
end
local rank = tonumber(redis.call('HGET', KEYS[1], 'notifyRank') or '0') or 0
if (not force) and tonumber(ARGV[2]) < rank then return 0 end
local fields = {'notifyRank', ARGV[2]}
for i = 4, #ARGV do fields[#fields + 1] = ARGV[i] end
redis.call('HSET', KEYS[1], unpack(fields))
return 1
`;
