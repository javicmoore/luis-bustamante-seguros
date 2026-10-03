import { Header } from '../components/Header/Header.jsx';
import { DemoBanner } from '../components/DemoBanner/DemoBanner.jsx';
import { Footer } from '../components/Footer/Footer.jsx';
import './pages.css';

export function NotFoundPage() {
  return (
    <>
      <DemoBanner />
      <Header variant="page" />
      <main id="main" tabIndex={-1} className="page page--center">
        <div className="container page__container">
          <p className="eyebrow">Error 404</p>
          <h1 className="page__title">No encontramos esta página.</h1>
          <p className="page__subtitle">Es posible que el enlace haya cambiado. Puedes volver al inicio o solicitar tu asesoría.</p>
          <div className="page__actions">
            <a className="btn btn--navy" href="/">
              Volver al inicio
            </a>
            <a className="btn btn--ghost" href="/#asesoria">
              Solicitar asesoría
            </a>
          </div>
        </div>
      </main>
      <Footer variant="page" />
    </>
  );
}
