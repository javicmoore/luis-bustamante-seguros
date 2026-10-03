import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatCompactMoney, formatMoney } from '../../lib/format.js';
import { niceMax, valuesAtYear } from './projection.js';
import { prefersReducedMotion } from '../../lib/scroll.js';

const HEIGHT = 230;
const PAD = { top: 16, right: 12, bottom: 30, left: 12 };
const DEFAULT_WIDTH = 560;
const TWEEN_MS = 220;

function toPixels(points, width, maxY) {
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const last = points.length - 1;
  const x = (i) => PAD.left + (i / last) * innerW;
  const y = (v) => PAD.top + (1 - v / maxY) * innerH;
  return {
    contributed: points.map((p, i) => [x(i), y(p.contributed)]),
    scenario: points.map((p, i) => [x(i), y(p.scenario)]),
  };
}

const linePath = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`;
const baseY = HEIGHT - PAD.bottom;
const areaPath = (pts) =>
  `${linePath(pts)}L${pts[pts.length - 1][0].toFixed(1)},${baseY}L${pts[0][0].toFixed(1)},${baseY}Z`;

function lerpPoints(from, to, t) {
  return to.map(([x, y], i) => {
    const [fx, fy] = from[i] || [x, y];
    return [fx + (x - fx) * t, fy + (y - fy) * t];
  });
}

/**
 * Gráfico de aportaciones acumuladas vs. escenario ilustrativo. Los trazos se actualizan por
 * DOM durante una transición corta (las cifras ya muestran el valor real al instante).
 */
export function SimulatorChart({ projection, inputs, labels }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const wrapRef = useRef(null);
  const paths = useRef({});
  const current = useRef(null);
  const frame = useRef(0);
  const lastWidth = useRef(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [scrub, setScrub] = useState(null);

  const maxY = niceMax(Math.max(projection.scenario, projection.contributed));
  const target = useMemo(() => toPixels(projection.points, width, maxY), [projection, width, maxY]);

  // Trazos iniciales (SSR/primer render). Después se actualizan solo por DOM.
  const [initial] = useState(() => {
    const px = toPixels(projection.points, DEFAULT_WIDTH, maxY);
    return {
      cArea: areaPath(px.contributed),
      cLine: linePath(px.contributed),
      sArea: areaPath(px.scenario),
      sLine: linePath(px.scenario),
    };
  });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(260, Math.round(entry.contentRect.width));
      setWidth((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const apply = (c, s) => {
      paths.current.cArea?.setAttribute('d', areaPath(c));
      paths.current.cLine?.setAttribute('d', linePath(c));
      paths.current.sArea?.setAttribute('d', areaPath(s));
      paths.current.sLine?.setAttribute('d', linePath(s));
      current.current = { contributed: c, scenario: s };
    };
    cancelAnimationFrame(frame.current);
    const from = current.current;
    // Cambio de ancho (medición o resize): sin transición, para no deformar el gráfico.
    const resized = lastWidth.current !== null && lastWidth.current !== width;
    lastWidth.current = width;
    if (!from || resized || prefersReducedMotion()) {
      apply(target.contributed, target.scenario);
      return undefined;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / TWEEN_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      apply(lerpPoints(from.contributed, target.contributed, eased), lerpPoints(from.scenario, target.scenario, eased));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, width]);

  const years = projection.months / 12;
  const ticks = years <= 1 ? [0, years] : [0, Math.round(years / 2), years];
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const scrubAt = (clientX) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - PAD.left) / innerW));
    const year = Math.round(ratio * years);
    setScrub({ year, ...valuesAtYear(inputs, year) });
  };

  const scrubX = scrub ? PAD.left + (years ? scrub.year / years : 0) * innerW : 0;
  const yOf = (v) => PAD.top + (1 - v / maxY) * innerH;

  return (
    <div
      ref={wrapRef}
      className="sim-chart"
      onPointerMove={(e) => e.pointerType !== 'touch' && scrubAt(e.clientX)}
      onPointerDown={(e) => scrubAt(e.clientX)}
      onPointerLeave={(e) => e.pointerType !== 'touch' && setScrub(null)}
    >
      <svg
        className="sim-chart__svg"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={labels.ariaSummary}
      >
        <defs>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d3ad66" stopOpacity="0.38" />
            <stop offset="1" stopColor="#d3ad66" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            className="sim-chart__grid"
            x1={PAD.left}
            x2={width - PAD.right}
            y1={PAD.top + f * innerH}
            y2={PAD.top + f * innerH}
          />
        ))}
        <path ref={(el) => (paths.current.sArea = el)} className="sim-chart__area-scenario" d={initial.sArea} fill={`url(#${uid}-gold)`} />
        <path ref={(el) => (paths.current.cArea = el)} className="sim-chart__area-contrib" d={initial.cArea} />
        <path ref={(el) => (paths.current.cLine = el)} className="sim-chart__line-contrib" d={initial.cLine} />
        <path ref={(el) => (paths.current.sLine = el)} className="sim-chart__line-scenario" d={initial.sLine} />
        {[1, 0.5].map((f) => (
          <text key={f} className="sim-chart__ylabel" x={PAD.left + 2} y={PAD.top + (1 - f) * innerH - 6}>
            {formatCompactMoney(maxY * f)}
          </text>
        ))}
        {ticks.map((t, i) => (
          <text
            key={`${t}-${i}`}
            className="sim-chart__xlabel"
            x={PAD.left + (years ? t / years : 0) * innerW}
            y={HEIGHT - 8}
            textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}
          >
            {t === 0 ? 'Hoy' : `Año ${t}`}
          </text>
        ))}
        {scrub ? (
          <g className="sim-chart__scrub">
            <line x1={scrubX} x2={scrubX} y1={PAD.top} y2={baseY} />
            <circle className="is-contrib" cx={scrubX} cy={yOf(scrub.contributed)} r="4.5" />
            <circle className="is-scenario" cx={scrubX} cy={yOf(scrub.scenario)} r="4.5" />
          </g>
        ) : null}
      </svg>
      {scrub ? (
        <div
          className={`sim-chart__tip${scrubX > width * 0.6 ? ' is-left' : ''}`}
          ref={(el) => el && el.style.setProperty('--x', `${scrubX}px`)}
          aria-hidden="true"
        >
          <strong>{scrub.year === 0 ? 'Hoy' : `Año ${scrub.year}`}</strong>
          <span>
            {labels.contributed}: {formatMoney(scrub.contributed)}
          </span>
          <span className="is-scenario">
            {labels.scenario}: {formatMoney(scrub.scenario)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
