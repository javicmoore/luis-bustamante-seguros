import { useId } from 'react';
import { DevNote } from './DevNote.jsx';
import './Portrait.css';

const srcset = (list) => list.map((s) => `${s.src} ${s.w}w`).join(', ');

/** Imagen real con AVIF/WebP responsivos y dimensiones reservadas (sin saltos de layout). */
export function ResponsivePicture({ image, sizes, priority = false, className = '' }) {
  return (
    <picture className={className}>
      {image.avif?.length ? <source type="image/avif" srcSet={srcset(image.avif)} sizes={sizes} /> : null}
      {image.webp?.length ? <source type="image/webp" srcSet={srcset(image.webp)} sizes={sizes} /> : null}
      <img
        src={image.fallback}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        data-focus={image.focus || 'upper'}
      />
    </picture>
  );
}

/**
 * Retrato de Luis. Sin fotografía entregada se muestra un monograma tipográfico (nunca un
 * rostro de stock o generado) y, solo en desarrollo, el aviso del pendiente.
 */
export function Portrait({ image, variant = 'hero', sizes, priority = false, className = '', note }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  if (image) {
    return (
      <div className={`portrait portrait--${variant} ${className}`.trim()}>
        <ResponsivePicture image={image} sizes={sizes} priority={priority} className="portrait__picture" />
      </div>
    );
  }

  return (
    <div className={`portrait portrait--${variant} portrait--placeholder ${className}`.trim()}>
      <svg
        className="portrait__art"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1f4466" />
            <stop offset="0.55" stopColor="#13304c" />
            <stop offset="1" stopColor="#0b2036" />
          </linearGradient>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ecd4a3" />
            <stop offset="0.5" stopColor="#c69a49" />
            <stop offset="1" stopColor="#9c7430" />
          </linearGradient>
        </defs>
        <rect width="400" height="500" fill={`url(#${uid}-bg)`} />
        <g fill="none" stroke="#c69a49" strokeWidth="1">
          <circle cx="330" cy="70" r="120" opacity="0.18" />
          <circle cx="330" cy="70" r="180" opacity="0.12" />
          <circle cx="330" cy="70" r="240" opacity="0.08" />
          <path d="M40 430 C 140 380, 260 470, 360 410" opacity="0.25" />
        </g>
        {variant === 'avatar' ? (
          <text
            x="200"
            y="300"
            textAnchor="middle"
            fontFamily="Fraunces, Georgia, serif"
            fontStyle="italic"
            fontWeight="500"
            fontSize="190"
            fill={`url(#${uid}-gold)`}
          >
            LB
          </text>
        ) : (
          <>
            <text
              x="200"
              y="292"
              textAnchor="middle"
              fontFamily="Fraunces, Georgia, serif"
              fontStyle="italic"
              fontWeight="500"
              fontSize="150"
              fill={`url(#${uid}-gold)`}
            >
              LB
            </text>
            <line x1="170" y1="330" x2="230" y2="330" stroke="#c69a49" strokeWidth="1.5" opacity="0.7" />
          </>
        )}
      </svg>
      {note ? <DevNote className="portrait__note">{note}</DevNote> : null}
    </div>
  );
}
