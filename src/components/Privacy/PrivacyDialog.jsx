import { useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { PrivacyContent } from './PrivacyContent.jsx';

/**
 * Aviso de privacidad en un <dialog> modal: se abre sin salir del formulario, así los datos
 * escritos se conservan. El navegador gestiona el foco y la tecla Escape.
 */
export function PrivacyDialog({ open, onClose }) {
  const ref = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
      document.documentElement.classList.add('is-locked');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    document.documentElement.classList.remove('is-locked');
    onClose();
    opener.current?.focus?.();
  };

  return (
    <dialog
      ref={ref}
      className="privacy-dialog"
      aria-labelledby="privacy-dialog-title"
      onClose={handleClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close();
      }}
    >
      <div className="privacy-dialog__inner">
        <header className="privacy-dialog__head">
          <h2 id="privacy-dialog-title">Aviso de privacidad</h2>
          <button
            type="button"
            className="privacy-dialog__close"
            onClick={() => ref.current?.close()}
            aria-label="Cerrar el aviso de privacidad"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="privacy-dialog__body">{open ? <PrivacyContent headingLevel={3} /> : null}</div>
        <footer className="privacy-dialog__foot">
          <a className="text-link" href="/aviso-de-privacidad" target="_blank" rel="noopener">
            Abrir en una página aparte
            <span className="visually-hidden"> (pestaña nueva)</span>
          </a>
          <button type="button" className="btn btn--navy btn--sm" onClick={() => ref.current?.close()}>
            Volver al formulario
          </button>
        </footer>
      </div>
    </dialog>
  );
}
