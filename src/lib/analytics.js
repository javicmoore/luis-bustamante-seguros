// Eventos de captación SIN datos personales. No hay píxel ni Analytics instalado:
// si en el futuro se agrega una herramienta autorizada (p. ej. GTM con dataLayer), recibirá
// solo estos eventos y propiedades permitidas. Ver README → "Medición".
const ALLOWED = {
  page_view: [],
  simulator_interaction: ['control'],
  // El formulario no registra eventos: prepara el mensaje de WhatsApp en el navegador y la página no
  // puede saber si la persona lo envió, así que no hay conversión que medir ni datos que reportar.
};

export function track(name, props = {}) {
  if (typeof window === 'undefined' || !(name in ALLOWED)) return;
  const detail = { event: name };
  for (const key of ALLOWED[name]) {
    if (props[key] != null) detail[key] = String(props[key]).slice(0, 40);
  }
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
  window.dispatchEvent(new CustomEvent('lb:analytics', { detail }));
  if (import.meta.env.DEV) console.debug('[analytics]', detail);
}
