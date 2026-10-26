// Textos de la landing. Los marcados en src/content/review.js requieren aprobación de Luis
// antes del lanzamiento (no se muestran marcas de revisión en la interfaz pública).

export const heroCopy = {
  eyebrowName: 'Luis Bustamante',
  eyebrowTopic: 'Seguros y planeación patrimonial',
  titleLead: 'Protege lo que has construido.',
  titleAccent: 'Planea lo que viene.',
  primaryCta: 'Solicitar asesoría',
  secondaryCta: 'Explorar mi ahorro',
  // Accesos directos por producto: abren WhatsApp con un mensaje prellenado que el visitante
  // decide enviar (nada se envía automáticamente).
  shortcutsTitle: 'Escríbele por WhatsApp sobre:',
  shortcuts: [
    { id: 'auto', label: 'Auto', icon: 'car', message: 'Hola Luis, me interesa un seguro de auto.' },
    {
      id: 'gmm',
      label: 'Gastos médicos mayores',
      icon: 'medical',
      message: 'Hola Luis, me interesa un seguro de gastos médicos mayores.',
    },
    { id: 'educacion', label: 'Educación', icon: 'education', message: 'Hola Luis, me interesa un plan para la educación.' },
    { id: 'hogar', label: 'Hogar', icon: 'home', message: 'Hola Luis, me interesa un seguro de hogar.' },
    { id: 'vida', label: 'Seguro de vida', icon: 'life', message: 'Hola Luis, me interesa un seguro de vida.' },
  ],
};

export const simulatorCopy = {
  eyebrow: 'Simulador de ahorro y retiro',
  title: 'El costo de esperar',
  intro: 'Descubre cómo el tiempo influye en el ahorro que puedes construir para tu futuro.',
  contributionLabel: 'Aportación mensual',
  yearsLabel: 'Plazo',
  rateLabel: 'Tasa anual ilustrativa',
  contributionHelp: 'Aportación mínima: $2,000 MXN al mes.',
  contributionMin: 'La aportación mínima es de $2,000 MXN mensuales.',
  rateHelp: 'Tasa anual sugerida para esta simulación: de 10 a 12 %',
  // Supuesto indicado por Luis (no es una tasa contratada).
  rateAssumption:
    'El rango de 10 a 12 % es un supuesto ilustrativo indicado por Luis; no representa una tasa contratada ni un rendimiento garantizado.',
  contributedLabel: 'Aportaciones acumuladas',
  scenarioLabel: 'Escenario ilustrativo',
  differenceLabel: 'Diferencia ilustrativa',
  zeroRateNote: 'Con una tasa de 0 %, el escenario ilustrativo es igual a tus aportaciones.',
  method:
    'Cómo se calcula: una aportación al final de cada mes, sin aportación inicial. La tasa anual efectiva se convierte a mensual con (1 + tasa)^(1/12) − 1.',
  // Costo de esperar: empezar hoy contra empezar 5 años después (misma aportación, tasa y fecha final).
  waitHook: 'Esperar también tiene un costo',
  waitLead: 'Si empiezas 5 años después, podrías acumular',
  waitTail: 'menos al final de este plazo.',
  waitToday: 'Empezando hoy',
  waitLater: 'Empezando en 5 años',
  waitTooShort:
    'Para comparar empezar hoy con empezar 5 años después, elige un plazo mayor a 5 años.',
  waitFine: 'Comparación ilustrativa, no garantizada. No incluye inflación, impuestos ni comisiones.',
  assumptionsLabel: 'Ver supuestos',
  waitAssumption:
    'Quien empieza en 5 años aporta la misma cantidad mensual con la misma tasa y termina en la misma fecha: aporta durante 5 años menos, sin aportar durante la espera ni compensar después.',
  disclaimer:
    'Simulación educativa: no es una cotización ni un rendimiento garantizado. No considera inflación, impuestos, comisiones ni las condiciones de un producto específico.',
  cta: 'Quiero revisar mis opciones con Luis',
};

export const formCopy = {
  eyebrow: 'Solicita tu asesoría',
  title: 'Formulario para el plan de ahorro',
  intro:
    'Comparte tus datos y Luis podrá ponerse en contacto contigo para conocer lo que necesitas.',
  points: [
    'Cotización y asesoría gratuitas.',
    'Desde Mexicali, para personas de todo México.',
    'Solo pedimos lo necesario para contactarte y orientarte; nunca datos médicos.',
  ],
  nameLabel: 'Nombre',
  ageLabel: 'Edad',
  ageHelp: 'Años cumplidos.',
  contactLegend: '¿Cómo prefieres que Luis te contacte?',
  emailLabel: 'Correo electrónico',
  emailHelp: 'Luis te responderá a esta dirección.',
  phoneCountryLabel: 'País y prefijo',
  phoneLabel: 'Número de teléfono',
  phoneHelpMx: '10 dígitos, sin el +52.',
  phoneHelpIntl: 'Sin el prefijo del país. También puedes pegar el número completo con su prefijo.',
  incomeLegend: '¿En qué rango se encuentran tus ingresos mensuales?',
  incomeHelp: 'En pesos mexicanos. Solo orienta la conversación; no condiciona tu solicitud.',
  // La autorización se adapta al medio elegido.
  consentLabels: {
    none: 'Autorizo que Luis Bustamante me contacte por el medio que elija arriba para dar seguimiento a esta solicitud.',
    email: 'Autorizo que Luis Bustamante me contacte por correo electrónico para dar seguimiento a esta solicitud.',
    phone: 'Autorizo que Luis Bustamante me contacte por llamada o WhatsApp para dar seguimiento a esta solicitud.',
  },
  privacyShort:
    'Tus datos se usan solo para atender esta solicitud. No se comparten para publicidad ni se usan para otras campañas.',
  privacyLink: 'Leer el aviso de privacidad',
  submit: 'Cotizar mi plan de ahorro',
  submitting: 'Enviando tu solicitud…',
};

export const servicesCopy = {
  eyebrow: 'Beneficios',
  title: 'Asesoría para proteger lo que tienes y avanzar hacia lo que quieres.',
  intro:
    'Cada persona llega con una pregunta distinta. Estas son las áreas en las que Luis puede orientarte.',
  cta: 'Solicitar asesoría',
};

export const aboutCopy = {
  eyebrow: 'Sobre Luis',
  title: 'Hola, Soy Luis Bustamante.',
  role: 'Agente de seguros y asesor financiero.',
  paragraphs: [
    'Acompaño a médicos, empresarios, profesionistas independientes, familias y personas en la protección de su patrimonio, la elección de soluciones de seguros y la construcción de planes de ahorro e inversión alineados con sus objetivos.',
    'Mi compromiso es brindarte una asesoría clara, cercana y personalizada para que tomes decisiones con confianza y avances hacia el futuro que deseas.',
    'Más que ofrecerte una póliza o un plan financiero, quiero ser tu asesor de confianza a largo plazo.',
  ],
};

export const videoCopy = {
  eyebrow: 'En sus palabras',
  title: 'Conoce a Luis',
  // Texto propuesto (pendiente de aprobación de Luis).
  lead: 'Un video breve para que conozcas a Luis y su forma de trabajar antes de platicar.',
  // Etiqueta accesible del reproductor cuando exista el video.
  videoLabel: 'Video de presentación de Luis Bustamante',
  // Marcador visible solo en demo y desarrollo mientras el video está en edición.
  soon: 'Video de presentación próximamente',
};

export const testimonialsCopy = {
  eyebrow: 'Testimonios',
  title: 'Lo que comparten mis clientes',
};

export const faqCopy = {
  eyebrow: 'Preguntas frecuentes',
  title: 'Resolvemos tus primeras dudas.',
  asideText: '¿Tienes otra pregunta? Luis puede resolverla contigo.',
};

export const footerCopy = {
  tagline: 'Seguros, ahorro y retiro con asesoría personal desde Mexicali para todo México.',
  cta: 'Solicitar asesoría',
};
