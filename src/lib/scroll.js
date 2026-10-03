export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Desplaza a una sección respetando scroll-padding (offset del header) y mueve el foco a
 * su encabezado para lectores de pantalla y teclado. Actualiza el hash sin saltos.
 */
export function goToSection(id, { updateHash = true } = {}) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  const focusTarget = target.querySelector('[data-section-focus]') || target;
  if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
  focusTarget.focus({ preventScroll: true });
  if (updateHash && window.location.hash !== `#${id}`) {
    window.history.pushState(null, '', `#${id}`);
  }
}
