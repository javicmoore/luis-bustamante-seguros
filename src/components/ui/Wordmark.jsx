import { site } from '../../content/site.js';
import './Wordmark.css';

/**
 * Identidad del header: isotipo real de Luis sobre una placa clara (sus barras son casi negras
 * y no se leerían sobre el azul del hero) con el nombre y el lema del logo en HTML.
 * No se recrean letras del logo: el texto es el mismo nombre y lema, en la tipografía del sitio.
 */
export function Wordmark({ href = '/', onClick, className = '' }) {
  const iso = site.logo?.isotype;
  return (
    <a className={`wordmark ${className}`.trim()} href={href} onClick={onClick}>
      {iso ? (
        <span className="wordmark__badge" aria-hidden="true">
          <picture>
            <source type="image/webp" srcSet={iso.src} />
            <img src={iso.fallback} width={iso.width} height={iso.height} alt="" decoding="async" />
          </picture>
        </span>
      ) : null}
      <span className="wordmark__text">
        <span className="wordmark__name">{site.name}</span>
        <span className="wordmark__role" aria-hidden="true">
          {site.logo?.tagline || 'Seguros · Finanzas'}
        </span>
      </span>
      <span className="visually-hidden">, inicio</span>
    </a>
  );
}
