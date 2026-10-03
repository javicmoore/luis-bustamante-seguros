import { getPublishableTestimonials } from '../../content/testimonials.js';
import { testimonialsCopy as copy } from '../../content/copy.js';
import { DevNote } from '../ui/DevNote.jsx';
import './Testimonials.css';

/**
 * Testimonios reales y autorizados. Sin ellos, en desarrollo se ve la estructura vacía con
 * el pendiente; en producción la sección no se publica. Nunca se generan textos ni nombres.
 */
export function Testimonials() {
  const items = getPublishableTestimonials();
  if (items.length === 0 && !import.meta.env.DEV) return null;

  return (
    <section id="testimonios" className="section testimonials on-dark" aria-labelledby="testimonials-title">
      <div className="container">
        <header className="testimonials__head" data-reveal="">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="testimonials-title" className="section-title">
            {copy.title}
          </h2>
        </header>

        {items.length > 0 ? (
          <ul className="testimonials__list" role="list">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={`quote${index === 0 ? ' quote--feature' : ''}`}
                data-reveal=""
                data-reveal-delay={String(Math.min(index + 1, 3))}
              >
                <figure>
                  <blockquote>
                    <p>{item.quote}</p>
                  </blockquote>
                  <figcaption>
                    <span className="quote__name">{item.name}</span>
                    {item.context ? <span className="quote__context">{item.context}</span> : null}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        ) : (
          <div className="testimonials__pending" data-reveal="">
            <div className="testimonials__skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <DevNote>
              faltan testimonios reales de clientes de Luis, con autorización por escrito para publicarlos (texto,
              nombre como desean aparecer y contexto opcional). Sin ellos, esta sección no se publica en producción.
            </DevNote>
          </div>
        )}
      </div>
    </section>
  );
}
