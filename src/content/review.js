// Textos comerciales que requieren validación de Luis antes del lanzamiento.
// Estas marcas viven fuera de la interfaz pública; `npm run check:release` las reporta.
// Cambiar status a 'aprobado' cuando Luis confirme (o ajustar el texto en el archivo indicado).
export const copyReview = [
  {
    id: 'hero',
    file: 'src/content/copy.js → heroCopy',
    status: 'pendiente',
    note: 'Título y descripción del hero (borrador del brief, pulido).',
  },
  {
    id: 'beneficios-servicios',
    file: 'src/content/services.js',
    status: 'pendiente',
    note: 'Tarjetas de beneficios (respaldo para el retiro, objetivos, condiciones; propuesta del 21 oct 2026) y descripción de cada familia de servicios.',
  },
  {
    id: 'sobre-luis-enfoque',
    file: 'src/content/copy.js → aboutCopy.paragraphs',
    status: 'pendiente',
    note: 'Presentación de Luis y sus tres párrafos (texto entregado por Javier el 26 oct 2026).',
  },
  {
    id: 'conoce-a-luis',
    file: 'src/content/copy.js → videoCopy',
    status: 'pendiente',
    note: 'Título y texto breve de la sección del video de presentación ("Conoce a Luis").',
  },
  {
    id: 'formulario',
    file: 'src/content/copy.js → formCopy',
    status: 'pendiente',
    note: 'Título del formulario, texto de consentimiento y nota breve de privacidad.',
  },
  {
    id: 'faq-distancia',
    file: 'src/content/faq.js → otras-ciudades',
    status: 'pendiente',
    note: 'Confirmar que atiende a distancia por teléfono o WhatsApp.',
  },
  {
    id: 'faq-costo',
    file: 'src/content/faq.js → costo',
    status: 'pendiente',
    note: 'Segunda frase: el costo del producto se revisa antes de decidir.',
  },
  {
    id: 'faq-formulario',
    file: 'src/content/faq.js → despues-formulario',
    status: 'pendiente',
    note: 'Qué ocurre tras enviar el formulario y uso de los datos.',
  },
  {
    id: 'faq-otros-ahorros',
    file: 'src/content/faq.js → otros-ahorros',
    status: 'pendiente',
    note: 'Revisión de productos que el visitante ya tiene.',
  },
  {
    id: 'faq-preparar',
    file: 'src/content/faq.js → preparar',
    status: 'pendiente',
    note: 'Información sugerida para preparar.',
  },
];
