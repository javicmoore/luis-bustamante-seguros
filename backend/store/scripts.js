// Scripts Lua para operaciones atómicas en Redis (Upstash admite EVAL por REST).

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
