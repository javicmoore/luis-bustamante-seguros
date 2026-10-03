import { useEffect } from 'react';
import { DemoBanner } from '../components/DemoBanner/DemoBanner.jsx';
import { Header } from '../components/Header/Header.jsx';
import { Footer } from '../components/Footer/Footer.jsx';
import { PrivacyContent } from '../components/Privacy/PrivacyContent.jsx';
import { track } from '../lib/analytics.js';
import './pages.css';

export function PrivacyPage() {
  useEffect(() => {
    track('page_view');
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <DemoBanner />
      <Header variant="page" />
      <main id="main" tabIndex={-1} className="page">
        <div className="container page__container">
          <a className="page__back" href="/">
            ← Volver al inicio
          </a>
          <h1 className="page__title">Aviso de privacidad</h1>
          <p className="page__subtitle">Formulario de solicitud de asesoría · Luis Bustamante</p>
          <PrivacyContent headingLevel={2} />
        </div>
      </main>
      <Footer variant="page" />
    </>
  );
}
