import { useEffect, useId, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '../../lib/hooks.js';
import { clamp } from './projection.js';

/**
 * Slider con etiqueta y valor editable. El slider nativo conserva el manejo por teclado
 * (flechas, Re Pág/Av Pág, Inicio/Fin); el campo de texto acepta valores exactos.
 */
export function RangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  valueText,
  parseDraft,
  inputMode = 'numeric',
  prefix,
  suffix,
  help,
  inputLabel,
}) {
  const helpId = useId();
  const rangeRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');

  // Relleno del riel vía CSSOM (sin estilos inline en el HTML: CSP estricta).
  useIsomorphicLayoutEffect(() => {
    const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
    rangeRef.current?.style.setProperty('--fill', `${pct}%`);
  }, [value, min, max]);

  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(''), 3500);
    return () => clearTimeout(timer);
  }, [note]);

  const commitDraft = () => {
    setEditing(false);
    const parsed = parseDraft(draft);
    if (parsed === null) return;
    const bounded = clamp(parsed, min, max);
    if (bounded !== parsed) setNote(`Ajustado al rango permitido: ${formatValue(min)} a ${formatValue(max)}.`);
    onChange(bounded, 'input');
  };

  return (
    <div className="range-field" data-field={id}>
      <div className="range-field__top">
        <label className="range-field__label" htmlFor={`${id}-range`}>
          {label}
        </label>
        <div className="range-field__value">
          {prefix ? <span aria-hidden="true">{prefix}</span> : null}
          <input
            id={`${id}-input`}
            className="range-field__input"
            type="text"
            inputMode={inputMode}
            autoComplete="off"
            aria-label={inputLabel || `${label}, valor exacto`}
            aria-describedby={help ? helpId : undefined}
            value={editing ? draft : formatValue(value, { plain: true })}
            onFocus={(event) => {
              // Mismo texto que el mostrado: cambiarlo al enfocar haría perder la selección
              // y lo escrito se agregaría al final en lugar de reemplazar el valor.
              setEditing(true);
              setDraft(formatValue(value, { plain: true }));
              const input = event.target;
              requestAnimationFrame(() => {
                if (document.activeElement === input) input.select();
              });
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              const parsed = parseDraft(event.target.value);
              if (parsed !== null && parsed >= min && parsed <= max) onChange(parsed, 'input');
            }}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
          {suffix ? <span aria-hidden="true">{suffix}</span> : null}
        </div>
      </div>
      <input
        ref={rangeRef}
        id={`${id}-range`}
        className="range-field__range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText(value)}
        aria-describedby={help ? helpId : undefined}
        onChange={(event) => onChange(Number(event.target.value), 'range')}
      />
      <div className="range-field__scale" aria-hidden="true">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      {help ? (
        <p id={helpId} className="range-field__help">
          {help}
        </p>
      ) : null}
      <p className="range-field__note" role="status">
        {note}
      </p>
    </div>
  );
}
