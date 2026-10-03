// Mediciones de carga y fluidez en Chromium headless con CPU y red limitadas (CDP).
// Son indicativas: la emulación NO sustituye una prueba en un teléfono físico.
// Uso: node scripts/qa/perf.mjs [baseUrl]     (por defecto http://127.0.0.1:4173)
// Usa la GPU real del equipo; QA_SOFTWARE=1 fuerza el render por software (SwiftShader),
// que exagera el costo de raster y produce picos que no representan un dispositivo real.
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const CPU = Number(process.env.QA_CPU || 4);
const profiles = [
  { name: 'móvil 390×844 · CPU ×' + CPU + ' · red 4G lenta', vp: { width: 390, height: 844 }, mobile: true, network: { latency: 150, down: 1.6, up: 0.75 } },
  { name: 'escritorio 1366×768 · CPU ×' + CPU + ' · red 4G', vp: { width: 1366, height: 768 }, mobile: false, network: { latency: 60, down: 9, up: 3 } },
];

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const gpuArgs = ['--enable-gpu', '--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args: process.env.QA_SOFTWARE ? [] : gpuArgs });
const probe = await browser.newPage();
const renderer = await probe.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'desconocido';
});
await probe.close();
console.log('Renderizador: ' + renderer);
for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.vp, isMobile: profile.mobile, hasTouch: profile.mobile, deviceScaleFactor: profile.mobile ? 2 : 1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.network.latency,
    downloadThroughput: (profile.network.down * 1024 * 1024) / 8,
    uploadThroughput: (profile.network.up * 1024 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longTasks: [], shifts: [] };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) {
          window.__perf.cls += e.value;
          window.__perf.shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: e.sources?.map((s) => s.node?.className || s.node?.nodeName).join('|') });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.longTasks.push({ t: Math.round(e.startTime), d: Math.round(e.duration) });
    }).observe({ type: 'longtask', buffered: true });
  });

  const start = Date.now();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForSelector('html[data-hydrated="true"]', { state: 'attached', timeout: 60000 });
  const hydratedAt = Date.now() - start;
  await page.waitForTimeout(1500);

  const load = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
    const res = performance.getEntriesByType('resource');
    const bytes = res.reduce((sum, r) => sum + (r.transferSize || 0), 0) + (nav.transferSize || 0);
    return {
      ttfb: Math.round(nav.responseStart),
      fcp: Math.round(fcp),
      lcp: Math.round(window.__perf.lcp),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      cls: +window.__perf.cls.toFixed(4),
      shifts: window.__perf.shifts,
      longTasksLoad: window.__perf.longTasks.slice(),
      kb: Math.round(bytes / 1024),
      requests: res.length + 1,
      fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style}`),
    };
  });

  // Desplazamiento completo hacia abajo y hacia arriba registrando la duración de cada frame.
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const scroll = await page.evaluate(async () => {
    window.__perf.longTasks = [];
    const frames = [];
    let last = performance.now();
    let running = true;
    const tick = (now) => {
      frames.push(now - last);
      last = now;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const max = document.documentElement.scrollHeight - innerHeight;
    const step = async (target) => {
      const from = scrollY;
      const dist = target - from;
      const duration = Math.abs(dist) / 2.2; // ~2200 px/s, similar a un deslizamiento rápido
      const t0 = performance.now();
      await new Promise((resolve) => {
        const frame = (now) => {
          const p = Math.min(1, (now - t0) / duration);
          window.scrollTo(0, from + dist * p);
          if (p < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
    };
    await step(max);
    await new Promise((r) => setTimeout(r, 400));
    await step(0);
    running = false;
    return { frames: frames.slice(2), longTasks: window.__perf.longTasks.slice() };
  });

  const frameMs = scroll.frames;
  const over50 = frameMs.filter((f) => f > 50).length;
  const over33 = frameMs.filter((f) => f > 33.4).length;
  console.log(`\n=== ${profile.name}`);
  console.log(`Carga: TTFB ${load.ttfb} ms · FCP ${load.fcp} ms · LCP ${load.lcp} ms · DOMContentLoaded ${load.domContentLoaded} ms · hidratado ~${hydratedAt} ms (reloj del test)`);
  console.log(`Transferido: ${load.kb} KB en ${load.requests} peticiones · CLS ${load.cls}${load.shifts.length ? ' · cambios: ' + JSON.stringify(load.shifts) : ''}`);
  console.log(`Tareas largas durante la carga: ${load.longTasksLoad.length} ${load.longTasksLoad.length ? JSON.stringify(load.longTasksLoad) : ''}`);
  console.log(`Fuentes cargadas: ${load.fonts.join(', ') || 'ninguna (respaldo)'}`);
  console.log(`Scroll completo (bajada y subida): ${frameMs.length} frames · mediana ${percentile(frameMs, 50).toFixed(1)} ms · p95 ${percentile(frameMs, 95).toFixed(1)} ms · máx ${Math.max(...frameMs).toFixed(1)} ms · frames >33 ms: ${over33} · >50 ms: ${over50}`);
  console.log(`Tareas largas durante el scroll: ${scroll.longTasks.length} ${scroll.longTasks.length ? JSON.stringify(scroll.longTasks) : ''}`);
  await context.close();
}
await browser.close();
