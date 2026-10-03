import { useEffect, useMemo, useRef, useState } from 'react';
import { simulatorCopy as copy } from '../../content/copy.js';
import { FORM_ANCHOR } from '../../content/navigation.js';
import { formatMoney, formatInteger, formatRate } from '../../lib/format.js';
import { track } from '../../lib/analytics.js';
import { goToSection } from '../../lib/scroll.js';
import { Icon } from '../ui/Icon.jsx';
import { RangeField } from './RangeField.jsx';
import { SimulatorChart } from './SimulatorChart.jsx';
import { SIM_LIMITS, project } from './projection.js';
import './Simulator.css';

const parseInteger = (text) => {
  const digits = String(text).replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
};

const parseDecimal = (text) => {
  const normalized = String(text).replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized || normalized === '.') return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
};

const money = (value, { plain } = {}) => (plain ? formatInteger(value) : formatMoney(value));
const yearsText = (value, { plain } = {}) => (plain ? String(value) : `${value} ${value === 1 ? 'año' : 'años'}`);
const rateText = (value, { plain } = {}) =>
  plain ? (Math.round(value * 10) / 10).toLocaleString('es-MX', { maximumFractionDigits: 1 }) : formatRate(value);

function Figure({ label, value, tone }) {
  return (
    <div className={`sim-figure sim-figure--${tone}`}>
      <dt>
        <span className="sim-figure__swatch" aria-hidden="true" />
        {label}
      </dt>
      <dd>
        <span key={Math.round(value)} className="sim-figure__value">
          {formatMoney(value)}
        </span>
      </dd>
    </div>
  );
}

export function Simulator() {
  const [contribution, setContribution] = useState(SIM_LIMITS.contribution.initial);
  const [years, setYears] = useState(SIM_LIMITS.years.initial);
  const [rate, setRate] = useState(SIM_LIMITS.rate.initial);
  const [announcement, setAnnouncement] = useState('');
  const interacted = useRef(false);

  const result = useMemo(() => project({ contribution, years, rate }), [contribution, years, rate]);

  const changeWith = (setter, control) => (value) => {
    setter(value);
    if (!interacted.current) {
      interacted.current = true;
      track('simulator_interaction', { control });
    }
  };

  // Resumen para lectores de pantalla cuando el visitante deja de mover los controles.
  useEffect(() => {
    if (!interacted.current) return undefined;
    const timer = setTimeout(() => {
      setAnnouncement(
        `${copy.contributedLabel}: ${formatMoney(result.contributed)}. ${copy.scenarioLabel}: ${formatMoney(result.scenario)}.`,
      );
    }, 700);
    return () => clearTimeout(timer);
  }, [result]);

  const zeroRate = rate === 0;
  const chartLabels = {
    contributed: copy.contributedLabel,
    scenario: copy.scenarioLabel,
    ariaSummary: `Gráfico: en ${years} ${years === 1 ? 'año' : 'años'}, ${copy.contributedLabel.toLowerCase()} de ${formatMoney(result.contributed)} y ${copy.scenarioLabel.toLowerCase()} de ${formatMoney(result.scenario)} con una tasa anual de ${formatRate(rate)}.`,
  };

  return (
    <section id="simulador" className="section simulator" aria-labelledby="sim-title">
      <div className="container">
        <header className="sim__head">
          <div data-reveal="">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="sim-title" className="section-title" data-section-focus="">
              {copy.title}
            </h2>
          </div>
          <p className="lead sim__intro" data-reveal="" data-reveal-delay="1">
            {copy.intro}
          </p>
        </header>

        <div className="sim__instrument" data-reveal="" data-reveal-delay="1">
          <div className="sim__controls" role="group" aria-label="Supuestos de la simulación">
            <RangeField
              id="sim-contribution"
              label={copy.contributionLabel}
              value={contribution}
              {...SIM_LIMITS.contribution}
              onChange={changeWith(setContribution, 'contribution')}
              formatValue={money}
              valueText={(v) => `${formatMoney(v)} al mes`}
              parseDraft={parseInteger}
              prefix="$"
              inputLabel="Aportación mensual en pesos, valor exacto"
            />
            <RangeField
              id="sim-years"
              label={copy.yearsLabel}
              value={years}
              {...SIM_LIMITS.years}
              onChange={changeWith(setYears, 'years')}
              formatValue={yearsText}
              valueText={(v) => yearsText(v)}
              parseDraft={parseInteger}
              suffix={years === 1 ? 'año' : 'años'}
              inputLabel="Plazo en años, valor exacto"
            />
            <RangeField
              id="sim-rate"
              label={copy.rateLabel}
              value={rate}
              {...SIM_LIMITS.rate}
              onChange={changeWith(setRate, 'rate')}
              formatValue={rateText}
              valueText={(v) => `${formatRate(v)} anual ilustrativa`}
              parseDraft={parseDecimal}
              inputMode="decimal"
              suffix="%"
              help={copy.rateHelp}
              inputLabel="Tasa anual ilustrativa en porcentaje, valor exacto"
            />
            <p className="sim__method">{copy.method}</p>
          </div>

          <div className="sim__results on-dark">
            <dl className="sim__figures">
              <Figure label={copy.contributedLabel} value={result.contributed} tone="contrib" />
              <Figure label={copy.scenarioLabel} value={result.scenario} tone="scenario" />
            </dl>
            <p className="sim__difference">
              {zeroRate ? (
                copy.zeroRateNote
              ) : (
                <>
                  {copy.differenceLabel}:{' '}
                  <strong>
                    {result.difference >= 0 ? '+' : '−'}
                    {formatMoney(Math.abs(result.difference))}
                  </strong>{' '}
                  en {years} {years === 1 ? 'año' : 'años'} con {formatRate(rate)} anual.
                </>
              )}
            </p>

            <SimulatorChart projection={result} inputs={{ contribution, rate }} labels={chartLabels} />

            <p className="sim__disclaimer">
              <Icon name="alert" />
              <span>{copy.disclaimer}</span>
            </p>
            <a
              className="btn btn--gold sim__cta"
              href={`#${FORM_ANCHOR}`}
              onClick={(event) => {
                event.preventDefault();
                goToSection(FORM_ANCHOR);
              }}
            >
              {copy.cta}
              <Icon name="arrowRight" className="btn__icon btn__icon--move" />
            </a>
          </div>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  );
}
