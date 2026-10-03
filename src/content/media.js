// Fotografías y video reales de Luis.
//
// No hay archivos entregados todavía: los componentes muestran un monograma tipográfico
// (sin rostro) en el lugar del retrato. NUNCA usar fotos de terceros ni caras generadas.
//
// Para agregar fotos: coloca los originales en media-originales/ y ejecuta
//   npm run images -- media-originales/luis-hero.jpg --name luis-hero
// El script genera AVIF/WebP/JPG en public/media/ e imprime el objeto para pegar aquí.
//
// Forma esperada de cada imagen:
// {
//   alt: 'Luis Bustamante, agente de seguros, ...',
//   width: 1600, height: 2000,                // proporciones del original procesado
//   avif: [{ src: '/media/luis-hero-640.avif', w: 640 }, ...],
//   webp: [{ src: '/media/luis-hero-640.webp', w: 640 }, ...],
//   fallback: '/media/luis-hero-1080.jpg',
//   focus: 'upper',                           // encuadre: 'top' | 'upper' | 'center'
// }
export const media = {
  heroPortrait: null,
  aboutPortrait: null,
};

// Video de presentación. preload="none" + póster: no se descarga hasta que el visitante
// decide reproducirlo.
export const video = {
  src: null, // '/media/luis-presentacion.mp4' (o URL de un host autorizado; actualizar CSP)
  type: 'video/mp4',
  poster: null, // imagen optimizada (WebP/JPG) con las mismas proporciones
  width: 1920,
  height: 1080,
  captions: null, // '/media/luis-presentacion.es.vtt'
  // Si Javier decide publicar sin video, cambiar a 'omitir' (decisión explícita).
  decision: null,
};
