import { useEffect, useRef } from 'react';
import { IS_DEMO } from '../../lib/siteMode.js';
import './DemoBanner.css';

/** Franja fija visible en todo el sitio cuando el build es de demostración. */
export function DemoBanner() {
  const ref = useRef(null);

  // El espacio reservado (--demo-h, en CSS) cubre el texto con el tamaño normal. Si el visitante
  // amplía el texto y la franja crece, se reserva su altura real para que nunca tape el header
  // ni los títulos de destino de las anclas.
  useEffect(() => {
    const banner = ref.current;
    if (!banner || typeof ResizeObserver === 'undefined') return undefined;
    const root = document.documentElement;
    const sync = () => {
      root.style.removeProperty('--demo-h');
      const reserved = parseFloat(getComputedStyle(root).getPropertyValue('--demo-h')) || 0;
      const actual = Math.ceil(banner.getBoundingClientRect().height);
      if (actual > reserved + 0.5) root.style.setProperty('--demo-h', `${actual}px`);
    };
    const observer = new ResizeObserver(sync);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--demo-h');
    };
  }, []);

  if (!IS_DEMO) return null;
  return (
    <div className="demo-banner" role="note" ref={ref}>
      <strong>Versión de demostración.</strong> El formulario no envía datos y Luis no recibe solicitudes desde este
      sitio.
    </div>
  );
}
