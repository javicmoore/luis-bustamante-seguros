import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VideoIntro } from '../../src/components/VideoIntro/VideoIntro.jsx';

const render = (config) => renderToStaticMarkup(createElement(VideoIntro, { config }));
const vertical = { src: '/media/luis-presentacion.mp4', type: 'video/mp4', width: 1080, height: 1920, poster: '/media/luis-presentacion-poster.jpg', captions: null, decision: null };

describe('Conoce a Luis (VideoIntro)', () => {
  it('con video: reproductor nativo accesible, sin reproducción automática ni sonido forzado', () => {
    const html = render(vertical);
    expect(html).toContain('id="video"');
    expect(html).toContain('Conoce a Luis');
    expect(html).toMatch(/<video[^>]*\scontrols=""/);
    expect(html).toMatch(/<video[^>]*\splaysInline=""|<video[^>]*\splaysinline=""/);
    expect(html).toMatch(/<video[^>]*\spreload="none"/);
    expect(html).toMatch(/<video[^>]*\swidth="1080"[^>]*\sheight="1920"/);
    expect(html).toMatch(/<video[^>]*\saria-label="Video de presentación de Luis Bustamante"/);
    expect(html).not.toMatch(/autoplay|muted/i);
    // Archivo y póster se asignan al acercarse a la sección: el HTML inicial no los pide.
    expect(html).not.toContain('luis-presentacion.mp4');
    expect(html).not.toContain('luis-presentacion-poster.jpg');
    expect(html).not.toContain('próximamente');
  });

  it('respeta la orientación del archivo: vertical limita el ancho, horizontal va centrado', () => {
    expect(render(vertical)).toContain('video-intro--vertical');
    expect(render({ ...vertical, width: 1920, height: 1080 })).not.toContain('video-intro--vertical');
  });

  it('sin video: foto de traje azul con "Video de presentación próximamente" y ningún control', () => {
    const html = render({ ...vertical, src: null, width: null, height: null, poster: null });
    // Vitest corre en modo desarrollo: el marcador se muestra (en demo también; en producción no).
    expect(html).toContain('Video de presentación próximamente');
    expect(html).toMatch(/<img[^>]*src="\/media\/luis-hero-720\.jpg"/);
    expect(html).toMatch(/<img[^>]*loading="lazy"/);
    expect(html).not.toMatch(/<video|<button|controls/);
    expect(html).toContain('video-intro--vertical');
  });

  it('un video incompleto (sin dimensiones reales) no se publica como reproductor', () => {
    const html = render({ ...vertical, width: null, height: null });
    expect(html).not.toContain('<video');
    expect(html).toContain('Video de presentación próximamente');
  });

  it('decisión explícita de omitir: no se publica la sección', () => {
    expect(render({ ...vertical, src: null, decision: 'omitir' })).toBe('');
  });
});
