import { useState } from 'react';
import { faqs } from '../../content/faq.js';
import { faqCopy as copy } from '../../content/copy.js';
import { site } from '../../content/site.js';
import { FORM_ANCHOR } from '../../content/navigation.js';
import { goToSection } from '../../lib/scroll.js';
import { Icon } from '../ui/Icon.jsx';
import './Faq.css';

/**
 * Acordeón accesible: botones con aria-expanded/aria-controls y paneles con región.
 * La altura se anima con grid-template-rows (sin medir en JS); cerrado, el panel queda
 * oculto para lectores de pantalla y fuera del orden de tabulación.
 */
export function Faq() {
  const [open, setOpen] = useState(() => new Set());

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="faq" className="section faq" aria-labelledby="faq-title">
      <div className="container faq__grid">
        <div className="faq__aside" data-reveal="">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="faq-title" className="section-title" data-section-focus="">
            {copy.title}
          </h2>
          <p className="faq__aside-text">{copy.asideText}</p>
          <div className="faq__aside-actions">
            <a
              className="btn btn--navy btn--sm"
              href={`#${FORM_ANCHOR}`}
              onClick={(event) => {
                event.preventDefault();
                goToSection(FORM_ANCHOR);
              }}
            >
              Solicitar asesoría
              <Icon name="arrowRight" className="btn__icon btn__icon--move" />
            </a>
            <a className="faq__wa" href={site.whatsapp.href} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" />
              WhatsApp
              <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
            </a>
          </div>
        </div>

        <div className="faq__list" data-reveal="" data-reveal-delay="1">
          {faqs.map((item) => {
            const isOpen = open.has(item.id);
            return (
              <div key={item.id} className={`faq-item${isOpen ? ' is-open' : ''}`}>
                <h3 className="faq-item__heading">
                  <button
                    type="button"
                    id={`faq-btn-${item.id}`}
                    className="faq-item__button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${item.id}`}
                    onClick={() => toggle(item.id)}
                  >
                    <span>{item.question}</span>
                    <span className="faq-item__icon" aria-hidden="true" />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${item.id}`}
                  className="faq-item__panel"
                  role="region"
                  aria-labelledby={`faq-btn-${item.id}`}
                  inert={!isOpen}
                >
                  <div className="faq-item__inner">
                    {item.answer.map((paragraph) => (
                      <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
