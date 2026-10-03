import { useEffect } from 'react';
import { DemoBanner } from './components/DemoBanner/DemoBanner.jsx';
import { Header } from './components/Header/Header.jsx';
import { Hero } from './components/Hero/Hero.jsx';
import { BrandMarquee } from './components/BrandMarquee/BrandMarquee.jsx';
import { Simulator } from './components/Simulator/Simulator.jsx';
import { LeadForm } from './components/LeadForm/LeadForm.jsx';
import { Services } from './components/Services/Services.jsx';
import { About } from './components/About/About.jsx';
import { VideoIntro } from './components/VideoIntro/VideoIntro.jsx';
import { Testimonials } from './components/Testimonials/Testimonials.jsx';
import { Faq } from './components/Faq/Faq.jsx';
import { Footer } from './components/Footer/Footer.jsx';
import { MobileCtaBar } from './components/MobileCtaBar/MobileCtaBar.jsx';
import { initReveal } from './lib/reveal.js';
import { track } from './lib/analytics.js';

// Orden final: 1 Hero · 2 Marcas · 3 Simulador · 4 Formulario · 5 Beneficios y servicios ·
// 6 Sobre Luis · 7 Video · 8 Testimonios · 9 FAQ · 10 Footer (+ header y aviso de privacidad).
export function App() {
  useEffect(() => {
    track('page_view');
    return initReveal(document);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <DemoBanner />
      <Header variant="home" />
      <main id="main" tabIndex={-1}>
        <Hero />
        <BrandMarquee />
        <Simulator />
        <LeadForm />
        <Services />
        <About />
        <VideoIntro />
        <Testimonials />
        <Faq />
      </main>
      <Footer variant="home" />
      <MobileCtaBar />
    </>
  );
}
