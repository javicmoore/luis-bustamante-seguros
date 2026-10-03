import { useEffect, useState } from 'react';
import { FORM_ANCHOR, primaryCta } from '../../content/navigation.js';
import { goToSection } from '../../lib/scroll.js';
import { Icon } from '../ui/Icon.jsx';
import './MobileCtaBar.css';

/**
 * Acceso al contacto durante el recorrido en teléfonos (el header móvil no tiene CTA).
 * Aparece al pasar los botones del hero y se oculta cuando el formulario está a la vista
 * o mientras se escribe en un campo, para no tapar contenido ni el teclado.
 */
export function MobileCtaBar() {
  const [pastHero, setPastHero] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const heroActions = document.getElementById('hero-actions');
    const form = document.getElementById(FORM_ANCHOR);
    const footer = document.getElementById('site-footer');
    const observers = [];
    const watch = (el, cb, options) => {
      if (!el) return;
      const observer = new IntersectionObserver(([entry]) => cb(entry), options);
      observer.observe(el);
      observers.push(observer);
    };
    watch(heroActions, (entry) => setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    watch(form, (entry) => setFormVisible(entry.isIntersecting), { rootMargin: '0px 0px -15% 0px' });
    watch(footer, (entry) => setFooterVisible(entry.isIntersecting));

    const onFocusIn = (event) => {
      if (event.target.matches?.('input, textarea, select')) setTyping(true);
    };
    const onFocusOut = () => setTyping(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      observers.forEach((observer) => observer.disconnect());
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const visible = pastHero && !formVisible && !footerVisible && !typing;

  return (
    <div
      id="mobile-cta"
      className={`mobile-cta${visible ? ' is-visible' : ''}`}
      inert={!visible}
      aria-hidden={visible ? undefined : 'true'}
    >
      <a
        className="btn btn--gold btn--block"
        href={`#${FORM_ANCHOR}`}
        onClick={(event) => {
          event.preventDefault();
          goToSection(FORM_ANCHOR);
        }}
      >
        {primaryCta.label}
        <Icon name="arrowRight" className="btn__icon btn__icon--move" />
      </a>
    </div>
  );
}
