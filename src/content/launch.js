// Verificaciones manuales previas al lanzamiento. Solo marcar `true` con evidencia real
// (no por suposición). `npm run check:release` las exige todas.
// phase: 'post-deploy' → solo se pueden comprobar con el sitio publicado (URL de producción). El build de
// Vercel las reporta como pendientes tras desplegar, sin detenerse; se comprueban en cuanto se publica y se
// registran aquí con su evidencia.
export const launchChecklist = [
  {
    id: 'testimonios-autorizacion',
    // 23 nov 2026: Javier confirmó por escrito que Karla G., Sergio C. y Alberto G. enviaron sus testimonios y
    // autorizaron publicarlos con ese nombre y contexto.
    done: true,
    label:
      'Constancia escrita de que Karla G., Sergio C. y Alberto G. autorizan publicar su testimonio con ese nombre y contexto (ver src/content/testimonials.js).',
  },
  {
    id: 'headers-dominio',
    phase: 'post-deploy',
    // 23 nov 2026, https://luis-bustamante-seguros-7vt9-one.vercel.app (curl -I en /, /aviso-de-privacidad y una
    // ruta inexistente con 404): CSP, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP y HSTS.
    done: true,
    label: 'Headers reales (CSP, nosniff, referrer, permisos, frame-ancestors, HSTS) comprobados en landing, aviso y 404.',
  },
  {
    id: 'indexacion',
    phase: 'post-deploy',
    // 23 nov 2026, producción (3b0f49e) en https://luis-bustamante-seguros-7vt9-one.vercel.app: sin noindex en el
    // HTML ni en X-Robots-Tag, robots.txt con Allow: / y Sitemap, sitemap.xml con / y /aviso-de-privacidad, canonical
    // hacia SITE_URL. Al conectar el dominio propio, actualizar SITE_URL y volver a comprobar.
    done: true,
    label:
      'Indexación decidida para el lanzamiento: sin SITE_MODE=demo, el sitio pierde el noindex. Confirmar dominio, canonical, sitemap y robots.txt antes de quitarlo.',
  },
  {
    id: 'https-redireccion',
    phase: 'post-deploy',
    // 23 nov 2026: http:// responde 308 a https:// en la URL de producción de Vercel; todos los recursos son del
    // propio origen (CSP default-src 'self').
    done: true,
    label: 'HTTPS y redirección desde HTTP verificados en el dominio final, sin recursos mixtos.',
  },
  {
    id: 'telefono-fisico',
    phase: 'post-deploy',
    done: false,
    label:
      'Recorrido completo probado en al menos un teléfono físico (iOS y/o Android), incluido el formulario: "Enviar por WhatsApp" abre el chat de Luis con el mensaje correcto, sin enviarlo solo, y al volver los datos siguen en el formulario.',
  },
];
