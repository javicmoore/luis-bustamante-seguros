import { useEffect, useRef, useState } from 'react';
import { servicesCopy as copy } from '../../content/copy.js';
import { benefits, serviceFamilies } from '../../content/services.js';
import { FORM_ANCHOR } from '../../content/navigation.js';
import { goToSection, prefersReducedMotion } from '../../lib/scroll.js';
import { Icon } from '../ui/Icon.jsx';
import { ServiceArt } from './ServiceArt.jsx';
import './Services.css';

export function Services() {
  const railRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  // En móvil la lista se recorre manualmente (sin carrusel automático).
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const cards = [...rail.children];
    const updateScrollable = () => setScrollable(rail.scrollWidth > rail.clientWidth + 4);
    updateScrollable();
    const resize = new ResizeObserver(updateScrollable);
    resize.observe(rail);
    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(cards.indexOf(entry.target));
        }
      },
      { root: rail, threshold: 0.6 },
    );
    cards.forEach((card) => visibility.observe(card));
    return () => {
      resize.disconnect();
      visibility.disconnect();
    };
  }, []);

  const scrollToCard = (index) => {
    const rail = railRef.current;
    const card = rail?.children[index];
    if (!card) return;
    rail.scrollTo({
      left: card.offsetLeft - rail.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft || '0'),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  const total = serviceFamilies.length;

  return (
    <section id="servicios" className="section services" aria-labelledby="services-title">
      <div className="container">
        <header className="services__head">
          <div data-reveal="">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="services-title" className="section-title">
              {copy.title}
            </h2>
          </div>
          <p className="lead" data-reveal="" data-reveal-delay="1">
            {copy.intro}
          </p>
        </header>

        <ol className="benefits" role="list">
          {benefits.map((benefit, index) => (
            <li key={benefit.id} className="benefit" data-reveal="" data-reveal-delay={String(index + 1)}>
              <span className="benefit__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="benefit__title">{benefit.title}</h3>
              <p className="benefit__text">{benefit.text}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="services__rail-wrap">
        <ul
          ref={railRef}
          id="services-rail"
          className="services__rail"
          role="list"
          aria-label="Servicios"
          tabIndex={scrollable ? 0 : undefined}
        >
          {serviceFamilies.map((service, index) => (
            <li
              key={service.id}
              className={`svc-card svc-card--${index < 2 ? 'wide' : 'compact'}`}
              data-reveal=""
              data-reveal-delay={String((index % 3) + 1)}
            >
              <div className="svc-card__art">
                <ServiceArt name={service.art} />
              </div>
              <div className="svc-card__body">
                <p className="svc-card__kicker">{service.kicker}</p>
                <h3 className="svc-card__title">{service.title}</h3>
                <p className="svc-card__text">{service.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="services__controls container">
          <button
            type="button"
            className="services__arrow"
            onClick={() => scrollToCard(Math.max(0, current - 1))}
            disabled={current === 0}
            aria-controls="services-rail"
          >
            <Icon name="chevronLeft" />
            <span className="visually-hidden">Servicio anterior</span>
          </button>
          <p className="services__count">
            <span className="visually-hidden">Servicio </span>
            {current + 1} <span aria-hidden="true">/</span>
            <span className="visually-hidden"> de </span> {total}
          </p>
          <button
            type="button"
            className="services__arrow"
            onClick={() => scrollToCard(Math.min(total - 1, current + 1))}
            disabled={current === total - 1}
            aria-controls="services-rail"
          >
            <Icon name="chevronRight" />
            <span className="visually-hidden">Servicio siguiente</span>
          </button>
          <span className="services__hint" aria-hidden="true">
            Desliza para ver más
          </span>
        </div>
      </div>

      <div className="container">
        <div className="services__cta" data-reveal="">
        <p>¿No sabes por dónde empezar? Cuéntale a Luis qué te gustaría proteger o lograr.</p>
        <a
          className="btn btn--navy"
          href={`#${FORM_ANCHOR}`}
          onClick={(event) => {
            event.preventDefault();
            goToSection(FORM_ANCHOR);
          }}
        >
          {copy.cta}
          <Icon name="arrowRight" className="btn__icon btn__icon--move" />
        </a>
        </div>
      </div>
    </section>
  );
}
