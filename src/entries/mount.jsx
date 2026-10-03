import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Hydrated } from './Hydrated.jsx';
import '../styles/index.css';

/**
 * Hidrata el HTML prerenderizado (producción) o renderiza desde cero (desarrollo).
 * La hidratación espera al primer pintado: el contenido prerenderizado se ve antes y los
 * enlaces de ancla funcionan de forma nativa mientras tanto.
 */
export function mount(element) {
  const container = document.getElementById('root');
  const tree = (
    <StrictMode>
      <Hydrated>{element}</Hydrated>
    </StrictMode>
  );
  if (!container.firstElementChild) {
    createRoot(container).render(tree);
    return;
  }
  const hydrate = () => hydrateRoot(container, tree);
  if (document.visibilityState === 'hidden') hydrate();
  else requestAnimationFrame(() => setTimeout(hydrate, 0));
}
