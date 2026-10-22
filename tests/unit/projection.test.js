import { describe, expect, it } from 'vitest';
import {
  SIM_LIMITS,
  futureValue,
  monthlyRate,
  niceMax,
  normalizeContribution,
  project,
  valuesAtYear,
  waitingCost,
} from '../../src/components/Simulator/projection.js';

describe('simulador: convención de cálculo', () => {
  it('con tasa 0 el saldo es exactamente aportación × meses', () => {
    for (const [contribution, years] of [
      [3000, 15],
      [2000, 1],
      [50000, 40],
      [2345, 7],
    ]) {
      const result = project({ contribution, years, rate: 0 });
      expect(result.scenario).toBe(contribution * years * 12);
      expect(result.contributed).toBe(contribution * years * 12);
      expect(result.difference).toBe(0);
    }
  });

  it('valores iniciales: aportación de $3,000, tasa ilustrativa de 10 % (editable hasta 0 %)', () => {
    expect(SIM_LIMITS.contribution.initial).toBe(3000);
    expect(SIM_LIMITS.rate.initial).toBe(10);
    expect(SIM_LIMITS.rate.min).toBe(0);
  });

  it('la aportación mínima de $2,000 se aplica también al cálculo', () => {
    expect(SIM_LIMITS.contribution.min).toBe(2000);
    expect(normalizeContribution(500)).toBe(2000);
    expect(normalizeContribution(1999)).toBe(2000);
    expect(normalizeContribution(2000)).toBe(2000);
    expect(normalizeContribution(2750)).toBe(2750);
    expect(normalizeContribution(999999)).toBe(SIM_LIMITS.contribution.max);
    expect(normalizeContribution(Number.NaN)).toBe(2000);
    const below = project({ contribution: 1000, years: 10, rate: 10 });
    const atMin = project({ contribution: 2000, years: 10, rate: 10 });
    expect(below.contributed).toBe(2000 * 120);
    expect(below.scenario).toBe(atMin.scenario);
    expect(valuesAtYear({ contribution: 0, rate: 10 }, 10).contributed).toBe(2000 * 120);
  });

  it('convierte la tasa anual efectiva a mensual: (1 + r)^(1/12) − 1', () => {
    expect(monthlyRate(0)).toBe(0);
    const i = monthlyRate(12);
    expect(Math.pow(1 + i, 12)).toBeCloseTo(1.12, 12);
  });

  it('aportaciones al final de cada mes (anualidad vencida), sin aportación inicial', () => {
    // 1 mes: una sola aportación, sin intereses todavía.
    expect(futureValue(1000, 1, monthlyRate(10))).toBeCloseTo(1000, 10);
    // 2 meses: la primera aportación genera un mes de rendimiento.
    const i = monthlyRate(10);
    expect(futureValue(1000, 2, i)).toBeCloseTo(1000 * (1 + i) + 1000, 8);
    // 12 meses al 6 % anual efectivo.
    const i6 = monthlyRate(6);
    const expected = 2000 * ((Math.pow(1 + i6, 12) - 1) / i6);
    expect(project({ contribution: 2000, years: 1, rate: 6 }).scenario).toBeCloseTo(expected, 8);
  });

  it('futureValue con aportación cero produce cero; el punto inicial del gráfico es 0', () => {
    expect(futureValue(0, 240, monthlyRate(8))).toBe(0);
    const result = project({ contribution: 3000, years: 20, rate: 8 });
    expect(result.points[0]).toEqual({ month: 0, contributed: 0, scenario: 0 });
  });

  it('plazos límite (1 y 40 años) y tasa máxima no producen valores inválidos', () => {
    const min = project({ contribution: SIM_LIMITS.contribution.max, years: SIM_LIMITS.years.min, rate: 12 });
    const max = project({ contribution: SIM_LIMITS.contribution.max, years: SIM_LIMITS.years.max, rate: 12 });
    for (const r of [min, max]) {
      expect(Number.isFinite(r.scenario)).toBe(true);
      expect(r.scenario).toBeGreaterThanOrEqual(r.contributed);
    }
    expect(max.months).toBe(480);
  });

  it('el gráfico y las cifras salen del mismo cálculo (último punto = totales)', () => {
    const result = project({ contribution: 3000, years: 15, rate: 5.5 });
    const last = result.points[result.points.length - 1];
    expect(last.month).toBe(result.months);
    expect(last.contributed).toBe(result.contributed);
    expect(last.scenario).toBe(result.scenario);
    expect(valuesAtYear({ contribution: 3000, rate: 5.5 }, 15).scenario).toBeCloseTo(result.scenario, 8);
  });

  it('costo de esperar: misma aportación, tasa y fecha final; quien espera aporta 5 años menos', () => {
    const r = waitingCost({ contribution: 3000, years: 15, rate: 10 });
    const i = monthlyRate(10);
    expect(r.today).toBeCloseTo(futureValue(3000, 180, i), 6);
    expect(r.later).toBeCloseTo(futureValue(3000, 120, i), 6);
    expect(r.difference).toBeCloseTo(r.today - r.later, 6);
    expect(r.today).toBeCloseTo(project({ contribution: 3000, years: 15, rate: 10 }).scenario, 6);
  });

  it('costo de esperar con 0 %: solo las aportaciones que no se hicieron', () => {
    const r = waitingCost({ contribution: 3000, years: 20, rate: 0 });
    expect(r).toEqual({ today: 3000 * 240, later: 3000 * 180, difference: 3000 * 60 });
  });

  it('costo de esperar respeta el mínimo de aportación y cambia con el plazo', () => {
    expect(waitingCost({ contribution: 500, years: 10, rate: 0 }).difference).toBe(2000 * 60);
    const a = waitingCost({ contribution: 3000, years: 10, rate: 10 }).difference;
    const b = waitingCost({ contribution: 3000, years: 25, rate: 10 }).difference;
    expect(b).toBeGreaterThan(a);
  });

  it('costo de esperar: con plazo de 5 años o menos no hay comparación', () => {
    expect(waitingCost({ contribution: 3000, years: 5, rate: 10 })).toBeNull();
    expect(waitingCost({ contribution: 3000, years: 1, rate: 10 })).toBeNull();
    expect(waitingCost({ contribution: 3000, years: 6, rate: 10 }).later).toBeCloseTo(futureValue(3000, 12, monthlyRate(10)), 6);
  });

  it('niceMax redondea hacia arriba y nunca devuelve 0', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(540000)).toBeGreaterThanOrEqual(540000);
    expect(niceMax(540000)).toBe(600000);
  });
});
