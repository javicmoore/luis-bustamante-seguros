import { useEffect, useRef, useState } from 'react';
import { brandsSection, getPublishableBrands } from '../../content/brands.js';
import { DevNote } from '../ui/DevNote.jsx';
import { Icon } from '../ui/Icon.jsx';
import { DEV_FIXTURES, FixtureLogo } from './devFixtures.jsx';
import './BrandMarquee.css';

const SPEED_PX_PER_SECOND = 34;
const LOGO_HEIGHT = 36;
const LOGO_MAX_WIDTH = 180;

/** Alto uniforme (ajuste óptico opcional) y ancho máximo, conservando la proporción. */
export function logoBox(width, height, scale = 1) {
  const safeScale = Math.min(1.5, Math.max(0.7, Number(scale) || 1));
  let h = LOGO_HEIGHT * safeScale;
  let w = (h * width) / height;
  if (w > LOGO_MAX_WIDTH) {
    w = LOGO_MAX_WIDTH;
    h = (w * height) / width;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

function BrandLogo({ brand }) {
  if (brand.fixture) return <FixtureLogo brand={brand} box={logoBox(brand.w, brand.h)} />;
  const box = logoBox(brand.logo.width, brand.logo.height, brand.logo.scale);
  return (
    <img
      className="brands__logo"
      src={brand.logo.src}
      width={box.width}
      height={box.height}
      alt={brand.name}
      // Carga anticipada con prioridad baja: los logos fuera de pantalla deben estar listos
      // antes de entrar en movimiento (con carga diferida aparecerían de golpe).
      loading="eager"
      fetchPriority="low"
      decoding="async"
    />
  );
}

function BrandSet({ items, duplicate = false }) {
  return (
    <ul
      className="brands__set"
      role="list"
      aria-hidden={duplicate ? 'true' : undefined}
      inert={duplicate || undefined}
    >
      {items.map((brand) => (
        <li key={brand.id} className="brands__item">
          <BrandLogo brand={brand} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Franja de marcas. En producción solo muestra marcas confirmadas, autorizadas y con logo.
 * Sin ellas no se renderiza (no se publican relaciones sin validar). En desarrollo usa
 * fixtures de demostración claramente identificadas.
 */
export function BrandMarquee() {
  const publishable = getPublishableBrands();
  const useFixtures = import.meta.env.DEV && publishable.length === 0;
  const items = useFixtures ? DEV_FIXTURES : publishable;
  const [paused, setPaused] = useState(false);
  // Tras usar el botón, su elección manda (el foco deja de pausar por sí solo).
  const [manual, setManual] = useState(false);
  const trackRef = useRef(null);

  // Velocidad constante sin importar el ancho: duración = ancho de un juego / velocidad.
  useEffect(() => {
    const track = trackRef.current;
    const firstSet = track?.firstElementChild;
    if (!firstSet || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) track.style.setProperty('--marquee-duration', `${(width / SPEED_PX_PER_SECOND).toFixed(1)}s`);
    });
    observer.observe(firstSet);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className={`brands${manual ? ' is-manual' : ''}`} aria-labelledby="brands-title">
      <div className="container brands__head">
        <h2 id="brands-title" className="brands__title">
          {useFixtures ? 'Demostración · marcas por confirmar' : brandsSection.heading}
        </h2>
        <button
          type="button"
          className="brands__toggle"
          aria-label={paused ? 'Reanudar el movimiento de las marcas' : 'Pausar el movimiento de las marcas'}
          onClick={() => {
            setManual(true);
            setPaused((value) => !value);
          }}
        >
          <Icon name={paused ? 'play' : 'pause'} />
          <span aria-hidden="true">{paused ? 'Reanudar' : 'Pausar'}</span>
        </button>
      </div>
      {useFixtures ? (
        <div className="container brands__note">
          <DevNote>
            confirmar qué marcas representa Luis (lista de trabajo: Allianz, Zurich, Skandia, Insignia Life,
            La Latino Seguros, MAPFRE) y conseguir sus logos oficiales autorizados. Estas piezas son fixtures de
            prueba: en producción la franja no aparece hasta tener marcas confirmadas.
          </DevNote>
        </div>
      ) : null}
      <div className={`brands__viewport${paused ? ' is-paused' : ''}`}>
        <div className="brands__track" ref={trackRef}>
          <BrandSet items={items} />
          <BrandSet items={items} duplicate />
        </div>
      </div>
    </section>
  );
}
