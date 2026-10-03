import { site } from '../../content/site.js';
import './Wordmark.css';

// Sin logo original: nombre compuesto tipográficamente (no es un logotipo oficial).
// Cuando exista site.logo se usa el archivo con sus proporciones reales.
export function Wordmark({ href = '/', onClick, tone = 'auto', className = '' }) {
  return (
    <a className={`wordmark wordmark--${tone} ${className}`.trim()} href={href} onClick={onClick}>
      {site.logo ? (
        <img
          className="wordmark__logo"
          src={site.logo.src}
          width={site.logo.width}
          height={site.logo.height}
          alt={site.logo.alt || site.name}
        />
      ) : (
        <>
          <span className="wordmark__name">{site.name}</span>
          <span className="wordmark__role" aria-hidden="true">
            Seguros · Finanzas
          </span>
          <span className="visually-hidden">, inicio</span>
        </>
      )}
    </a>
  );
}
