// Identidad y contacto autorizados de Luis Bustamante.
// Fuente: datos confirmados por Javier. No agregar domicilio, cédula, correo ni dominio
// hasta que se confirmen.
export const site = {
  name: 'Luis Bustamante',
  role: 'Agente de seguros y asesor financiero',
  tagline: 'Seguros y planeación patrimonial',
  location: {
    city: 'Mexicali',
    state: 'Baja California',
    stateShort: 'B.C.',
    country: 'México',
  },
  scope: 'Asesoría para personas de todo México',
  phone: {
    display: '686 330 3727',
    e164: '+526863303727',
    href: 'tel:+526863303727',
  },
  whatsapp: {
    display: '686 330 3727',
    // Enlace de contacto directo y voluntario (sin mensaje prellenado).
    href: 'https://wa.me/526863303727',
  },
  instagram: {
    handle: '@luisbustamante.seguros',
    href: 'https://www.instagram.com/luisbustamante.seguros/',
  },
  // Anunciado en su perfil: cotización y asesoría gratuitas.
  freeQuote: true,
  // Logo original pendiente. Cuando exista: { src, width, height, alt }.
  // Mientras tanto se usa el nombre compuesto tipográficamente (no es un logotipo oficial).
  logo: null,
};

export const services = [
  'Ahorro y fondos de inversión',
  'Plan Personal de Retiro (PPR)',
  'Planes para educación',
  'Seguros de vida',
  'Gastos médicos mayores',
  'Seguros de hogar y auto',
];
