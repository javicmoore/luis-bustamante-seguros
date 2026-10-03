import { heroCopy } from '../../content/copy.js';
import { media } from '../../content/media.js';
import { site } from '../../content/site.js';
import { FORM_ANCHOR, SIMULATOR_ANCHOR } from '../../content/navigation.js';
import { Portrait } from '../ui/Portrait.jsx';
import { Icon } from '../ui/Icon.jsx';
import { goToSection } from '../../lib/scroll.js';
import './Hero.css';

function jump(event, id) {
  event.preventDefault();
  goToSection(id);
}

export function Hero() {
  // El subrayado dibujado acompaña solo a la última palabra del acento.
  const accentWords = heroCopy.titleAccent.split(' ');
  const accentLast = accentWords.pop();

  return (
    <section id="inicio" className="hero on-dark" aria-labelledby="hero-title">
      <div id="scroll-sentinel" className="hero__sentinel" aria-hidden="true" />
      <div className="hero__backdrop" aria-hidden="true">
        <svg className="hero__orbits" viewBox="0 0 800 800" fill="none">
          <circle cx="400" cy="400" r="210" />
          <circle cx="400" cy="400" r="300" />
          <circle cx="400" cy="400" r="390" />
        </svg>
      </div>

      <div className="container hero__grid">
        <div className="hero__copy">
          <div className="hero__eyebrow">
            <Portrait image={media.heroPortrait} variant="avatar" className="hero__avatar" sizes="48px" />
            <span className="hero__eyebrow-text">
              <span className="hero__name">{heroCopy.eyebrowName}</span>
              <span className="hero__dot" aria-hidden="true">
                ·
              </span>
              <span className="hero__topic">{heroCopy.eyebrowTopic}</span>
            </span>
          </div>

          <h1 id="hero-title" className="hero__title display" data-section-focus="">
            <span className="hero__line">
              <span className="hero__line-inner">{heroCopy.titleLead}</span>
            </span>{' '}
            <span className="hero__line hero__line--accent">
              <span className="hero__line-inner">
                <em>
                  {accentWords.join(' ')}{' '}
                  <span className="hero__underlined">
                    {accentLast}
                    <svg className="hero__swash" viewBox="0 0 320 24" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 17 C 70 6, 150 4, 316 12" />
                    </svg>
                  </span>
                </em>
              </span>
            </span>
          </h1>

          <p className="hero__lead lead">{heroCopy.description}</p>

          <div className="hero__actions" id="hero-actions">
            <a className="btn btn--gold" href={`#${FORM_ANCHOR}`} onClick={(e) => jump(e, FORM_ANCHOR)}>
              {heroCopy.primaryCta}
              <Icon name="arrowRight" className="btn__icon btn__icon--move" />
            </a>
            <a
              className="btn btn--ghost-light"
              href={`#${SIMULATOR_ANCHOR}`}
              onClick={(e) => jump(e, SIMULATOR_ANCHOR)}
            >
              {heroCopy.secondaryCta}
            </a>
          </div>

          <ul className="hero__meta" role="list">
            <li>
              <Icon name="pin" />
              {heroCopy.locationNote}
            </li>
            <li>
              <Icon name="check" />
              {heroCopy.freeNote}
            </li>
          </ul>
        </div>

        <div className="hero__visual">
          <div className="hero__frame" aria-hidden="true" />
          <Portrait
            image={media.heroPortrait}
            variant="hero"
            priority
            sizes="(min-width: 1024px) 460px, (min-width: 640px) 70vw, 92vw"
            className="hero__portrait"
            note="Retrato original de Luis (foto real, vertical, buena resolución)."
          />
          <div className="hero__card hero__card--name">
            <p className="hero__card-name">{site.name}</p>
            <p className="hero__card-role">{site.role}</p>
          </div>
          <a className="hero__card hero__card--call" href={site.phone.href}>
            <span className="hero__call-icon">
              <Icon name="phone" />
            </span>
            <span>
              <span className="hero__call-label">Llamar</span>
              <span className="hero__call-number">{site.phone.display}</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
