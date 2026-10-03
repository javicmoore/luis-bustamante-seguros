// Prerender en build: genera el HTML de cada página para que el contenido exista desde el
// primer pintado (sin esperar JavaScript) y sea indexable. Ver scripts/prerender.mjs.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App.jsx';
import { PrivacyPage } from './pages/PrivacyPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { buildHead } from './seo/head.js';
import { Hydrated } from './entries/Hydrated.jsx';

const PAGES = { home: App, privacy: PrivacyPage, notFound: NotFoundPage };

export function render(page, options = {}) {
  const Page = PAGES[page];
  if (!Page) throw new Error(`Página desconocida: ${page}`);
  const appHtml = renderToString(
    <StrictMode>
      <Hydrated>
        <Page />
      </Hydrated>
    </StrictMode>,
  );
  return { appHtml, head: buildHead(page, options) };
}
