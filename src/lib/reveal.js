// Entradas al aproximarse al viewport, una sola vez.
// Solo se ocultan elementos que están por completo debajo del viewport al hidratar, así nunca
// hay texto visible que desaparezca, y se revelan en cuanto asoman (sin franja inferior en la
// que el contenido siga oculto y parezca espacio vacío). Con movimiento reducido o sin
// IntersectionObserver no se oculta nada.
export function initReveal(root = document) {
  if (typeof window === 'undefined') return () => {};
  if (!('IntersectionObserver' in window)) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px', threshold: 0 },
  );

  const limit = window.innerHeight;
  const pending = [];
  for (const el of root.querySelectorAll('[data-reveal]')) {
    if (el.getBoundingClientRect().top > limit) pending.push(el);
  }
  // Escribir clases después de leer posiciones (sin alternar lectura/escritura de layout).
  for (const el of pending) {
    el.classList.add('is-pending');
    observer.observe(el);
  }

  return () => {
    observer.disconnect();
    for (const el of pending) el.classList.remove('is-pending');
  };
}

/**
 * Muestra de inmediato lo pendiente dentro de un elemento. Al navegar por un ancla, la sección
 * de destino aparece mientras se desplaza y llega visible, sin huecos que esperen la animación.
 */
export function revealNow(root) {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-reveal].is-pending')) el.classList.remove('is-pending');
}
