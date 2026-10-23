import { expect, test } from '@playwright/test';
import { open } from './utils.js';

const WIDTHS = [
  [320, 568],
  [375, 667],
  [390, 844],
  [768, 1024],
  [1366, 768],
  [1920, 1080],
];

test.describe('estructura y contenido', () => {
  test('bloques en orden, anclas del header y sin secciones eliminadas', async ({ page }) => {
    await open(page, '/');
    const ids = await page.$$eval('main > section', (els) => els.map((el) => el.id));
    const expected = ['inicio', 'simulador', 'asesoria', 'sobre-luis', 'video', 'testimonios', 'servicios', 'faq'];
    expect(ids.filter((id) => expected.includes(id))).toEqual(expected);
    // "Sobre Luis" y el video son consecutivos, justo después del formulario.
    expect(ids.slice(ids.indexOf('asesoria'), ids.indexOf('asesoria') + 3)).toEqual(['asesoria', 'sobre-luis', 'video']);
    await expect(page.locator('#site-footer')).toBeVisible();

    const nav = await page.$$eval('.site-header__nav a', (as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    expect(nav).toEqual([
      ['Inicio', '#inicio'],
      ['Simulador', '#simulador'],
      ['Asesoría', '#asesoria'],
      ['Sobre Luis', '#sobre-luis'],
      ['Video', '#video'],
      ['Testimonios', '#testimonios'],
      ['FAQ', '#faq'],
    ]);
    const body = await page.locator('body').innerText();
    // La sección eliminada ("Cómo funciona") no vuelve como título; el texto de un testimonio puede usar esas palabras.
    const headings = await page.$$eval('h1, h2, h3', (els) => els.map((el) => el.textContent).join(' | '));
    expect(headings).not.toMatch(/Cómo funciona|El punto de partida/i);
    expect(body).not.toMatch(/Lucy/i);
  });

  test('"Sobre Luis" sin las filas de datos; conserva foto, presentación y contacto', async ({ page }) => {
    await open(page, '/');
    const about = page.locator('#sobre-luis');
    await expect(about.locator('dl, dt, dd, .about__facts')).toHaveCount(0);
    for (const term of ['Ubicación', 'Alcance', 'Especialidad', 'Cotización y asesoría']) {
      await expect(about.getByText(term, { exact: true })).toHaveCount(0);
    }
    await expect(about.locator('.about__portrait img')).toHaveCount(1);
    await expect(about.locator('#about-title')).toHaveText('Hola, soy Luis Bustamante.');
    await expect(about.getByRole('link', { name: /Solicitar asesoría/ })).toBeVisible();
    await expect(about.locator('a[href*="wa.me"]')).toHaveCount(1);
  });

  test('sin guiones largos como puntuación en los textos de las páginas', async ({ page }) => {
    const dashes = new RegExp(`[${String.fromCharCode(0x2014)}${String.fromCharCode(0x2013)}]`);
    for (const path of ['/', '/aviso-de-privacidad', '/no-existe']) {
      await open(page, path);
      const text = await page.evaluate(() => {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, template').forEach((el) => el.remove());
        return `${document.title} ${clone.textContent}`;
      });
      const hits = text.split(/(?<=[.!?])\s+/).filter((sentence) => dashes.test(sentence));
      expect(hits, path).toEqual([]);
    }
  });

  test('identidad y teléfonos vigentes en todo el sitio', async ({ page }) => {
    for (const path of ['/', '/aviso-de-privacidad']) {
      await open(page, path);
      const tels = await page.$$eval('a[href^="tel:"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
      expect(tels).toEqual(['tel:+526863872193']);
      const wa = await page.$$eval('a[href*="wa.me"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
      for (const href of wa) expect(href).toMatch(/^https:\/\/wa\.me\/526863872193(\?text=[^&]+)?$/);
      expect(wa).toContain('https://wa.me/526863872193');
      const mail = await page.$$eval('a[href^="mailto:"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
      expect(mail).toEqual(['mailto:luis.bpaz@outlook.com']);
      const text = await page.locator('body').innerText();
      const phones = text.match(/\b\d{3}\s?\d{3}\s?\d{4}\b/g) || [];
      for (const phone of phones) expect(phone.replace(/\s/g, '')).toBe('6863872193');
      await expect(page.locator('a[href="https://www.instagram.com/luisbustamante.seguros/"]').first()).toBeAttached();
    }
  });

  test('aviso de privacidad: ruta directa, borrador identificado y noindex', async ({ page }) => {
    const res = await open(page, '/aviso-de-privacidad');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Aviso de privacidad' })).toBeVisible();
    await expect(page.getByText('Borrador pendiente de revisión.')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('ruta inexistente responde 404 con página propia', async ({ page }) => {
    const res = await open(page, '/no-existe');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'No encontramos esta página.' })).toBeVisible();
  });
});

test.describe('layout responsivo', () => {
  for (const [width, height] of WIDTHS) {
    test(`sin scroll horizontal a ${width}px y CTA visible en el primer viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page, '/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const cta = page.locator('#hero-actions .btn--gold');
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
      // Recorre la página: no debe quedar texto oculto por animaciones.
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(height * 0.75)) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(900);
      const hidden = await page.$$eval('[data-reveal]', (els) => els.filter((el) => getComputedStyle(el).opacity === '0').length);
      expect(hidden).toBe(0);
    });
  }
});

test.describe('hero y header en móvil', () => {
  for (const width of [320, 375, 390, 414]) {
    test(`${width}px: foto limpia, nombre debajo y header opaco al desplazarse`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await open(page, '/');
      // Sin tarjetas sobre la foto: la de llamada se oculta y el nombre queda debajo como texto.
      await expect(page.locator('.hero__card--call')).toBeHidden();
      const caption = page.locator('.hero__card--name');
      await expect(caption).toBeVisible();
      await expect(caption).toContainText('Luis Bustamante');
      await expect(caption).toContainText('Agente de seguros y asesor financiero');
      const portrait = page.locator('.hero__portrait');
      const [p, c] = [await portrait.boundingBox(), await caption.boundingBox()];
      expect(c.y).toBeGreaterThanOrEqual(p.y + p.height - 0.5);

      // Nada pintado encima del retrato (muestreo de puntos con el retrato a la vista).
      await page.evaluate(() => {
        const el = document.querySelector('.hero__portrait');
        window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 140);
      });
      await page.waitForTimeout(300);
      const foreign = await page.evaluate(() => {
        const b = document.querySelector('.hero__portrait').getBoundingClientRect();
        const found = new Set();
        for (let i = 1; i < 8; i += 1) {
          for (let j = 1; j < 10; j += 1) {
            const y = b.top + (b.height * j) / 10;
            if (y < 0 || y > innerHeight) continue;
            const hit = document.elementFromPoint(b.left + (b.width * i) / 8, y);
            if (hit && !hit.closest('.hero__portrait') && !hit.matches('.hero__figure, .hero__frame')) found.add(hit.className);
          }
        }
        return [...found];
      });
      expect(foreign).toEqual([]);

      // Al desplazarse: franja blanca opaca de borde a borde.
      await page.evaluate(() => window.scrollTo(0, document.getElementById('simulador').offsetTop + 120));
      await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
      const surface = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        const band = getComputedStyle(header, '::before');
        return {
          bar: getComputedStyle(document.querySelector('.site-header__bar')).backgroundColor,
          band: band.backgroundColor,
          bandVisible: band.visibility,
          edgeHit: document.elementFromPoint(2, 4)?.closest('.site-header') !== null,
        };
      });
      expect(surface).toEqual({ bar: 'rgb(255, 255, 255)', band: 'rgb(255, 255, 255)', bandVisible: 'visible', edgeHit: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test('escritorio conserva las tarjetas flotantes del retrato', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await open(page, '/');
    await expect(page.locator('.hero__card--call')).toBeVisible();
    expect(await page.locator('.hero__card--name').evaluate((el) => getComputedStyle(el).position)).toBe('absolute');
  });
});

test.describe('"Conoce a Luis": video de presentación', () => {
  test('carga diferida, póster completo, 16:9 reservado y sin reproducción automática', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requested = [];
    page.on('request', (r) => /luis-presentacion/.test(r.url()) && requested.push(r.url()));
    await open(page, '/');
    const ids = await page.$$eval('main > section', (els) => els.map((el) => el.id));
    expect(ids[ids.indexOf('sobre-luis') + 1]).toBe('video');
    const video = page.locator('#video video');
    await expect(video).toHaveCount(1);
    // Al abrir la página no se pide ni el video ni el póster.
    await page.waitForTimeout(800);
    expect(requested).toEqual([]);
    await expect(video).not.toHaveAttribute('src', /./);

    await page.locator('#video').scrollIntoViewIfNeeded();
    await expect(video).toHaveAttribute('poster', '/media/luis-presentacion-poster.jpg');
    await expect(video).toHaveAttribute('src', '/media/luis-presentacion.mp4');
    const state = await video.evaluate((v) => {
      const r = v.getBoundingClientRect();
      return {
        controls: v.controls,
        playsInline: v.playsInline,
        preload: v.preload,
        autoplay: v.autoplay,
        muted: v.muted,
        paused: v.paused,
        ratio: r.width / r.height,
        label: v.getAttribute('aria-label'),
      };
    });
    expect(state).toMatchObject({ controls: true, playsInline: true, preload: 'none', autoplay: false, muted: false, paused: true, label: 'Video de presentación de Luis Bustamante' });
    expect(Math.abs(state.ratio - 16 / 9)).toBeLessThan(0.01);
    await expect(page.locator('#video')).not.toContainText('próximamente');
    // Con preload="none" el archivo no se descarga hasta que el visitante lo reproduce.
    await page.waitForTimeout(800);
    expect(requested.filter((u) => u.endsWith('.mp4'))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('se reproduce con audio al pedirlo el visitante y se pausa', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await open(page, '/');
    await page.locator('#video').scrollIntoViewIfNeeded();
    const video = page.locator('#video video');
    await expect(video).toHaveAttribute('src', /luis-presentacion\.mp4/);
    // Gesto real del visitante: un clic que llama a play() (los controles nativos no son accesibles por selector).
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.id = 'e2e-play';
      b.textContent = 'reproducir';
      b.addEventListener('click', () => document.querySelector('#video video').play());
      document.getElementById('video').prepend(b);
    });
    await page.locator('#e2e-play').click();
    await page.waitForFunction(() => document.querySelector('#video video').currentTime > 1.5, null, { timeout: 15000 });
    const playing = await video.evaluate((v) => ({
      size: `${v.videoWidth}x${v.videoHeight}`,
      duration: Math.round(v.duration),
      audio: typeof v.webkitAudioDecodedByteCount === 'number' ? v.webkitAudioDecodedByteCount > 0 : true,
      muted: v.muted,
    }));
    if (test.info().project.use.browserName === 'webkit') {
      // WebKit para Windows (Playwright) reporta el tamaño de la caja en lugar del archivo y no cuenta
      // el audio decodificado: aquí solo se comprueba que avanza, su duración y que no está silenciado.
      expect({ duration: playing.duration, muted: playing.muted }).toEqual({ duration: 178, muted: false });
    } else {
      expect(playing).toEqual({ size: '1280x720', duration: 178, audio: true, muted: false });
    }
    await video.evaluate((v) => v.pause());
    await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
  });
});

test.describe('testimonios', () => {
  const QUOTES = [
    ['Karla G.', 'Profesionista independiente', ['“Antes veía el retiro como algo muy lejano. Hoy entiendo la importancia de empezar a prepararme desde ahora y construir poco a poco un respaldo para mi futuro.', 'Agradezco a Luis por explicarme todo de manera clara y puntual.”']],
    ['Sergio C.', 'Ingeniero', ['“Lo que más me gustó de este plan es poder establecer una estrategia de ahorro acorde con mis ingresos y objetivos financieros.', 'Desde el principio, Luis me explicó cómo funciona y qué aspectos debía considerar antes de tomar una decisión.”']],
    ['Alberto G.', 'Empresario', ['“No quería otro seguro más. Le dije a Luis que buscaba algo que me sirviera a mí.', 'Me enseñó cómo separar mi ahorro para mi retiro y a la vez dejar una base para la educación de mis hijos.', 'Ahora todo lo que ahorro tiene un para qué.”']],
  ];

  for (const [width, height, columns] of [
    [320, 640, 1],
    [375, 667, 1],
    [390, 844, 1],
    [768, 1024, 1],
    [1366, 900, 3],
  ]) {
    test(`${width}px: después del video, texto completo, ${columns === 3 ? 'tres tarjetas' : 'una columna'} y sin desbordar`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page, '/');
      const ids = await page.$$eval('main > section', (els) => els.map((el) => el.id));
      expect(ids.slice(ids.indexOf('video'), ids.indexOf('video') + 3)).toEqual(['video', 'testimonios', 'servicios']);
      const section = page.locator('#testimonios');
      await expect(section.locator('#testimonials-title')).toHaveText('Lo que comparten mis clientes');
      const cards = section.locator('li.quote');
      await expect(cards).toHaveCount(3);
      for (const [i, [name, context, quote]] of QUOTES.entries()) {
        const card = cards.nth(i);
        await expect(card.locator('blockquote p')).toHaveText(quote);
        const align = await card.evaluate((li) => ({
          body: getComputedStyle(li.querySelector('blockquote p')).textAlign,
          last: getComputedStyle(li.querySelector('blockquote p')).textAlignLast,
          caption: getComputedStyle(li.querySelector('figcaption')).textAlign,
        }));
        expect(align.body).toBe('justify');
        expect(align.last).toBe('left');
        expect(['left', 'start']).toContain(align.caption);
        await expect(card.locator('figcaption .quote__name')).toHaveText(name);
        await expect(card.locator('figcaption .quote__context')).toHaveText(context);
      }
      // Sin fotos, estrellas ni insignias: solo texto y atribución.
      await expect(section.locator('img, svg, picture, [class*="star"], [class*="badge"], [class*="rating"]')).toHaveCount(0);
      await section.scrollIntoViewIfNeeded();
      const layout = await section.evaluate((s) => {
        const items = [...s.querySelectorAll('li.quote')];
        const tops = new Set(items.map((li) => Math.round(li.getBoundingClientRect().top)));
        const clipped = [...s.querySelectorAll('blockquote p')].filter((p) => p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1).length;
        const overflowing = items.filter((li) => li.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).length;
        return { rows: tops.size, clipped, overflowing, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      expect(layout).toEqual({ rows: columns === 3 ? 1 : 3, clipped: 0, overflowing: 0, page: 0 });
    });
  }
});

test.describe('apariciones al navegar por anclas', () => {
  for (const [width, height, via] of [
    [1366, 900, 'nav'],
    [390, 844, 'menu'],
  ]) {
    test(`${width}px: el contenido de la sección destino llega visible (sin huecos por animación)`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page, '/');
      for (const [label, id] of [
        ['Sobre Luis', 'sobre-luis'],
        ['FAQ', 'faq'],
        ['Simulador', 'simulador'],
      ]) {
        if (via === 'menu') {
          await page.locator('.site-header__toggle').click();
          await page.locator('#mobile-menu').getByRole('link', { name: new RegExp(label) }).click();
        } else {
          await page.locator('.site-header__nav').getByRole('link', { name: label }).click();
        }
        await page.waitForTimeout(1300);
        const hidden = await page.evaluate((sid) => {
          const section = document.getElementById(sid);
          return [...section.querySelectorAll('[data-reveal]')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.bottom > 0 && r.top < innerHeight;
            })
            .filter((el) => Number(getComputedStyle(el).opacity) < 0.99)
            .map((el) => el.className || el.tagName);
        }, id);
        expect(hidden, `${label}`).toEqual([]);
      }
    });
  }
});

test.describe('header, hero y accesos directos', () => {
  test('escritorio: enlaces y botones del header en una línea recta, con llamada y correo', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await open(page, '/');
    await expect(page.locator('.site-header__nav')).toBeVisible();
    await expect(page.locator('.site-header__toggle')).toBeHidden();
    await expect(page.locator('.site-header__call')).toHaveAttribute('href', 'tel:+526863872193');
    await expect(page.locator('.site-header__call')).toContainText('Llamar');
    await expect(page.locator('.site-header__mail')).toHaveAttribute('href', 'mailto:luis.bpaz@outlook.com');
    await expect(page.locator('.site-header .wordmark__role')).toHaveText('Asesor financiero y agente de seguros');
    const bar = await page.locator('.site-header__bar').evaluate((el) => {
      const items = [...el.children].filter((c) => getComputedStyle(c).display !== 'none');
      const centers = items.map((c) => c.getBoundingClientRect()).map((r) => r.top + r.height / 2);
      const links = [...el.querySelectorAll('.site-header__nav a, .site-header__contact, .site-header__cta')].map((a) => a.getBoundingClientRect());
      return {
        spread: Math.max(...centers) - Math.min(...centers),
        linkSpread: Math.max(...links.map((r) => r.top + r.height / 2)) - Math.min(...links.map((r) => r.top + r.height / 2)),
        overflow: el.scrollWidth - el.clientWidth,
        rotated: [...el.querySelectorAll('*')].filter((n) => !['none', '0deg'].includes(getComputedStyle(n).rotate) || getComputedStyle(n).transform.startsWith('matrix(') && getComputedStyle(n).transform !== 'matrix(1, 0, 0, 1, 0, 0)').length,
      };
    });
    expect(bar.spread).toBeLessThanOrEqual(1.5);
    expect(bar.linkSpread).toBeLessThanOrEqual(1.5);
    expect(bar.overflow).toBeLessThanOrEqual(0);
    expect(bar.rotated).toBe(0);
    // Tarjetas del retrato rectas en escritorio.
    const cards = await page.$$eval('.hero__card', (els) => els.map((el) => getComputedStyle(el).rotate));
    expect(cards.every((r) => r === 'none' || r === '0deg')).toBe(true);
  });

  for (const width of [1024, 1280]) {
    test(`${width}px: menú compacto sin amontonamiento, con llamada y correo`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, '/');
      await expect(page.locator('.site-header__nav')).toBeHidden();
      await expect(page.locator('.site-header__toggle')).toBeVisible();
      await expect(page.locator('.site-header__call')).toBeVisible();
      await expect(page.locator('.site-header__mail')).toBeVisible();
      expect(await page.locator('.site-header__bar').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test('menú móvil con Video, Testimonios, llamada y correo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/');
    await page.locator('.site-header__toggle').click();
    const menu = page.locator('#mobile-menu');
    await expect(menu.locator('.mobile-menu__list a')).toHaveText([/Inicio/, /Simulador/, /Asesoría/, /Sobre Luis/, /Video/, /Testimonios/, /FAQ/]);
    await expect(menu.locator('a[href="tel:+526863872193"]')).toBeVisible();
    await expect(menu.locator('a[href="mailto:luis.bpaz@outlook.com"]')).toBeVisible();
    for (const [label, id] of [['Video', 'video-title'], ['Testimonios', 'testimonials-title']]) {
      if (!(await menu.isVisible())) await page.locator('.site-header__toggle').click();
      await menu.getByRole('link', { name: new RegExp(label) }).click();
      await page.waitForTimeout(1300);
      const title = await page.locator(`#${id}`).boundingBox();
      const bar = await page.locator('.site-header__bar').boundingBox();
      expect(title.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
      expect(title.y).toBeLessThan(844);
    }
  });

  test('hero: sin los textos retirados y con cinco accesos a WhatsApp con mensaje prellenado', async ({ page }) => {
    await open(page, '/');
    const hero = page.locator('#inicio');
    await expect(hero).not.toContainText('Seguros, ahorro y retiro según tus objetivos');
    await expect(hero).not.toContainText('Cotización y asesoría gratuitas');
    await expect(hero.locator('.hero__meta, .hero__lead')).toHaveCount(0);
    await expect(hero.locator('#hero-title')).toContainText('Protege lo que has construido.');
    const links = hero.locator('.hero__shortcut');
    await expect(links).toHaveCount(5);
    const data = await links.evaluateAll((as) =>
      as.map((a) => {
        const url = new URL(a.href);
        const r = a.getBoundingClientRect();
        return { label: a.querySelector('.hero__shortcut-label').textContent, base: url.origin + url.pathname, text: url.searchParams.get('text'), raw: a.getAttribute('href'), target: a.target, h: r.height, w: r.width };
      }),
    );
    expect(data.map((d) => [d.label, d.text])).toEqual([
      ['Auto', 'Hola Luis, me interesa un seguro de auto.'],
      ['Gastos médicos mayores', 'Hola Luis, me interesa un seguro de gastos médicos mayores.'],
      ['Educación', 'Hola Luis, me interesa un plan para la educación.'],
      ['Hogar', 'Hola Luis, me interesa un seguro de hogar.'],
      ['Seguro de vida', 'Hola Luis, me interesa un seguro de vida.'],
    ]);
    for (const d of data) {
      expect(d.base).toBe('https://wa.me/526863872193');
      expect(d.raw).toContain(encodeURIComponent(d.text));
      expect(d.target).toBe('_blank');
      expect(d.h).toBeGreaterThanOrEqual(44);
      expect(d.w).toBeGreaterThanOrEqual(44);
    }
    // Teclado: el foco es visible en los accesos.
    await links.first().focus();
    expect(await links.first().evaluate((a) => getComputedStyle(a).outlineStyle)).not.toBe('none');
  });
});

test.describe('beneficios y video', () => {
  test('"Beneficios" en tarjetas, con las tarjetas de servicios conservadas debajo', async ({ page }) => {
    await open(page, '/');
    const section = page.locator('#servicios');
    await expect(section.locator('.eyebrow').first()).toHaveText('Beneficios');
    await expect(section.locator('.benefit__title')).toHaveText([
      'Construye un respaldo para tu retiro',
      'Planea según tus objetivos',
      'Conoce las condiciones antes de decidir',
    ]);
    await expect(section.locator('.benefit__text')).toHaveText([
      'Explora cómo una estrategia de aportaciones puede ayudarte a prepararte para esa etapa.',
      'Revisa con Luis opciones acordes con tu horizonte y capacidad de ahorro.',
      'Entiende aportaciones, disponibilidad, costos y posibles beneficios fiscales de cada alternativa.',
    ]);
    await expect(section.locator('.benefit__index')).toHaveCount(0);
    await expect(section.locator('.svc-card')).toHaveCount(5);
    await expect(section).not.toContainText(/sin restricciones|garantiza|no se devalúa/i);
  });

  test('identidad junto al video: logo y cargo actualizados', async ({ page }) => {
    await open(page, '/');
    const identity = page.locator('#video .video-intro__identity');
    await expect(identity).toContainText('Luis Bustamante');
    await expect(identity).toContainText('Asesor financiero y agente de seguros');
    await expect(identity.locator('img')).toHaveAttribute('src', '/brand/isotipo.png');
  });
});

test.describe('header y navegación', () => {
  test('cambia de superficie al avanzar sin cambiar de altura', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await open(page, '/');
    const header = page.locator('.site-header');
    const bar = page.locator('.site-header__bar');
    const h1 = (await bar.boundingBox()).height;
    await expect(header).not.toHaveClass(/is-scrolled/);
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveClass(/is-scrolled/);
    await page.waitForTimeout(400);
    expect((await bar.boundingBox()).height).toBe(h1);
  });

  test('las anclas dejan el título debajo del header', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await open(page, '/');
    for (const [label, id] of [['Simulador', 'sim-title'], ['Asesoría', 'lead-title'], ['FAQ', 'faq-title'], ['Sobre Luis', 'about-title']]) {
      await page.locator('.site-header__nav').getByRole('link', { name: label }).click();
      await page.waitForTimeout(1200);
      const headerBottom = (await page.locator('.site-header__bar').boundingBox()).y + (await page.locator('.site-header__bar').boundingBox()).height;
      const title = await page.locator(`#${id}`).boundingBox();
      expect(title.y).toBeGreaterThanOrEqual(headerBottom - 1);
      expect(title.y).toBeLessThan(768);
    }
  });

  test('menú móvil accesible: foco, Escape, cierre al navegar e inert', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await open(page, '/');
    const toggle = page.locator('.site-header__toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-menu a').first()).toBeFocused();
    expect(await page.evaluate(() => document.getElementById('main').inert)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.getElementById('main').inert)).toBe(false);

    await toggle.click();
    await page.locator('#mobile-menu').getByRole('link', { name: /FAQ/ }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.waitForTimeout(1300);
    const faqTitle = await page.locator('#faq-title').boundingBox();
    expect(faqTitle.y).toBeGreaterThan(0);
    expect(faqTitle.y).toBeLessThan(667);
    await expect(page.locator('#faq-title')).toBeFocused();
  });

  test('foco visible por teclado en el primer recorrido', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await open(page, '/');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    // El enlace entra con una transición corta: esperar a que termine antes de medir.
    await expect.poll(async () => (await skip.boundingBox()).y).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    expect(outline).not.toBe('none');
  });
});

test.describe('simulador', () => {
  // FV de una aportación mensual al final de cada mes, con tasa anual efectiva convertida a mensual.
  const fvText = (contribution, months, annual) => {
    const i = Math.pow(1 + annual / 100, 1 / 12) - 1;
    const fv = annual === 0 ? contribution * months : contribution * ((Math.pow(1 + i, months) - 1) / i);
    return `$${Math.round(fv).toLocaleString('en-US')}`;
  };

  test('título, textos y tasa inicial ilustrativa de 10 %; con 0 % el escenario iguala las aportaciones', async ({ page }) => {
    await open(page, '/');
    await expect(page.locator('#sim-title')).toHaveText('El costo de esperar');
    await expect(page.getByText('Descubre cómo el tiempo influye en el ahorro que puedes construir para tu futuro.')).toBeVisible();
    await expect(page.locator('label[for="sim-rate-range"]')).toHaveText('Tasa anual ilustrativa');
    await expect(page.getByText('Tasa anual sugerida para esta simulación: de 10 a 12 %')).toBeVisible();
    await expect(page.locator('.sim-assumptions')).toContainText('supuesto ilustrativo indicado por Luis');
    await expect(page.locator('.sim-assumptions')).toContainText('no representa una tasa contratada ni un rendimiento garantizado');
    await expect(page.locator('#sim-rate-input')).toHaveValue('10');
    await expect(page.locator('#sim-contribution-input')).toHaveValue('3,000');

    const figures = page.locator('.sim-figure dd');
    await expect(figures.nth(0)).toHaveText('$540,000');
    await expect(figures.nth(1)).toHaveText(fvText(3000, 180, 10));

    const rate = page.locator('#sim-rate-input');
    await rate.fill('0');
    await rate.press('Enter');
    await expect(page.locator('#sim-rate-range')).toHaveValue('0');
    await expect(figures.nth(1)).toHaveText('$540,000');
    await expect(page.getByText('Con una tasa de 0 %, el escenario ilustrativo es igual a tus aportaciones.')).toBeVisible();
  });

  test('aportación mínima de $2,000: avisa al escribir, corrige al confirmar y se aplica al cálculo', async ({ page }) => {
    await open(page, '/');
    const amount = page.locator('#sim-contribution-input');
    const range = page.locator('#sim-contribution-range');
    const note = page.locator('[data-field="sim-contribution"] .range-field__note');
    const figures = page.locator('.sim-figure dd');
    await expect(range).toHaveAttribute('min', '2000');
    await expect(page.getByText('Aportación mínima: $2,000 MXN al mes.')).toBeVisible();

    // Mientras escribe: aviso, sin corregir cada pulsación ni recalcular con un valor inválido.
    await amount.fill('1500');
    await expect(note).toHaveText('La aportación mínima es de $2,000 MXN mensuales.');
    await expect(amount).toHaveValue('1500');
    await expect(figures.nth(0)).toHaveText('$540,000');

    // Al confirmar (blur): se corrige al mínimo y el cálculo usa $2,000.
    await amount.press('Tab');
    await expect(amount).toHaveValue('2,000');
    await expect(range).toHaveValue('2000');
    await expect(note).toContainText('Se ajustó a $2,000');
    await expect(figures.nth(0)).toHaveText('$360,000');
    await expect(figures.nth(1)).toHaveText(fvText(2000, 180, 10));

    // Con Enter también se corrige; un valor válido no muestra aviso.
    await amount.fill('0');
    await amount.press('Enter');
    await expect(amount).toHaveValue('2,000');
    await amount.fill('2750');
    await expect(note).toHaveText('');
    await amount.press('Enter');
    await expect(figures.nth(0)).toHaveText('$495,000');

    // El slider no baja del mínimo.
    await range.focus();
    await page.keyboard.press('Home');
    await expect(range).toHaveValue('2000');
  });

  test('los cambios recalculan cifras y gráfico', async ({ page }) => {
    await open(page, '/');
    const figures = page.locator('.sim-figure dd');
    const lastBar = page.locator('.sim-chart__bar-scenario').last();
    const before = await lastBar.getAttribute('height');
    const rate = page.locator('#sim-rate-input');
    await rate.fill('6');
    await rate.press('Enter');
    await page.waitForTimeout(400);
    // FV de 3,000 mensuales por 180 meses al 6 % efectivo anual, aportación vencida.
    const i = Math.pow(1.06, 1 / 12) - 1;
    const fv = 3000 * ((Math.pow(1 + i, 180) - 1) / i);
    const expected = `$${Math.round(fv).toLocaleString('en-US')}`;
    await expect(figures.nth(1)).toHaveText(expected);
    await expect(figures.nth(0)).toHaveText('$540,000');
    expect(await lastBar.getAttribute('height')).not.toBe(before);
  });

  test('gráfica de barras con eje desde cero, leyenda y valores accesibles', async ({ page }) => {
    await open(page, '/');
    const chart = page.locator('.sim-chart');
    await expect(chart.locator('.sim-chart__bar-contrib')).toHaveCount(8);
    await expect(chart.locator('.sim-chart__bar-scenario')).toHaveCount(8);
    await expect(chart.locator('.sim-chart__line-scenario')).toHaveCount(0);
    await expect(chart.locator('.sim-chart__ylabel').last()).toHaveText('$0');
    await expect(chart.locator('.sim-chart__legend li')).toHaveText(['Aportaciones acumuladas', 'Escenario ilustrativo']);
    // Todas las barras parten de la misma base (eje en cero, sin escala truncada).
    const bottoms = await chart.locator('rect').evaluateAll((rs) => [...new Set(rs.map((r) => Math.round(Number(r.getAttribute('y')) + Number(r.getAttribute('height')))))]);
    expect(bottoms).toHaveLength(1);
    const table = chart.locator('table');
    await expect(table.locator('tbody tr')).toHaveCount(8);
    await expect(table.locator('tbody tr').last()).toContainText('$540,000');
    // "Cómo se calcula" ya no es un párrafo visible: queda dentro de "Ver supuestos".
    await expect(page.locator('.sim__controls')).not.toContainText('Cómo se calcula');
    await expect(page.getByText(/^Cómo se calcula/)).toBeHidden();
  });

  test('costo de esperar: comparación dinámica, plazo corto, 0 % y mínimo de aportación', async ({ page }) => {
    await open(page, '/');
    const wait = page.locator('.sim-wait');
    const money = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
    const fv = (c, m, r) => { const i = Math.pow(1 + r / 100, 1 / 12) - 1; return r === 0 ? c * m : c * ((Math.pow(1 + i, m) - 1) / i); };
    await expect(wait.locator('.sim-wait__hook')).toHaveText('Esperar también tiene un costo');
    await expect(wait.locator('.sim-wait__result')).toHaveText(`Si empiezas 5 años después, podrías acumular ${money(fv(3000, 180, 10) - fv(3000, 120, 10))} menos al final de este plazo.`);
    await expect(wait.locator('.sim-wait__compare')).toContainText(`Empezando hoy${money(fv(3000, 180, 10))}`);
    await expect(wait.locator('.sim-wait__compare')).toContainText(`Empezando en 5 años${money(fv(3000, 120, 10))}`);
    await expect(wait).toContainText('Comparación ilustrativa, no garantizada. No incluye inflación, impuestos ni comisiones.');
    await expect(wait).not.toContainText(/perdid|penaliz|ganancia garantizada/i);

    const rate = page.locator('#sim-rate-input');
    await rate.fill('0');
    await rate.press('Enter');
    await expect(wait.locator('.sim-wait__result strong')).toHaveText('$180,000');

    const amount = page.locator('#sim-contribution-input');
    await amount.fill('1500');
    await amount.press('Enter');
    await expect(wait.locator('.sim-wait__result strong')).toHaveText('$120,000');

    const years = page.locator('#sim-years-input');
    await years.fill('5');
    await years.press('Enter');
    await expect(wait.locator('.sim-wait__result')).toHaveText('Para comparar empezar hoy con empezar 5 años después, elige un plazo mayor a 5 años.');
    await expect(wait.locator('.sim-wait__compare')).toHaveCount(0);

    // Supuestos en un desplegable accesible.
    const details = wait.locator('details');
    await expect(details.locator('summary')).toHaveText('Ver supuestos');
    await details.locator('summary').click();
    await expect(details).toContainText('aportación al final de cada mes');
    await expect(details).toContainText('de 10 a 12 %');
  });

  test('plazos límite y teclado en los sliders', async ({ page }) => {
    await open(page, '/');
    const amount = page.locator('#sim-contribution-input');

    const years = page.locator('#sim-years-range');
    await years.focus();
    await page.keyboard.press('End');
    await expect(years).toHaveValue('40');
    await page.keyboard.press('Home');
    await expect(years).toHaveValue('1');
    await expect(years).toHaveAttribute('aria-valuetext', '1 año');

    // Valor fuera de rango en el campo exacto: se ajusta al máximo permitido.
    await amount.fill('999999');
    await amount.press('Enter');
    await expect(page.locator('#sim-contribution-range')).toHaveValue('50000');
  });
});

test.describe('FAQ', () => {
  test('acordeón con estado accesible y contenido oculto al cerrar', async ({ page }) => {
    await open(page, '/');
    const button = page.getByRole('button', { name: '¿La asesoría tiene algún costo?' });
    const panel = page.locator('#faq-panel-costo');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).not.toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('La cotización y la asesoría son gratuitas.');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });
  test('todo el contenido visible sin animaciones', async ({ page }) => {
    await open(page, '/');
    await page.waitForTimeout(300);
    expect(await page.locator('.is-pending').count()).toBe(0);
    const opacity = await page.locator('.hero__title .hero__line-inner').first().evaluate((el) => getComputedStyle(el).transform);
    expect(opacity === 'none' || opacity === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    await page.locator('#faq').scrollIntoViewIfNeeded();
    await expect(page.locator('#faq-title')).toBeVisible();
  });

  test('los testimonios están visibles sin animación', async ({ page }) => {
    await open(page, '/');
    await page.locator('#testimonios').scrollIntoViewIfNeeded();
    const opacities = await page.$$eval('#testimonios li.quote', (els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities).toEqual(['1', '1', '1']);
  });

  test('la pregunta de interés del formulario aparece sin animación', async ({ page }) => {
    await open(page, '/#asesoria');
    await page.locator('label.choice__option').filter({ hasText: /^Un seguro$/ }).click();
    const fieldset = page.locator('.interest__fieldset');
    await expect(fieldset).toBeVisible();
    const motion = await fieldset.evaluate((el) => ({
      animation: getComputedStyle(el).animationName,
      transition: getComputedStyle(el.closest('.interest')).transitionDuration,
      height: el.closest('.interest').getBoundingClientRect().height,
      inner: el.getBoundingClientRect().height,
    }));
    expect(motion.animation).toBe('none');
    expect(parseFloat(motion.transition)).toBeLessThan(0.01);
    expect(motion.height).toBeGreaterThanOrEqual(motion.inner);
  });
});

test.describe('seguridad del frontend', () => {
  test('sin violaciones de CSP ni errores de consola en landing y aviso', async ({ page }) => {
    const problems = [];
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
    page.on('pageerror', (e) => problems.push(e.message));
    for (const path of ['/', '/aviso-de-privacidad']) {
      const res = await open(page, path);
      expect(res.headers()['content-security-policy']).toContain("script-src 'self'");
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => window.__csp)).toEqual([]);
    }
    expect(problems).toEqual([]);
  });

  test('el bundle del navegador no contiene credenciales ni variables privadas', async ({ page, request }) => {
    await open(page, '/');
    const scripts = await page.$$eval('script[src]', (s) => s.map((el) => el.getAttribute('src')));
    const modules = await page.$$eval('link[rel="modulepreload"]', (s) => s.map((el) => el.getAttribute('href')));
    for (const src of [...scripts, ...modules]) {
      const js = await (await request.get(src)).text();
      expect(js).not.toMatch(/TWILIO_|UPSTASH|LEAD_HASH_SECRET|LEAD_NOTIFICATION_TO|api\.twilio\.com|KV_REST_API/);
    }
  });
});
