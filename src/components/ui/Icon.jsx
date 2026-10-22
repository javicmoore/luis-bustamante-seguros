// Íconos de línea propios (24×24, currentColor). Decorativos: el texto acompaña la acción.
const PATHS = {
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7M9 7h8v8" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  pause: <path d="M9 6.5v11M15 6.5v11" />,
  play: <path d="M8.5 6v12l9.5-6-9.5-6Z" />,
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.6v5.6M12 16.3v.2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  phone: (
    <path d="M7 3.6h2.4l1.5 4-1.9 1.3a11.6 11.6 0 0 0 6.1 6.1l1.3-1.9 4 1.5V17a2 2 0 0 1-2.2 2A15.6 15.6 0 0 1 5 5.8a2 2 0 0 1 2-2.2Z" />
  ),
  whatsapp: (
    <>
      <path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.3 20.7l4.4-1.1A8.8 8.8 0 1 0 12 3.2Z" />
      <path
        d="M9.1 8c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.2-.1.3 0 .5a6 6 0 0 0 2.6 2.4c.2.1.3.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.7.8c.2.1.3.2.3.4 0 .8-.6 1.6-1.4 1.8-.7.2-1.5.1-2.8-.5a8.9 8.9 0 0 1-4-4c-.6-1.2-.6-2.1-.4-2.8.1-.3.3-.5.5-.7Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  trend: (
    <>
      <path d="M4 18.5h16" />
      <path d="m5 14.5 4.2-4.2 3.3 3.3L19 7" />
      <path d="M14.5 7H19v4.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  document: (
    <>
      <path d="M7 3.5h7l4 4v13H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4.5 7 7.5 5.6L19.5 7" />
    </>
  ),
  car: (
    <>
      <path d="M5 16.5V12l1.8-4.4A2 2 0 0 1 8.7 6.3h6.6a2 2 0 0 1 1.9 1.3L19 12v4.5" />
      <path d="M4 16.5h16M5 12h14" />
      <circle cx="8" cy="16.6" r="1.7" />
      <circle cx="16" cy="16.6" r="1.7" />
    </>
  ),
  medical: (
    <>
      <path d="M12 20.3s-7.3-4.4-7.3-9.6A4.1 4.1 0 0 1 12 8.1a4.1 4.1 0 0 1 7.3 2.6c0 5.2-7.3 9.6-7.3 9.6Z" />
      <path d="M12 10.8v5M9.5 13.3h5" />
    </>
  ),
  education: (
    <>
      <path d="m3.5 9.5 8.5-4 8.5 4-8.5 4-8.5-4Z" />
      <path d="M7 11.2v4.3c1.4 1.4 3.2 2 5 2s3.6-.6 5-2v-4.3M20.5 9.5v5" />
    </>
  ),
  home: (
    <>
      <path d="M4.5 11 12 4.5l7.5 6.5" />
      <path d="M6.5 9.5v10h11v-10M10 19.5v-5h4v5" />
    </>
  ),
  life: (
    <>
      <path d="M12 4a8.5 8.5 0 0 1 8.5 8.5h-17A8.5 8.5 0 0 1 12 4Z" />
      <path d="M12 12.5v6a2 2 0 0 1-4 0M12 2.8V4" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Icon({ name, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
