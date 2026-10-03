// Registro estructurado SIN datos personales: solo eventos, folios, estados y códigos.
// Nunca pasar nombre, edad, teléfono, IP ni cuerpos de respuesta del proveedor.
const ALLOWED_KEYS = new Set([
  'leadId',
  'status',
  'outcome',
  'reason',
  'code',
  'provider',
  'store',
  'rule',
  'problems',
  'replayed',
  'attempt',
]);

export function logEvent(event, data = {}) {
  const safe = { event };
  for (const [key, value] of Object.entries(data)) {
    if (ALLOWED_KEYS.has(key) && value !== undefined) safe[key] = value;
  }
  console.log(JSON.stringify(safe));
}
