// Testimonios reales de clientes de Luis, con autorización verificable.
// No copiar testimonios de terceros ni generar nombres, frases, fotos o estrellas.
//
// Forma: { id, quote, name, context?, authorized: true, authorizationRef: 'dónde consta' }
//   name: tal como el cliente autorizó mostrarlo (p. ej. nombre e inicial del apellido).
export const testimonials = [];

// Si Javier decide publicar sin testimonios, cambiar a 'omitir' (decisión explícita).
export const testimonialsDecision = null;

export function getPublishableTestimonials(list = testimonials) {
  return list.filter((t) => t.authorized === true && t.quote && t.name);
}
