import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { formCopy as copy } from '../../content/copy.js';
import { site } from '../../content/site.js';
import { media } from '../../content/media.js';
import { LEAD_LIMITS, SAVINGS_OPTIONS, normalizeName, validateLead } from '../../../shared/lead-schema.js';
import { track } from '../../lib/analytics.js';
import { IS_DEMO } from '../../lib/siteMode.js';
import { Icon } from '../ui/Icon.jsx';
import { Portrait } from '../ui/Portrait.jsx';
import { PrivacyDialog } from '../Privacy/PrivacyDialog.jsx';
import { createIdempotencyTracker, submitLead, wait } from './submitLead.js';
import './LeadForm.css';

const FIELDS = ['name', 'age', 'phone', 'savings', 'consent'];

const MESSAGES = {
  name: {
    required: 'Escribe tu nombre.',
    too_short: 'Escribe tu nombre completo.',
    too_long: `Usa máximo ${LEAD_LIMITS.nameMax} caracteres.`,
    invalid: 'Escribe tu nombre solo con letras.',
  },
  age: {
    required: 'Escribe tu edad.',
    invalid: 'Escribe tu edad en números, por ejemplo 35.',
    out_of_range: `La asesoría es para personas de ${LEAD_LIMITS.ageMin} a ${LEAD_LIMITS.ageMax} años.`,
  },
  phone: {
    required: 'Escribe un teléfono de contacto.',
    invalid: 'Escribe un teléfono válido de 10 dígitos.',
  },
  savings: {
    required: 'Elige una opción; cualquier respuesta es válida.',
    invalid: 'Elige una de las opciones.',
  },
  consent: {
    required: 'Para que Luis pueda contactarte, marca la autorización.',
  },
};

const FIELD_LABELS = {
  name: copy.nameLabel,
  age: copy.ageLabel,
  phone: copy.phoneLabel,
  savings: 'Ahorro o retiro',
  consent: 'Autorización de contacto',
};

const ERROR_COPY = {
  timeout: {
    title: 'La respuesta tardó demasiado.',
    body: 'Es posible que tu solicitud sí haya llegado. Si reintentas, no se duplicará.',
  },
  network: {
    title: 'No pudimos conectar con el servidor.',
    body: 'Revisa tu conexión e inténtalo de nuevo. Tus datos siguen en el formulario.',
  },
  notification_failed: {
    title: 'Tu solicitud no pudo enviarse a Luis en este momento.',
    body: 'Tus datos siguen en el formulario: puedes reintentar o contactarlo directamente.',
  },
  unavailable: {
    title: 'El envío no está disponible en este momento.',
    body: 'Tus datos siguen en el formulario. Intenta más tarde o contacta a Luis directamente.',
  },
  rate_limited: {
    title: 'Recibimos varias solicitudes en poco tiempo.',
    body: 'Espera unos minutos antes de reintentar o contacta a Luis directamente.',
  },
  in_progress: {
    title: 'Tu solicitud todavía se está procesando.',
    body: 'Espera unos segundos y vuelve a intentarlo; no se duplicará.',
  },
  generic: {
    title: 'No pudimos enviar tu solicitud.',
    body: 'Tus datos siguen en el formulario. Puedes reintentar o contactar a Luis directamente.',
  },
};

const INITIAL = { name: '', age: '', phone: '', savings: '', consent: false, website: '' };

// Suscripción vacía: en el servidor (y durante la hidratación) devuelve false; en el cliente, true.
const subscribeNoop = () => () => {};

function fieldErrors(values) {
  const result = validateLead(values, { strict: false });
  if (result.ok) return {};
  const errors = { ...result.errors };
  delete errors._form;
  return errors;
}

function DirectContact({ className = '' }) {
  return (
    <span className={`direct-contact ${className}`.trim()}>
      <a href={site.phone.href}>
        <Icon name="phone" />
        Llamar al {site.phone.display}
      </a>
      <a href={site.whatsapp.href} target="_blank" rel="noopener noreferrer">
        <Icon name="whatsapp" />
        Escribir por WhatsApp
        <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
      </a>
    </span>
  );
}

export function LeadForm() {
  const [values, setValues] = useState(INITIAL);
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle' });
  const [privacyOpen, setPrivacyOpen] = useState(false);
  // Hasta hidratar, el botón queda deshabilitado: así un envío prematuro nunca dispara el
  // envío nativo del navegador (que pondría los datos en la URL).
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const keyFor = useRef(null);
  const summaryRef = useRef(null);
  const resultRef = useRef(null);

  const liveErrors = useMemo(() => fieldErrors(values), [values]);
  const submitting = status.state === 'submitting';

  const errorFor = (field) => {
    if (serverErrors[field]) return serverErrors[field];
    const code = liveErrors[field];
    if (!code) return null;
    const value = values[field];
    const filled = typeof value === 'boolean' ? value : String(value).trim() !== '';
    if (attempted || (touched[field] && filled)) return code;
    return null;
  };
  const messageFor = (field) => {
    const code = errorFor(field);
    return code ? MESSAGES[field][code] || MESSAGES[field].invalid || MESSAGES[field].required : null;
  };

  const update = (field, value) => {
    if (submitting) return;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (serverErrors[field]) setServerErrors(({ [field]: _removed, ...rest }) => rest);
    if (status.state === 'error') setStatus({ state: 'idle' });
  };
  const blur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const summaryFields = attempted ? FIELDS.filter((field) => errorFor(field)) : [];

  async function onSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setAttempted(true);

    const errors = fieldErrors(values);
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    if (IS_DEMO) {
      // Demostración: no hay petición al servidor, ni registro, ni aviso a Luis.
      setStatus({ state: 'demo' });
      requestAnimationFrame(() => resultRef.current?.focus());
      return;
    }

    track('lead_form_attempt');
    const payload = { ...values };
    const fingerprint = JSON.stringify([
      normalizeName(values.name),
      values.age.trim(),
      values.phone.replace(/\D/g, ''),
      values.savings,
      values.consent,
    ]);
    if (!keyFor.current) keyFor.current = createIdempotencyTracker();
    const idempotencyKey = keyFor.current(fingerprint);

    setStatus({ state: 'submitting' });
    let outcome = await submitLead(payload, idempotencyKey);
    for (let i = 0; i < 3 && outcome.kind === 'response' && outcome.status === 409 && outcome.data?.error === 'in_progress'; i += 1) {
      await wait(2000);
      outcome = await submitLead(payload, idempotencyKey);
    }

    if (outcome.kind !== 'response') {
      setStatus({ state: 'error', reason: outcome.kind });
      return;
    }

    const { status: code, data } = outcome;
    const received =
      (code === 201 || code === 202) &&
      data?.ok === true &&
      data.status === 'received' &&
      typeof data.id === 'string';

    if (received) {
      const pending = data.notification !== 'accepted';
      // Conversión solo con recepción real del servidor.
      track('lead_submitted', { notification: pending ? 'pending' : 'accepted' });
      setStatus({ state: pending ? 'pending' : 'success', id: data.id, demo: data.demo === true });
      requestAnimationFrame(() => resultRef.current?.focus());
      return;
    }

    if (code === 400 && data?.error === 'invalid' && data.fields && typeof data.fields === 'object') {
      const mapped = {};
      for (const field of FIELDS) if (typeof data.fields[field] === 'string') mapped[field] = data.fields[field];
      setServerErrors(mapped);
      setStatus({ state: 'idle' });
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    const reason =
      code === 429
        ? 'rate_limited'
        : code === 502
          ? 'notification_failed'
          : code === 503
            ? 'unavailable'
            : code === 409
              ? 'in_progress'
              : 'generic';
    setStatus({ state: 'error', reason });
  }

  const describedBy = (field, extra) =>
    [extra, errorFor(field) ? `lead-${field}-error` : null].filter(Boolean).join(' ') || undefined;

  const done = status.state === 'success' || status.state === 'pending' || status.state === 'demo';

  return (
    <section id="asesoria" className="section request on-dark" aria-labelledby="lead-title">
      <div className="request__glow" aria-hidden="true" />
      <div className="container request__grid">
        <div className="request__intro" data-reveal="">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="lead-title" className="section-title" data-section-focus="">
            {copy.title}
          </h2>
          <p className="lead request__text">{copy.intro}</p>
          <ul className="request__points" role="list">
            {copy.points.map((point) => (
              <li key={point}>
                <Icon name="check" />
                {point}
              </li>
            ))}
          </ul>
          <div className="request__signature">
            <Portrait image={media.heroPortrait} variant="avatar" className="request__avatar" sizes="56px" />
            <div>
              <p className="request__signature-name">{site.name}</p>
              <p className="request__signature-role">{site.role}</p>
            </div>
          </div>
        </div>

        <div className="request__card" data-reveal="" data-reveal-delay="1">
          {done ? (
            <div className="lead-result" ref={resultRef} tabIndex={-1} aria-labelledby="lead-result-title">
              <span className={`lead-result__icon${status.state !== 'success' ? ' is-pending' : ''}`} aria-hidden="true">
                <Icon name={status.state === 'success' ? 'check' : 'alert'} />
              </span>
              {status.state === 'demo' ? (
                <>
                  <h3 id="lead-result-title" className="lead-result__title">
                    Formulario de demostración: no se envió nada.
                  </h3>
                  <p className="lead-result__text">
                    Esta versión sirve para revisar el diseño. Los datos no salieron de tu navegador y Luis no recibió
                    ninguna solicitud.
                  </p>
                </>
              ) : status.state === 'success' ? (
                <>
                  <h3 id="lead-result-title" className="lead-result__title">
                    Tu solicitud fue recibida.
                  </h3>
                  <p className="lead-result__text">Luis podrá contactarte al teléfono que compartiste.</p>
                </>
              ) : (
                <>
                  <h3 id="lead-result-title" className="lead-result__title">
                    Tu solicitud quedó registrada.
                  </h3>
                  <p className="lead-result__text">
                    Todavía no pudimos confirmar el aviso a Luis. Si no recibes noticias, puedes contactarlo
                    directamente.
                  </p>
                </>
              )}
              {status.id ? (
                <p className="lead-result__folio">
                  Folio <strong>{status.id}</strong>
                </p>
              ) : null}
              {status.demo ? (
                <p className="lead-result__demo" role="note">
                  Modo demostración: no se envió ningún mensaje real y la solicitud no se guardó de forma
                  permanente.
                </p>
              ) : null}
              <p className="lead-result__alt">
                {status.state === 'demo'
                  ? 'Para contactar a Luis de verdad:'
                  : 'Si necesitas algo antes, también puedes contactarlo:'}
              </p>
              <DirectContact />
            </div>
          ) : (
            <form
              className="lead-form"
              method="post"
              action="/api/leads"
              noValidate
              onSubmit={onSubmit}
              aria-busy={submitting}
              aria-describedby="lead-form-help"
              data-tuck-header=""
            >
              <p id="lead-form-help" className="lead-form__help">
                Todos los campos son obligatorios.
              </p>

              {summaryFields.length > 0 ? (
                <div className="lead-summary" ref={summaryRef} tabIndex={-1} role="group" aria-labelledby="lead-summary-title">
                  <p id="lead-summary-title" className="lead-summary__title">
                    {summaryFields.length === 1 ? 'Revisa este dato para continuar:' : `Revisa estos ${summaryFields.length} datos para continuar:`}
                  </p>
                  <ul role="list">
                    {summaryFields.map((field) => (
                      <li key={field}>
                        <a
                          href={`#lead-${field}`}
                          onClick={(event) => {
                            event.preventDefault();
                            const target =
                              document.getElementById(`lead-${field}`) ||
                              document.querySelector(`[name="${field}"]`);
                            target?.focus();
                          }}
                        >
                          {FIELD_LABELS[field]}: {messageFor(field)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={`field${errorFor('name') ? ' has-error' : ''}`}>
                <label className="field__label" htmlFor="lead-name">
                  {copy.nameLabel}
                </label>
                <input
                  id="lead-name"
                  className="field__input"
                  name="name"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  maxLength={LEAD_LIMITS.nameMax}
                  required
                  value={values.name}
                  readOnly={submitting}
                  aria-invalid={errorFor('name') ? 'true' : undefined}
                  aria-describedby={describedBy('name')}
                  onChange={(event) => update('name', event.target.value)}
                  onBlur={() => blur('name')}
                />
                {messageFor('name') ? (
                  <p id="lead-name-error" className="field__error">
                    <Icon name="alert" />
                    {messageFor('name')}
                  </p>
                ) : null}
              </div>

              <div className="lead-form__row">
                <div className={`field field--age${errorFor('age') ? ' has-error' : ''}`}>
                  <label className="field__label" htmlFor="lead-age">
                    {copy.ageLabel}
                  </label>
                  <input
                    id="lead-age"
                    className="field__input"
                    name="age"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    enterKeyHint="next"
                    maxLength={2}
                    required
                    value={values.age}
                    readOnly={submitting}
                    aria-invalid={errorFor('age') ? 'true' : undefined}
                    aria-describedby={describedBy('age', 'lead-age-help')}
                    onChange={(event) => update('age', event.target.value.replace(/[^\d]/g, ''))}
                    onBlur={() => blur('age')}
                  />
                  <p id="lead-age-help" className="field__help">
                    {copy.ageHelp}
                  </p>
                  {messageFor('age') ? (
                    <p id="lead-age-error" className="field__error">
                      <Icon name="alert" />
                      {messageFor('age')}
                    </p>
                  ) : null}
                </div>

                <div className={`field field--phone${errorFor('phone') ? ' has-error' : ''}`}>
                  <label className="field__label" htmlFor="lead-phone">
                    {copy.phoneLabel}
                  </label>
                  <input
                    id="lead-phone"
                    className="field__input"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="next"
                    maxLength={LEAD_LIMITS.phoneRawMax}
                    required
                    value={values.phone}
                    readOnly={submitting}
                    aria-invalid={errorFor('phone') ? 'true' : undefined}
                    aria-describedby={describedBy('phone', 'lead-phone-help')}
                    onChange={(event) => update('phone', event.target.value)}
                    onBlur={() => blur('phone')}
                  />
                  <p id="lead-phone-help" className="field__help">
                    {copy.phoneHelp}
                  </p>
                  {messageFor('phone') ? (
                    <p id="lead-phone-error" className="field__error">
                      <Icon name="alert" />
                      {messageFor('phone')}
                    </p>
                  ) : null}
                </div>
              </div>

              <fieldset
                className={`field choice${errorFor('savings') ? ' has-error' : ''}`}
                aria-describedby={describedBy('savings', 'lead-savings-help')}
              >
                <legend className="field__label">{copy.savingsLegend}</legend>
                <p id="lead-savings-help" className="field__help">
                  {copy.savingsHelp}
                </p>
                <div className="choice__options">
                  {SAVINGS_OPTIONS.map((option, index) => (
                    <label key={option.value} className="choice__option">
                      <input
                        id={index === 0 ? 'lead-savings' : undefined}
                        type="radio"
                        name="savings"
                        value={option.value}
                        checked={values.savings === option.value}
                        onChange={() => update('savings', option.value)}
                        onBlur={() => blur('savings')}
                      />
                      <span className="choice__mark" aria-hidden="true" />
                      <span className="choice__text">{option.label}</span>
                    </label>
                  ))}
                </div>
                {messageFor('savings') ? (
                  <p id="lead-savings-error" className="field__error">
                    <Icon name="alert" />
                    {messageFor('savings')}
                  </p>
                ) : null}
              </fieldset>

              <div className={`field consent${errorFor('consent') ? ' has-error' : ''}`}>
                <label className="consent__label">
                  <input
                    id="lead-consent"
                    type="checkbox"
                    name="consent"
                    checked={values.consent}
                    onChange={(event) => update('consent', event.target.checked)}
                    onBlur={() => blur('consent')}
                    aria-invalid={errorFor('consent') ? 'true' : undefined}
                    aria-describedby={describedBy('consent', 'lead-privacy-short')}
                  />
                  <span className="consent__box" aria-hidden="true">
                    <Icon name="check" strokeWidth={2.6} />
                  </span>
                  <span>{copy.consentLabel}</span>
                </label>
                {messageFor('consent') ? (
                  <p id="lead-consent-error" className="field__error">
                    <Icon name="alert" />
                    {messageFor('consent')}
                  </p>
                ) : null}
              </div>

              {IS_DEMO ? (
                <p className="lead-result__demo lead-form__demo" role="note">
                  Versión de demostración: el envío está desactivado. Puedes probar la validación, pero los datos no se
                  envían ni se guardan.
                </p>
              ) : null}

              <div className="lead-form__privacy">
                <Icon name="lock" />
                <p id="lead-privacy-short">
                  {copy.privacyShort}{' '}
                  <button type="button" className="text-link lead-form__privacy-link" onClick={() => setPrivacyOpen(true)}>
                    {copy.privacyLink}
                  </button>
                </p>
              </div>

              {/* Campo trampa: invisible para personas; los bots suelen llenarlo. */}
              <div className="lead-form__trap" aria-hidden="true" inert>
                <label htmlFor="lead-website">No llenes este campo</label>
                <input
                  id="lead-website"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={(event) => update('website', event.target.value)}
                />
              </div>

              {status.state === 'error' ? (
                <div className="lead-alert" role="alert">
                  <Icon name="alert" />
                  <div>
                    <p className="lead-alert__title">{ERROR_COPY[status.reason]?.title || ERROR_COPY.generic.title}</p>
                    <p>{ERROR_COPY[status.reason]?.body || ERROR_COPY.generic.body}</p>
                    <p className="lead-alert__alt">Si prefieres, contacta a Luis directamente:</p>
                    <DirectContact className="direct-contact--alert" />
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                className="btn btn--gold btn--block lead-form__submit"
                disabled={!ready}
                aria-disabled={submitting ? 'true' : undefined}
              >
                {submitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    {copy.submitting}
                  </>
                ) : status.state === 'error' ? (
                  <>
                    Reintentar envío
                    <Icon name="arrowRight" className="btn__icon btn__icon--move" />
                  </>
                ) : (
                  <>
                    {copy.submit}
                    <Icon name="arrowRight" className="btn__icon btn__icon--move" />
                  </>
                )}
              </button>
              <p className="visually-hidden" aria-live="polite">
                {submitting ? copy.submitting : ''}
              </p>
              <noscript>
                <p className="lead-form__noscript">
                  Para enviar el formulario necesitas activar JavaScript. También puedes llamar o escribir a Luis al{' '}
                  {site.phone.display}.
                </p>
              </noscript>
            </form>
          )}
        </div>
      </div>
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </section>
  );
}
