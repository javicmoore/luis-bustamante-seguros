const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const integer = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const compact = new Intl.NumberFormat('es-MX', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatMoney = (value) => currency.format(Math.round(value));
export const formatInteger = (value) => integer.format(Math.round(value));
export const formatCompactMoney = (value) => (value === 0 ? '$0' : `$${compact.format(value)}`);

export function formatRate(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('es-MX', { maximumFractionDigits: 1 })} %`;
}
