// Fotografías y video reales de Luis.
//
// Originales entregados en assets-originales/ (luis-hero.png: traje azul; luis.png: camisa azul).
// Las copias web de public/media/ se generan con: npm run luis:assets
// (solo redimensionado y compresión; sin retoque ni versiones generativas).
// NUNCA usar fotos de terceros ni caras generadas.
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
  heroPortrait: {
    alt: 'Luis Bustamante, agente de seguros, de traje azul y camisa blanca, sonriendo',
    width: 1088,
    height: 1445,
    avif: [
      {
        src: '/media/luis-hero-480.avif',
        w: 480
      },
      {
        src: '/media/luis-hero-720.avif',
        w: 720
      },
      {
        src: '/media/luis-hero-960.avif',
        w: 960
      },
      {
        src: '/media/luis-hero-1088.avif',
        w: 1088
      }
    ],
    webp: [
      {
        src: '/media/luis-hero-480.webp',
        w: 480
      },
      {
        src: '/media/luis-hero-720.webp',
        w: 720
      },
      {
        src: '/media/luis-hero-960.webp',
        w: 960
      },
      {
        src: '/media/luis-hero-1088.webp',
        w: 1088
      }
    ],
    fallback: '/media/luis-hero-720.jpg',
    focus: 'upper'
  },
  aboutPortrait: {
    alt: 'Luis Bustamante con camisa azul, sonriendo',
    width: 1088,
    height: 1446,
    avif: [
      {
        src: '/media/luis-sobre-480.avif',
        w: 480
      },
      {
        src: '/media/luis-sobre-720.avif',
        w: 720
      },
      {
        src: '/media/luis-sobre-960.avif',
        w: 960
      },
      {
        src: '/media/luis-sobre-1088.avif',
        w: 1088
      }
    ],
    webp: [
      {
        src: '/media/luis-sobre-480.webp',
        w: 480
      },
      {
        src: '/media/luis-sobre-720.webp',
        w: 720
      },
      {
        src: '/media/luis-sobre-960.webp',
        w: 960
      },
      {
        src: '/media/luis-sobre-1088.webp',
        w: 1088
      }
    ],
    fallback: '/media/luis-sobre-720.jpg',
    focus: 'top'
  },
  // Recorte cuadrado del rostro (foto de traje) para los avatares pequeños. Decorativo: el
  // nombre siempre aparece junto a él.
  avatar: {
    alt: '',
    width: 192,
    height: 192,
    avif: [
      {
        src: '/media/luis-avatar-96.avif',
        w: 96
      },
      {
        src: '/media/luis-avatar-192.avif',
        w: 192
      }
    ],
    webp: [
      {
        src: '/media/luis-avatar-96.webp',
        w: 96
      },
      {
        src: '/media/luis-avatar-192.webp',
        w: 192
      }
    ],
    fallback: '/media/luis-avatar-192.jpg',
    focus: 'center'
  },
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
