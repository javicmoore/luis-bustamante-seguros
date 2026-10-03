import { useEffect } from 'react';

/**
 * Marca <html data-hydrated="true"> cuando React ya controla la página (diagnóstico y
 * pruebas). Se usa igual en el prerender y en el cliente para que ambos árboles coincidan.
 */
export function Hydrated({ children }) {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true';
  }, []);
  return children;
}
