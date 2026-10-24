import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { formCopy as copy } from '../../content/copy.js';
import { site } from '../../content/site.js';
import { media } from '../../content/media.js';
import {
  CONTACT_METHODS,
  DEFAULT_PHONE_COUNTRY,
  INCOME_OPTIONS,
  LEAD_LIMITS,
  hasPhoneLibrary,
  normalizeName,
  normalizePhone,
  validateLead,
} from '../../../shared/lead-schema.js';
import { COUNTRIES, COUNTRY_BY_CODE } from '../../../shared/countries.js';
import { track } from '../../lib/analytics.js';
import { IS_DEMO } from '../../lib/siteMode.js';
import { Icon } from '../ui/Icon.jsx';
import { Portrait } from '../ui/Portrait.jsx';
import { PrivacyDialog } from '../Privacy/PrivacyDialog.jsx';
import { createIdempotencyTracker, submitLead, wait } from './submitLead.js';
import './LeadForm.css';

const FIELDS = ['name', 'age', 'contactMethod', 'email', 'phoneCountry', 'phone', 'income', 'consent'];

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
  contactMethod: {
    required: 'Elige cómo prefieres que Luis te contacte.',
    invalid: 'Elige una de las opciones.',
  },
  email: {
    required: 'Escribe tu correo electrónico.',
    invalid: 'Escribe un correo válido, por ejemplo nombre@correo.com.',
    not_allowed: 'Elegiste teléfono como medio de contacto.',
  },
  phoneCountry: {
    invalid: 'Elige un país de la lista.',
  },
  phone: {
    required: 'Escribe tu número de teléfono.',
    // El texto de "invalid" depende del país (ver messageFor).
    invalid: 'Escribe un número válido para el país elegido.',
    not_allowed: 'Elegiste correo como medio de contacto.',
  },
  income: {
    required: 'Elige el rango de tus ingresos mensuales.',
    invalid: 'Elige una de las opciones.',
  },
  consent: {
    required: 'Para que Luis pueda contactarte, marca la autorización.',
  },
};

const FIELD_LABELS = {
  name: copy.nameLabel,
  age: copy.ageLabel,
  contactMethod: 'Medio de contacto',
  email: copy.emailLabel,
  phoneCountry: copy.phoneCountryLabel,
  phone: copy.phoneLabel,
  income: 'Ingresos mensuales',
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

const INITIAL = {
  name: '',
  age: '',
  contactMethod: '',
  email: '',
  phoneCountry: DEFAULT_PHONE_COUNTRY,
  phone: '',
  income: '',
  consent: false,
  website: '',
};

/** Solo viaja el dato del medio elegido: nunca información oculta del otro medio. */
function buildPayload(values) {
  const payload = {
    name: values.name,
    age: values.age,
    contactMethod: values.contactMethod,
    income: values.income,
    consent: values.consent,
    website: values.website,
  };
  if (values.contactMethod === 'email') payload.email = values.email;
  if (values.contactMethod === 'phone') {
    payload.phoneCountry = values.phoneCountry;
    payload.phone = values.phone;
  }
  return payload;
}

/**
 * Un número pegado con su prefijo internacional ("+34 612…", "0052 686…") se reparte en país y
 * número nacional, así el prefijo nunca aparece dos veces. Solo si el número es válido.
 */
function splitInternational(raw, country) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('+') && !trimmed.startsWith('00')) return null;
  const parsed = normalizePhone(trimmed, country);
  if (!parsed || !COUNTRY_BY_CODE[parsed.country]) return null;
  return { phoneCountry: parsed.country, phone: parsed.e164.slice(COUNTRY_BY_CODE[parsed.country].dial.length + 1) };
}

// Reglas telefónicas internacionales: se cargan una sola vez, al empezar a usar el formulario.
let phoneLibPromise = null;
const loadPhoneLibrary = () => {
  if (!phoneLibPromise) phoneLibPromise = import('../../../shared/phone-lib.js');
  return phoneLibPromise;
};

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
      <a href={site.email.href}>
        <Icon name="mail" />
        {site.email.address}
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
  const privacyButtonRef = useRef(null);
  // Foco tras una respuesta asíncrona: se aplica en un efecto, cuando el elemento ya existe
  // (un requestAnimationFrame podía ejecutarse antes de que React montara el resultado).
  const [focusRequest, setFocusRequest] = useState(null);
  useEffect(() => {
    if (!focusRequest) return;
    (focusRequest.target === 'result' ? resultRef : summaryRef).current?.focus();
  }, [focusRequest]);

  const [phoneLibReady, setPhoneLibReady] = useState(false);
  const preparePhone = () => {
    if (!hasPhoneLibrary()) loadPhoneLibrary().then(() => setPhoneLibReady(true));
  };
  // phoneLibReady obliga a revalidar cuando llegan las reglas de otros países.
  const liveErrors = useMemo(() => fieldErrors(values), [values, phoneLibReady]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (!code) return null;
    if (field === 'phone' && code === 'invalid' && values.phoneCountry === 'MX') return 'Escribe un número válido de 10 dígitos.';
    return MESSAGES[field][code] || MESSAGES[field].invalid || MESSAGES[field].required;
  };

  const update = (field, value) => {
    if (submitting) return;
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // Cambiar de medio de contacto limpia el dato del medio anterior.
      if (field === 'contactMethod' && prev.contactMethod !== value) {
        next.email = '';
        next.phone = '';
      }
      if (field === 'phone') {
        const split = splitInternational(value, prev.phoneCountry);
        if (split) Object.assign(next, split);
      }
      return next;
    });
    // Un cambio también descarta los errores del servidor que dependían del valor anterior.
    const stale =
      field === 'contactMethod'
        ? [field, 'email', 'phone', 'phoneCountry']
        : field === 'phoneCountry'
          ? [field, 'phone']
          : [field];
    if (stale.some((key) => serverErrors[key])) {
      setServerErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !stale.includes(key))));
    }
    if (status.state === 'error') setStatus({ state: 'idle' });
  };

  const method = values.contactMethod;
  const blur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const summaryFields = attempted ? FIELDS.filter((field) => errorFor(field)) : [];

  async function onSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setAttempted(true);
    if (values.contactMethod === 'phone' && !hasPhoneLibrary()) {
      await loadPhoneLibrary();
      setPhoneLibReady(true);
    }

    const errors = fieldErrors(values);
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    if (IS_DEMO) {
      // Demostración: no hay petición al servidor, ni registro, ni aviso a Luis.
      setStatus({ state: 'demo' });
      setFocusRequest({ target: 'result' });
      return;
    }

    track('lead_form_attempt');
    const payload = buildPayload(values);
    const fingerprint = JSON.stringify([
      normalizeName(values.name),
      values.age.trim(),
      values.contactMethod,
      values.email.trim().toLowerCase(),
      values.contactMethod === 'phone' ? values.phoneCountry : '',
      values.phone.replace(/\D/g, ''),
      values.income,
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
      setStatus({ state: pending ? 'pending' : 'success', id: data.id, demo: data.demo === true, method: values.contactMethod });
      setFocusRequest({ target: 'result' });
      return;
    }

    if (code === 400 && data?.error === 'invalid' && data.fields && typeof data.fields === 'object') {
      const mapped = {};
      for (const field of FIELDS) if (typeof data.fields[field] === 'string') mapped[field] = data.fields[field];
      setServerErrors(mapped);
      setStatus({ state: 'idle' });
      setFocusRequest({ target: 'summary' });
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
            <Portrait image={media.avatar} variant="avatar" className="request__avatar" sizes="56px" />
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
                  <p className="lead-result__text">
                    {status.method === 'email'
                      ? 'Luis podrá responderte al correo que compartiste.'
                      : 'Luis podrá contactarte al teléfono que compartiste.'}
                  </p>
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
              onFocus={preparePhone}
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

              <fieldset
                className={`field choice${errorFor('contactMethod') ? ' has-error' : ''}`}
                aria-describedby={describedBy('contactMethod')}
              >
                <legend className="field__label">{copy.contactLegend}</legend>
                <div className="choice__options choice__options--pair">
                  {CONTACT_METHODS.map((option, index) => (
                    <label key={option.value} className="choice__option">
                      <input
                        id={index === 0 ? 'lead-contactMethod' : undefined}
                        type="radio"
                        name="contactMethod"
                        value={option.value}
                        checked={values.contactMethod === option.value}
                        onChange={() => update('contactMethod', option.value)}
                        onBlur={() => blur('contactMethod')}
                      />
                      <span className="choice__mark" aria-hidden="true" />
                      <span className="choice__text">{option.label}</span>
                    </label>
                  ))}
                </div>
                {messageFor('contactMethod') ? (
                  <p id="lead-contactMethod-error" className="field__error">
                    <Icon name="alert" />
                    {messageFor('contactMethod')}
                  </p>
                ) : null}
              </fieldset>

              {/* Dato de contacto: solo el del medio elegido, sin mover el foco. */}
              <div className={`interest${method ? ' is-open' : ''}`}>
                <div className="interest__inner">
                  {method === 'email' ? (
                    <div key="email" className={`field interest__fieldset${errorFor('email') ? ' has-error' : ''}`}>
                      <label className="field__label" htmlFor="lead-email">
                        {copy.emailLabel}
                      </label>
                      <input
                        id="lead-email"
                        className="field__input"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        maxLength={LEAD_LIMITS.emailMax}
                        required
                        value={values.email}
                        readOnly={submitting}
                        aria-invalid={errorFor('email') ? 'true' : undefined}
                        aria-describedby={describedBy('email', 'lead-email-help')}
                        onChange={(event) => update('email', event.target.value)}
                        onBlur={() => blur('email')}
                      />
                      <p id="lead-email-help" className="field__help">
                        {copy.emailHelp}
                      </p>
                      {messageFor('email') ? (
                  <p id="lead-email-error" className="field__error">
                    <Icon name="alert" />
                    {messageFor('email')}
                  </p>
                ) : null}
                    </div>
                  ) : method === 'phone' ? (
                    <div
                      key="phone"
                      className={`field interest__fieldset${errorFor('phone') || errorFor('phoneCountry') ? ' has-error' : ''}`}
                    >
                      <div className="phone-group">
                        <div className="phone-group__country">
                          <label className="field__label" htmlFor="lead-phoneCountry">
                            {copy.phoneCountryLabel}
                          </label>
                          <select
                            id="lead-phoneCountry"
                            className="field__input field__select"
                            name="phoneCountry"
                            autoComplete="tel-country-code"
                            value={values.phoneCountry}
                            disabled={submitting}
                            aria-invalid={errorFor('phoneCountry') ? 'true' : undefined}
                            aria-describedby={describedBy('phoneCountry')}
                            onChange={(event) => update('phoneCountry', event.target.value)}
                            onBlur={() => blur('phoneCountry')}
                          >
                            {COUNTRIES.map((country) => (
                              <option key={country.code} value={country.code}>
                                +{country.dial} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="phone-group__number">
                          <label className="field__label" htmlFor="lead-phone">
                            {copy.phoneLabel}
                          </label>
                          <input
                            id="lead-phone"
                            className="field__input"
                            name="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel-national"
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
                        </div>
                      </div>
                      <p id="lead-phone-help" className="field__help">
                        {values.phoneCountry === 'MX' ? copy.phoneHelpMx : copy.phoneHelpIntl}
                      </p>
                      {messageFor('phoneCountry') ? (
                  <p id="lead-phoneCountry-error" className="field__error">
                    <Icon name="alert" />
                    {messageFor('phoneCountry')}
                  </p>
                ) : null}
                      {messageFor('phone') ? (
                  <p id="lead-phone-error" className="field__error">
                    <Icon name="alert" />
                    {messageFor('phone')}
                  </p>
                ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <fieldset
                className={`field choice${errorFor('income') ? ' has-error' : ''}`}
                aria-describedby={describedBy('income', 'lead-income-help')}
              >
                <legend className="field__label">{copy.incomeLegend}</legend>
                <p id="lead-income-help" className="field__help">
                  {copy.incomeHelp}
                </p>
                <div className="choice__options choice__options--stack">
                  {INCOME_OPTIONS.map((option, index) => (
                    <label key={option.value} className="choice__option">
                      <input
                        id={index === 0 ? 'lead-income' : undefined}
                        type="radio"
                        name="income"
                        value={option.value}
                        checked={values.income === option.value}
                        onChange={() => update('income', option.value)}
                        onBlur={() => blur('income')}
                      />
                      <span className="choice__mark" aria-hidden="true" />
                      <span className="choice__text">{option.label}</span>
                    </label>
                  ))}
                </div>
                {messageFor('income') ? (
                  <p id="lead-income-error" className="field__error">
                    <Icon name="alert" />
                    {messageFor('income')}
                  </p>
                ) : null}
              </fieldset>

              <p className="visually-hidden" aria-live="polite">
                {[
                  method === 'email' ? `Nuevo campo: ${copy.emailLabel}` : method === 'phone' ? `Nuevos campos: ${copy.phoneCountryLabel} y ${copy.phoneLabel}` : '',
                ]
                  .filter(Boolean)
                  .join('. ')}
              </p>

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
                  <span>{copy.consentLabels[method] || copy.consentLabels.none}</span>
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
                  <button ref={privacyButtonRef} type="button" className="text-link lead-form__privacy-link" onClick={() => setPrivacyOpen(true)}>
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
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} returnFocusRef={privacyButtonRef} />
    </section>
  );
}
