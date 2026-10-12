/**
 * Fondo del hero: gráficos financieros discretos inspirados en el isotipo del logo (barras y
 * línea ascendente con flecha). Decorativo (aria-hidden), en SVG para que pese poco.
 * Movimiento suave: la línea se dibuja una vez, las barras suben al cargar y el conjunto
 * flota lentamente (solo transform/opacity). Con movimiento reducido queda estático.
 */
export function HeroGraphics() {
  const bars = [
    { x: 760, h: 150 },
    { x: 850, h: 210 },
    { x: 940, h: 180 },
    { x: 1030, h: 270 },
    { x: 1120, h: 240 },
    { x: 1210, h: 330 },
    { x: 1300, h: 300 },
  ];
  // El primer tramo pasa por debajo del bloque de texto para no cruzar título, botones ni notas.
  const points = [
    [60, 880],
    [300, 800],
    [470, 840],
    [700, 690],
    [860, 600],
    [1080, 380],
    [1230, 430],
    [1390, 230],
  ];
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

  return (
    <svg className="hero-graphics" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g className="hero-graphics__grid">
        {[180, 300, 420, 540, 660, 780].map((y) => (
          <line key={y} x1="0" x2="1440" y1={y} y2={y} />
        ))}
      </g>
      <g className="hero-graphics__float">
        <g className="hero-graphics__bars">
          {bars.map((bar, i) => (
            <rect
              key={bar.x}
              className="hero-graphics__bar"
              data-i={i}
              x={bar.x}
              y={900 - bar.h}
              width="54"
              height={bar.h}
              rx="4"
            />
          ))}
        </g>
        <path className="hero-graphics__shadow-line" d={line} transform="translate(0 26)" />
        <path className="hero-graphics__line" d={line} pathLength="1000" />
        <path className="hero-graphics__arrow" d="M1390 230 L1336 236 L1384 284 Z" />
        <g className="hero-graphics__dots">
          {points.slice(1, -1).map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="5" />
          ))}
        </g>
      </g>
    </svg>
  );
}
