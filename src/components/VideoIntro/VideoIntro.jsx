import { useEffect, useRef, useState } from 'react';
import { media, video } from '../../content/media.js';
import { site } from '../../content/site.js';
import { videoCopy as copy } from '../../content/copy.js';
import { IS_DEMO } from '../../lib/siteMode.js';
import { DevNote } from '../ui/DevNote.jsx';
import { ResponsivePicture } from '../ui/Portrait.jsx';
import './VideoIntro.css';

// Mientras el video está en edición se muestra la foto original de traje azul, sin controles.
const placeholderImage = { ...media.heroPortrait, alt: '' };

/**
 * Reproductor nativo (controles accesibles del navegador, playsInline, sin reproducción
 * automática). Archivo y póster se asignan solo cuando la sección se acerca al viewport, así
 * nada compite con la carga del hero; la proporción sale de width/height del archivo real.
 */
function VideoPlayer({ config }) {
  const frameRef = useRef(null);
  // Sin IntersectionObserver (navegadores muy antiguos) el reproductor se prepara de inmediato.
  const [near, setNear] = useState(() => typeof window !== 'undefined' && !('IntersectionObserver' in window));

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || near) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setNear(true);
    }, { rootMargin: '600px 0px' });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [near]);

  return (
    <div ref={frameRef} className="video-intro__screen">
      <video
        className="video-intro__media"
        controls
        playsInline
        preload="none"
        width={config.width}
        height={config.height}
        src={near ? config.src : undefined}
        poster={near && config.poster ? config.poster : undefined}
        aria-label={copy.videoLabel}
      >
        {near && config.captions ? (
          <track kind="captions" src={config.captions} srcLang="es" label="Español" default />
        ) : null}
        Tu navegador no puede reproducir este video.
      </video>
    </div>
  );
}

/**
 * "Conoce a Luis": video de presentación, inmediatamente después de "Sobre Luis".
 * Con video: reproductor. Sin video: en demo y desarrollo, la foto con la etiqueta
 * "Video de presentación próximamente" (sin botones que no funcionen); en producción la
 * sección no se publica.
 */
export function VideoIntro({ config = video }) {
  if (config.decision === 'omitir') return null;
  const hasVideo = Boolean(config.src && config.width > 0 && config.height > 0);
  if (!hasVideo && !IS_DEMO && !import.meta.env.DEV) return null;

  const { width, height } = hasVideo ? config : placeholderImage;
  const vertical = height > width;

  return (
    <section
      id="video"
      className={`section video-intro on-dark${vertical ? ' video-intro--vertical' : ''}`}
      aria-labelledby="video-title"
    >
      <div className="container video-intro__grid">
        <header className="video-intro__head" data-reveal="">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="video-title" className="section-title" data-section-focus="">
            {copy.title}
          </h2>
          <p className="lead">{copy.lead}</p>
        </header>

        <figure className="video-intro__figure" data-reveal="" data-reveal-delay="1">
          {hasVideo ? (
            <>
              <VideoPlayer config={config} />
              {/* Identidad editable junto al video (el póster y el archivo traen su propio texto). */}
              <figcaption className="video-intro__identity">
                {site.logo?.isotype ? (
                  <span className="video-intro__badge" aria-hidden="true">
                    <picture>
                      <source type="image/webp" srcSet={site.logo.isotype.src} />
                      <img
                        src={site.logo.isotype.fallback}
                        width={site.logo.isotype.width}
                        height={site.logo.isotype.height}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>
                  </span>
                ) : null}
                <span className="video-intro__who">
                  <span className="video-intro__name">{site.name}</span>
                  <span className="video-intro__role">{site.logo?.tagline}</span>
                </span>
              </figcaption>
            </>
          ) : (
            <>
              <div className="video-intro__screen">
                <ResponsivePicture
                  image={placeholderImage}
                  sizes="(min-width: 960px) 380px, min(92vw, 420px)"
                  className="video-intro__picture"
                />
              </div>
              <figcaption className="video-intro__soon">
                <span className="video-intro__soon-dot" aria-hidden="true" />
                {copy.soon}
              </figcaption>
              <DevNote>
                falta el video final (MP4 H.264 con audio AAC), su miniatura tomada del propio video y, de
                preferencia, subtítulos .vtt. Sin video, en producción esta sección no se publica.
              </DevNote>
            </>
          )}
        </figure>
      </div>
    </section>
  );
}
