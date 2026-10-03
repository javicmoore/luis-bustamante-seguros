// Fixtures SOLO para desarrollo: piezas neutras con distintas proporciones para verificar
// altura equilibrada, espaciado y continuidad del loop. No representan marcas reales.
export const DEV_FIXTURES = [
  { id: 'demo-1', name: 'Logo de prueba 1', fixture: true, w: 150, h: 40 },
  { id: 'demo-2', name: 'Logo de prueba 2', fixture: true, w: 64, h: 56 },
  { id: 'demo-3', name: 'Logo de prueba 3', fixture: true, w: 128, h: 40 },
  { id: 'demo-4', name: 'Logo de prueba 4', fixture: true, w: 170, h: 34 },
  { id: 'demo-5', name: 'Logo de prueba 5', fixture: true, w: 96, h: 48 },
  { id: 'demo-6', name: 'Logo de prueba 6', fixture: true, w: 140, h: 44 },
];

export function FixtureLogo({ brand, box }) {
  const { w, h } = brand;
  return (
    <svg
      className="brands__logo brands__logo--fixture"
      viewBox={`0 0 ${w} ${h}`}
      width={box.width}
      height={box.height}
      role="img"
      aria-label={brand.name}
    >
      <rect x="1" y="1" width={w - 2} height={h - 2} rx="6" fill="#f5f7f9" stroke="#9fb3c8" strokeDasharray="4 3" />
      <text
        x={w / 2}
        y={h / 2 + 4}
        textAnchor="middle"
        fontFamily="Manrope, Arial, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill="#486581"
      >
        {`DEMO ${brand.id.split('-')[1]}`}
      </text>
    </svg>
  );
}
