import { describe, expect, it } from 'vitest';
import {
  SIM_LIMITS,
  futureValue,
  monthlyRate,
  niceMax,
  project,
  valuesAtYear,
} from '../../src/components/Simulator/projection.js';

describe('simulador: convención de cálculo', () => {
  it('con tasa 0 el saldo es exactamente aportación × meses', () => {
    for (const [contribution, years] of [
      [3000, 15],
      [250, 1],
      [50000, 40],
      [1234, 7],
    ]) {
      const result = project({ contribution, years, rate: 0 });
      expect(result.scenario).toBe(contribution * years * 12);
      expect(result.contributed).toBe(contribution * years * 12);
      expect(result.difference).toBe(0);
    }
  });

  it('la tasa inicial del simulador es 0 %', () => {
    expect(SIM_LIMITS.rate.initial).toBe(0);
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
    const expected = 1000 * ((Math.pow(1 + i6, 12) - 1) / i6);
    expect(project({ contribution: 1000, years: 1, rate: 6 }).scenario).toBeCloseTo(expected, 8);
  });

  it('aportación cero produce cero en todos los puntos', () => {
    const result = project({ contribution: 0, years: 20, rate: 8 });
    expect(result.contributed).toBe(0);
    expect(result.scenario).toBe(0);
    expect(result.points.every((p) => p.contributed === 0 && p.scenario === 0)).toBe(true);
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

  it('niceMax redondea hacia arriba y nunca devuelve 0', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(540000)).toBeGreaterThanOrEqual(540000);
    expect(niceMax(540000)).toBe(600000);
  });
});
