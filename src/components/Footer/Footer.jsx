import { site } from '../../content/site.js';
import { footerCopy as copy } from '../../content/copy.js';
import { FORM_ANCHOR } from '../../content/navigation.js';
import { goToSection } from '../../lib/scroll.js';
import { Icon } from '../ui/Icon.jsx';
import './Footer.css';

const BUILD_YEAR = import.meta.env.VITE_BUILD_YEAR || '2026';

export function Footer({ variant = 'home' }) {
  const isHome = variant === 'home';
  const formHref = isHome ? `#${FORM_ANCHOR}` : `/#${FORM_ANCHOR}`;

  return (
    <footer id="site-footer" className="site-footer on-dark">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <p className="site-footer__name">{site.name}</p>
            <p className="site-footer__role">{site.role}</p>
            <p className="site-footer__tagline">{copy.tagline}</p>
          </div>
          <a
            className="btn btn--gold site-footer__cta"
            href={formHref}
            onClick={
              isHome
                ? (event) => {
                    event.preventDefault();
                    goToSection(FORM_ANCHOR);
                  }
                : undefined
            }
          >
            {copy.cta}
            <Icon name="arrowRight" className="btn__icon btn__icon--move" />
          </a>
        </div>

        <div className="site-footer__cols">
          <div>
            <h2 className="site-footer__heading">Contacto</h2>
            <ul className="site-footer__list" role="list">
              <li>
                <a href={site.phone.href}>
                  <Icon name="phone" />
                  Teléfono {site.phone.display}
                </a>
              </li>
              <li>
                <a href={site.whatsapp.href} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" />
                  WhatsApp {site.whatsapp.display}
                  <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
                </a>
              </li>
              <li>
                <a href={site.instagram.href} target="_blank" rel="noopener noreferrer">
                  <Icon name="instagram" />
                  Instagram {site.instagram.handle}
                  <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="site-footer__heading">Ubicación</h2>
            <p className="site-footer__text">
              <Icon name="pin" />
              <span>
                {site.location.city}, {site.location.state}
                <br />
                Asesoría para personas de todo México
              </span>
            </p>
          </div>
          <div>
            <h2 className="site-footer__heading">Legal</h2>
            <ul className="site-footer__list" role="list">
              <li>
                <a href="/aviso-de-privacidad">Aviso de privacidad</a>
              </li>
            </ul>
          </div>
        </div>

        <p className="site-footer__legal">
          © <span>{BUILD_YEAR}</span> {site.name}. {site.role}.
        </p>
      </div>
    </footer>
  );
}
