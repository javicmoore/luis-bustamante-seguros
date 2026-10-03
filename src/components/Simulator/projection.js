// Simulación educativa de ahorro. Convención mostrada al visitante:
//  - Aportación al final de cada mes (anualidad vencida), sin aportación inicial.
//  - Tasa anual EFECTIVA convertida a mensual: i = (1 + r)^(1/12) − 1.
//  - Con r = 0, el saldo es exactamente aportación × meses.
// Las cifras y el gráfico salen de esta misma función.

export const SIM_LIMITS = Object.freeze({
  contribution: { min: 0, max: 50000, step: 250, initial: 3000 },
  years: { min: 1, max: 40, step: 1, initial: 15 },
  rate: { min: 0, max: 12, step: 0.5, initial: 0 },
});

export function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function monthlyRate(annualPercent) {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

export function futureValue(monthlyContribution, months, rate) {
  if (months <= 0 || monthlyContribution <= 0) return 0;
  if (rate === 0) return monthlyContribution * months;
  return monthlyContribution * ((Math.pow(1 + rate, months) - 1) / rate);
}

/**
 * @param {{ contribution: number, years: number, rate: number, samples?: number }} input
 *   rate en porcentaje anual efectivo (p. ej. 5 = 5 %).
 */
export function project({ contribution, years, rate, samples = 40 }) {
  const months = Math.round(years * 12);
  const i = monthlyRate(rate);
  const points = [];
  for (let s = 0; s <= samples; s += 1) {
    const month = Math.round((s / samples) * months);
    points.push({
      month,
      contributed: contribution * month,
      scenario: futureValue(contribution, month, i),
    });
  }
  const contributed = contribution * months;
  const scenario = futureValue(contribution, months, i);
  return {
    months,
    monthlyRate: i,
    contributed,
    scenario,
    difference: scenario - contributed,
    points,
  };
}

/** Valores al cierre de un año concreto (para la lectura del gráfico). */
export function valuesAtYear({ contribution, rate }, year) {
  const months = Math.round(year * 12);
  return {
    contributed: contribution * months,
    scenario: futureValue(contribution, months, monthlyRate(rate)),
  };
}

/** Máximo "redondo" para el eje vertical (1, 2, 2.5, 5 × 10^k). */
export function niceMax(value) {
  if (!(value > 0)) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * base >= value) return step * base;
  }
  return 10 * base;
}
