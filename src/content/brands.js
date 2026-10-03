// Carrusel de marcas "Marcas con las que trabajo".
// Logos entregados por Javier en assets-originales/logos-marcas (originales sin modificar).
// Las copias web de public/brands/ se generan con: npm run logos
// (solo se recorta el margen transparente; no se recolorea ni se deforma).
// Una marca aparece si: confirmed && publish && logo. No sustituir por marcas ficticias.
//
// logo: { src, width, height, scale }
//   width/height = proporción real de la copia (evita deformación y reserva espacio).
//   scale = ajuste óptico (0.7–1.5) para equilibrar el peso visual entre marcas.
export const brandsSection = {
  heading: 'Marcas con las que trabajo',
};

export const brands = [
  { id: 'allianz', name: 'Allianz', confirmed: true, publish: true, logo: { src: '/brands/allianz.svg', width: 2500, height: 642, scale: 0.9 } },
  { id: 'zurich', name: 'Zurich', confirmed: true, publish: true, logo: { src: '/brands/zurich.webp', width: 517, height: 120, scale: 0.9 } },
  { id: 'skandia', name: 'Skandia', confirmed: true, publish: true, logo: { src: '/brands/skandia.webp', width: 703, height: 120, scale: 0.8 } },
  { id: 'insignia-life', name: 'Insignia Life', confirmed: true, publish: true, logo: { src: '/brands/insignia-life.webp', width: 444, height: 120, scale: 1.1 } },
  { id: 'la-latino', name: 'La Latino Seguros', confirmed: true, publish: true, logo: { src: '/brands/la-latino.webp', width: 234, height: 120, scale: 1.35 } },
  { id: 'mapfre', name: 'MAPFRE', confirmed: true, publish: true, logo: { src: '/brands/mapfre.webp', width: 789, height: 120, scale: 1 } },
];

export function getPublishableBrands(list = brands) {
  return list.filter((brand) => brand.confirmed && brand.publish && brand.logo?.src);
}
