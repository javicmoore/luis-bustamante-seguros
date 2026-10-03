import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { navItems, primaryCta, FORM_ANCHOR } from '../../content/navigation.js';
import { site } from '../../content/site.js';
import { Wordmark } from '../ui/Wordmark.jsx';
import { Icon } from '../ui/Icon.jsx';
import { goToSection } from '../../lib/scroll.js';
import './Header.css';

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const NAV_IDS = new Set(navItems.map((item) => item.id));

export function Header({ variant = 'home' }) {
  const isHome = variant === 'home';
  const [scrolled, setScrolled] = useState(!isHome);
  const [open, setOpen] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [active, setActive] = useState(null);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);

  const hrefFor = (id) => (isHome ? `#${id}` : `/#${id}`);

  // Cambio de superficie al avanzar: un centinela en la parte superior (sin escuchar scroll).
  useEffect(() => {
    if (!isHome) return undefined;
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isHome]);

  // Sección activa para aria-current (solo secciones que están en la navegación).
  useEffect(() => {
    if (!isHome) return undefined;
    const sections = document.querySelectorAll('main > section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(NAV_IDS.has(entry.target.id) ? entry.target.id : null);
        }
      },
      { rootMargin: '-42% 0px -56% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  // Menú móvil abierto: bloquea el scroll y vuelve inerte el resto de la página.
  // useLayoutEffect para que al cerrar (flushSync) el contenido ya sea navegable y enfocable.
  useClientLayoutEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    const outside = ['main', 'site-footer', 'mobile-cta']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    root.classList.add('is-locked');
    outside.forEach((el) => {
      el.inert = true;
    });
    menuRef.current?.querySelector('a')?.focus({ preventScroll: true });

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const wide = window.matchMedia('(min-width: 1024px)');
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      root.classList.remove('is-locked');
      outside.forEach((el) => {
        el.inert = false;
      });
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [open]);

  // En pantallas pequeñas el header se retira mientras se escribe en el formulario,
  // para que no cubra campos cuando aparece el teclado.
  useEffect(() => {
    const small = window.matchMedia('(max-width: 767px)');
    const onFocusIn = (event) => {
      const el = event.target;
      if (small.matches && el.matches?.('input, textarea, select') && el.closest('[data-tuck-header]')) {
        setTucked(true);
      }
    };
    const onFocusOut = (event) => {
      if (!event.relatedTarget?.closest?.('[data-tuck-header]')) setTucked(false);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const navigate = (event, id) => {
    if (!isHome) {
      setOpen(false);
      return;
    }
    event.preventDefault();
    if (open) flushSync(() => setOpen(false));
    goToSection(id);
  };

  const classes = [
    'site-header',
    `site-header--${variant}`,
    scrolled && 'is-scrolled',
    open && 'is-open',
    tucked && !open && 'is-tucked',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={classes}>
      <div className="site-header__bar">
        <Wordmark
          href={isHome ? '#inicio' : '/'}
          onClick={isHome ? (event) => navigate(event, 'inicio') : undefined}
          className="site-header__brand"
        />

        <nav className="site-header__nav" aria-label="Principal">
          <ul role="list">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={hrefFor(item.id)}
                  aria-current={active === item.id ? 'true' : undefined}
                  onClick={(event) => navigate(event, item.id)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          className="btn btn--sm site-header__cta"
          href={hrefFor(FORM_ANCHOR)}
          onClick={(event) => navigate(event, FORM_ANCHOR)}
        >
          {primaryCta.label}
          <Icon name="arrowRight" className="btn__icon btn__icon--move" />
        </a>

        <button
          ref={toggleRef}
          type="button"
          className="site-header__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="visually-hidden">{open ? 'Cerrar menú' : 'Abrir menú'}</span>
          <span className="burger" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>

      <div id="mobile-menu" ref={menuRef} className="mobile-menu on-dark" inert={!open}>
        <nav aria-label="Menú móvil">
          <ol className="mobile-menu__list" role="list">
            {navItems.map((item, index) => (
              <li key={item.id}>
                <a href={hrefFor(item.id)} onClick={(event) => navigate(event, item.id)}>
                  <span className="mobile-menu__index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mobile-menu__footer">
          <a
            className="btn btn--gold btn--block"
            href={hrefFor(FORM_ANCHOR)}
            onClick={(event) => navigate(event, FORM_ANCHOR)}
          >
            {primaryCta.label}
            <Icon name="arrowRight" className="btn__icon btn__icon--move" />
          </a>
          <ul className="mobile-menu__contact" role="list">
            <li>
              <a href={site.phone.href}>
                <Icon name="phone" />
                Llamar al {site.phone.display}
              </a>
            </li>
            <li>
              <a href={site.whatsapp.href} target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" />
                WhatsApp
                <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
              </a>
            </li>
            <li>
              <a href={site.instagram.href} target="_blank" rel="noopener noreferrer">
                <Icon name="instagram" />
                Instagram
                <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
              </a>
            </li>
          </ul>
          <p className="mobile-menu__place">
            <Icon name="pin" />
            Mexicali, B.C. · Asesoría en todo México
          </p>
        </div>
      </div>
    </header>
  );
}
