// Navegación por anclas del header. "Asesoría" lleva al formulario (misma función que en la
// referencia). No incluir "Cómo funciona": esa sección fue eliminada.
export const navItems = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'simulador', label: 'Simulador' },
  { id: 'asesoria', label: 'Asesoría' },
  { id: 'sobre-luis', label: 'Sobre Luis' },
  { id: 'faq', label: 'FAQ' },
];

export const FORM_ANCHOR = 'asesoria';
export const SIMULATOR_ANCHOR = 'simulador';

export const primaryCta = {
  label: 'Solicitar asesoría',
  href: `#${FORM_ANCHOR}`,
};
