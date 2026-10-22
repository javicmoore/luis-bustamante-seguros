// Genera shared/countries.js: países con su prefijo telefónico y nombre en español.
// Se ejecuta una sola vez (o al actualizar libphonenumber-js); el resultado se versiona para que
// servidor y navegador muestren exactamente la misma lista (sin depender del ICU de cada uno).
// Uso: node scripts/generate-countries.mjs
import { writeFile } from 'node:fs/promises';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js/min';

const names = new Intl.DisplayNames(['es-MX'], { type: 'region' });
const TOP = ['MX', 'US', 'CA'];
const all = getCountries()
  .map((code) => ({ code, name: names.of(code) || code, dial: getCountryCallingCode(code) }))
  .filter((c) => c.name && c.name !== c.code);
const collator = new Intl.Collator('es');
const rest = all.filter((c) => !TOP.includes(c.code)).sort((a, b) => collator.compare(a.name, b.name));
const list = [...TOP.map((code) => all.find((c) => c.code === code)), ...rest];

const body = `// Generado por scripts/generate-countries.mjs; no editar a mano.
// Países con prefijo telefónico (libphonenumber-js) y nombre en español. México va primero.
export const COUNTRIES = Object.freeze([
${list.map((c) => `  { code: '${c.code}', name: ${JSON.stringify(c.name)}, dial: '${c.dial}' },`).join('\n')}
]);

export const COUNTRY_BY_CODE = Object.freeze(Object.fromEntries(COUNTRIES.map((c) => [c.code, c])));
`;
await writeFile('shared/countries.js', body);
console.log(`${list.length} países`);
