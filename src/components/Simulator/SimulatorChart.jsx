import { useEffect, useRef, useState } from 'react';
import { formatCompactMoney, formatMoney } from '../../lib/format.js';
import { niceMax, valuesAtYear } from './projection.js';

const HEIGHT = 230;
// Margen izquierdo reservado para las etiquetas del eje (no se superponen a las barras).
const PAD = { top: 16, right: 8, bottom: 30, left: 46 };
const DEFAULT_WIDTH = 560;
const MAX_GROUPS = 8;

/** Años representados: hasta 8 grupos repartidos en el plazo, siempre con el último año. */
export function chartYears(years) {
  const groups = Math.min(years, MAX_GROUPS);
  const list = [];
  for (let k = 1; k <= groups; k += 1) list.push(Math.round((k * years) / groups));
  return [...new Set(list)];
}

/**
 * Barras comparables por año: aportaciones acumuladas y escenario ilustrativo. El eje vertical
 * empieza en 0 y usa una escala "redonda" sin truncar. Los valores exactos están en una tabla
 * para lectores de pantalla y en la lectura al pasar el cursor.
 */
export function SimulatorChart({ inputs, years, labels }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(240, Math.round(entry.contentRect.width));
      setWidth((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rows = chartYears(years).map((year) => ({ year, ...valuesAtYear(inputs, year) }));
  const last = rows[rows.length - 1];
  const maxY = niceMax(Math.max(last.scenario, last.contributed));
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const base = PAD.top + innerH;
  const slot = innerW / rows.length;
  const barW = Math.max(4, Math.min(26, slot * 0.32));
  const gap = Math.max(2, barW * 0.18);
  const h = (v) => (v > 0 ? Math.max(1, (v / maxY) * innerH) : 0);
  const showEvery = width / rows.length < 46 ? 2 : 1;

  return (
    <div
      ref={wrapRef}
      className="sim-chart"
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return;
        const rect = wrapRef.current.getBoundingClientRect();
        const i = Math.floor((e.clientX - rect.left - PAD.left) / slot);
        setHover(i >= 0 && i < rows.length ? i : null);
      }}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        className="sim-chart__svg"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={labels.ariaSummary}
      >
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            className={f === 1 ? 'sim-chart__axis' : 'sim-chart__grid'}
            x1={PAD.left - 4}
            x2={width - PAD.right}
            y1={PAD.top + f * innerH}
            y2={PAD.top + f * innerH}
          />
        ))}
        {rows.map((row, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          return (
            <g key={row.year} className={`sim-chart__group${hover === i ? ' is-active' : ''}`}>
              <rect
                className="sim-chart__bar-contrib"
                x={(cx - gap / 2 - barW).toFixed(1)}
                y={(base - h(row.contributed)).toFixed(1)}
                width={barW.toFixed(1)}
                height={h(row.contributed).toFixed(1)}
                rx="2"
              />
              <rect
                className="sim-chart__bar-scenario"
                x={(cx + gap / 2).toFixed(1)}
                y={(base - h(row.scenario)).toFixed(1)}
                width={barW.toFixed(1)}
                height={h(row.scenario).toFixed(1)}
                rx="2"
              />
              {i % showEvery === showEvery - 1 || i === rows.length - 1 ? (
                <text className="sim-chart__xlabel" x={cx} y={HEIGHT - 8} textAnchor="middle">
                  {`Año ${row.year}`}
                </text>
              ) : null}
            </g>
          );
        })}
        {[1, 0.5, 0].map((f) => (
          <text
            key={f}
            className="sim-chart__ylabel"
            x={PAD.left - 10}
            y={PAD.top + (1 - f) * innerH + 4}
            textAnchor="end"
          >
            {f === 0 ? '$0' : formatCompactMoney(maxY * f)}
          </text>
        ))}
      </svg>

      {hover !== null ? (
        <div
          className={`sim-chart__tip${hover > rows.length / 2 ? ' is-left' : ''}`}
          ref={(el) => el && el.style.setProperty('--x', `${PAD.left + slot * hover + slot / 2}px`)}
          aria-hidden="true"
        >
          <strong>{`Año ${rows[hover].year}`}</strong>
          <span>
            {labels.contributed}: {formatMoney(rows[hover].contributed)}
          </span>
          <span className="is-scenario">
            {labels.scenario}: {formatMoney(rows[hover].scenario)}
          </span>
        </div>
      ) : null}

      <ul className="sim-chart__legend" aria-hidden="true">
        <li>
          <span className="sim-chart__key sim-chart__key--contrib" />
          {labels.contributed}
        </li>
        <li>
          <span className="sim-chart__key sim-chart__key--scenario" />
          {labels.scenario}
        </li>
      </ul>

      <table className="visually-hidden">
        <caption>{labels.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">Año</th>
            <th scope="col">{labels.contributed}</th>
            <th scope="col">{labels.scenario}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              <td>{formatMoney(row.contributed)}</td>
              <td>{formatMoney(row.scenario)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
