import { aboutCopy as copy } from '../../content/copy.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { FORM_ANCHOR } from '../../content/navigation.js';
import { goToSection } from '../../lib/scroll.js';
import { Icon } from '../ui/Icon.jsx';
import { Portrait } from '../ui/Portrait.jsx';
import './About.css';

export function About() {
  return (
    <section id="sobre-luis" className="section about" aria-labelledby="about-title">
      <div className="container about__grid">
        <div className="about__visual" data-reveal="">
          <div className="about__accent" aria-hidden="true" />
          <Portrait
            image={media.aboutPortrait}
            variant="about"
            sizes="(min-width: 960px) 440px, 90vw"
            className="about__portrait"
            note="Segundo retrato de Luis (distinto al del hero, idealmente en contexto de trabajo)."
          />
          <p className="about__caption">
            <span className="about__caption-name">{site.name}</span>
            <span>
              {site.location.city}, {site.location.stateShort}
            </span>
          </p>
        </div>

        <div className="about__copy">
          <p className="eyebrow" data-reveal="">
            {copy.eyebrow}
          </p>
          <h2 id="about-title" className="section-title" data-section-focus="" data-reveal="">
            {copy.title}
          </h2>
          <p className="about__intro" data-reveal="" data-reveal-delay="1">
            {copy.intro}
          </p>
          <p className="about__approach" data-reveal="" data-reveal-delay="1">
            {copy.approach}
          </p>

          <dl className="about__facts" data-reveal="" data-reveal-delay="2">
            {copy.facts.map((fact) => (
              <div key={fact.term} className="about__fact">
                <dt>{fact.term}</dt>
                <dd>{fact.detail}</dd>
              </div>
            ))}
          </dl>

          <div className="about__actions" data-reveal="" data-reveal-delay="2">
            <a
              className="btn btn--navy"
              href={`#${FORM_ANCHOR}`}
              onClick={(event) => {
                event.preventDefault();
                goToSection(FORM_ANCHOR);
              }}
            >
              Solicitar asesoría
              <Icon name="arrowRight" className="btn__icon btn__icon--move" />
            </a>
            <a className="about__link" href={site.whatsapp.href} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" />
              WhatsApp {site.whatsapp.display}
              <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
            </a>
            <a className="about__link" href={site.instagram.href} target="_blank" rel="noopener noreferrer">
              <Icon name="instagram" />
              {site.instagram.handle}
              <span className="visually-hidden"> (Instagram, se abre en una pestaña nueva)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
