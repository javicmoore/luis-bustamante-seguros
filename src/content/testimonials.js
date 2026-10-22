// Testimonios reales de clientes de Luis, con autorización verificable.
// No copiar testimonios de terceros ni generar nombres, frases, fotos o estrellas.
//
// Forma: { id, quote, name, context?, authorized: true, authorizationRef: 'dónde consta' }
//   name: tal como el cliente autorizó mostrarlo (p. ej. nombre e inicial del apellido).
//   quote: palabras del cliente sin cambios, separadas en párrafos por idea (sin saltos forzados).
//
// Entregados por Javier el 19 de octubre de 2026 para publicarse. La constancia escrita de
// autorización de cada cliente sigue pendiente en src/content/launch.js.
export const testimonials = [
  {
    id: 'karla-g',
    name: 'Karla G.',
    context: 'Profesionista independiente',
    quote: [
      '“Antes veía el retiro como algo muy lejano. Hoy entiendo la importancia de empezar a prepararme desde ahora y construir poco a poco un respaldo para mi futuro.',
      'Agradezco a Luis por explicarme todo de manera clara y puntual.”',
    ],
    authorized: true,
    authorizationRef: 'Entregado por Javier (19 oct 2026); constancia escrita pendiente.',
  },
  {
    id: 'sergio-c',
    name: 'Sergio C.',
    context: 'Ingeniero',
    quote: [
      '“Lo que más me gustó de este plan es poder establecer una estrategia de ahorro acorde con mis ingresos y objetivos financieros.',
      'Desde el principio, Luis me explicó cómo funciona y qué aspectos debía considerar antes de tomar una decisión.”',
    ],
    authorized: true,
    authorizationRef: 'Entregado por Javier (19 oct 2026); constancia escrita pendiente.',
  },
  {
    id: 'alberto-g',
    name: 'Alberto G.',
    context: 'Empresario',
    quote: [
      '“No quería otro seguro más. Le dije a Luis que buscaba algo que me sirviera a mí.',
      'Me enseñó cómo separar mi ahorro para mi retiro y a la vez dejar una base para la educación de mis hijos.',
      'Ahora todo lo que ahorro tiene un para qué.”',
    ],
    authorized: true,
    authorizationRef: 'Entregado por Javier (19 oct 2026); constancia escrita pendiente.',
  },
];

// Si Javier decide publicar sin testimonios, cambiar a 'omitir' (decisión explícita).
export const testimonialsDecision = null;

export function getPublishableTestimonials(list = testimonials) {
  return list.filter((t) => t.authorized === true && t.name && (Array.isArray(t.quote) ? t.quote.length > 0 : t.quote));
}
