import { IS_DEMO } from '../../lib/siteMode.js';
import './DemoBanner.css';

/** Franja fija visible en todo el sitio cuando el build es de demostración. */
export function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="demo-banner" role="note">
      <strong>Versión de demostración.</strong> El formulario no envía datos y Luis no recibe solicitudes desde este
      sitio.
    </div>
  );
}
