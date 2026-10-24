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
    id: 'plantilla-whatsapp-interes',
    done: false,
    label:
      'Plantilla de WhatsApp de 7 variables (versión 4: encabezado general, medio de contacto, correo o teléfono e ingresos) aprobada en Twilio/Meta y su ContentSid cargado en TWILIO_CONTENT_SID (ver docs/WHATSAPP-TWILIO.md).',
  },
  {
    id: 'whatsapp-prueba-autorizada',
    done: false,
    label:
      'Prueba autorizada con datos ficticios: la notificación llegó al WhatsApp de Luis con la plantilla aprobada.',
  },
  {
    id: 'callback-estado',
    done: false,
    label: 'El callback /api/twilio-status recibió estados firmados (sent/delivered/read) en el dominio final.',
  },
  {
    id: 'headers-dominio',
    done: false,
    label: 'Headers reales (CSP, nosniff, referrer, permisos, frame-ancestors, HSTS) comprobados en landing, aviso, 404 y API.',
  },
  {
    id: 'https-redireccion',
    done: false,
    label: 'HTTPS y redirección desde HTTP verificados en el dominio final, sin recursos mixtos.',
  },
  {
    id: 'telefono-fisico',
    done: false,
    label: 'Recorrido completo probado en al menos un teléfono físico (iOS y/o Android).',
  },
];
