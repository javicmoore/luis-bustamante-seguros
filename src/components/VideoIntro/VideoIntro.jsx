import { useEffect, useRef, useState } from 'react';
import { video } from '../../content/media.js';
import { videoCopy as copy } from '../../content/copy.js';
import { DevNote } from '../ui/DevNote.jsx';
import { Icon } from '../ui/Icon.jsx';
import './VideoIntro.css';

/**
 * Video de presentación. Patrón "fachada": se muestra el póster y el archivo de video solo
 * se solicita cuando el visitante decide reproducirlo (sin autoplay con audio).
 * Sin video real: en desarrollo se ve el pendiente; en producción la sección no se publica.
 */
export function VideoIntro() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!playing || !videoRef.current) return;
    videoRef.current.focus();
    videoRef.current.play().catch(() => {});
  }, [playing]);

  const hasVideo = Boolean(video.src);
  if (!hasVideo && !import.meta.env.DEV) return null;

  return (
    <section id="video" className="section video-intro" aria-labelledby="video-title">
      <div className="container">
        <header className="video-intro__head" data-reveal="">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="video-title" className="section-title">
            {copy.title}
          </h2>
        </header>

        {hasVideo ? (
          <div className="video-intro__frame" data-reveal="" data-reveal-delay="1">
            {playing ? (
              <video
                ref={videoRef}
                className="video-intro__media"
                controls
                playsInline
                preload="none"
                poster={video.poster || undefined}
                width={video.width}
                height={video.height}
              >
                <source src={video.src} type={video.type} />
                {video.captions ? <track kind="captions" src={video.captions} srcLang="es" label="Español" default /> : null}
                Tu navegador no puede reproducir este video.
              </video>
            ) : (
              <button type="button" className="video-intro__facade" onClick={() => setPlaying(true)}>
                {video.poster ? (
                  <img
                    className="video-intro__poster"
                    src={video.poster}
                    alt=""
                    width={video.width}
                    height={video.height}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <span className="video-intro__play">
                  <Icon name="play" />
                </span>
                <span className="visually-hidden">{copy.playLabel}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="video-intro__frame video-intro__frame--pending" data-reveal="" data-reveal-delay="1">
            <div className="video-intro__pending">
              <p className="video-intro__pending-title">Espacio reservado para el video de presentación de Luis</p>
              <DevNote>
                falta el archivo de video real (MP4 H.264, horizontal 16:9, idealmente 60–90 s, con subtítulos .vtt)
                y un póster. Sin video, esta sección no se publica en producción.
              </DevNote>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
