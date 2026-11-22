// Verificaciones manuales previas al lanzamiento. Solo marcar `true` con evidencia real
// (no por suposición). `npm run check:release` y el build de producción en Vercel las exigen.
export const launchChecklist = [
  {
    id: 'testimonios-autorizacion',
    done: false,
    label:
      'Constancia escrita de que Karla G., Sergio C. y Alberto G. autorizan publicar su testimonio con ese nombre y contexto (ver src/content/testimonials.js).',
  },
  {
    id: 'headers-dominio',
    done: false,
    label: 'Headers reales (CSP, nosniff, referrer, permisos, frame-ancestors, HSTS) comprobados en landing, aviso y 404.',
  },
  {
    id: 'indexacion',
    done: false,
    label:
      'Indexación decidida para el lanzamiento: sin SITE_MODE=demo, el sitio pierde el noindex. Confirmar dominio, canonical, sitemap y robots.txt antes de quitarlo.',
  },
  {
    id: 'https-redireccion',
    done: false,
    label: 'HTTPS y redirección desde HTTP verificados en el dominio final, sin recursos mixtos.',
  },
  {
    id: 'telefono-fisico',
    done: false,
    label:
      'Recorrido completo probado en al menos un teléfono físico (iOS y/o Android), incluido el formulario: "Enviar por WhatsApp" abre el chat de Luis con el mensaje correcto, sin enviarlo solo, y al volver los datos siguen en el formulario.',
  },
];
