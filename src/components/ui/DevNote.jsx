// Aviso de pendiente visible SOLO en `npm run dev`. En el build de producción no existe.
export function DevNote({ children, className = '' }) {
  if (!import.meta.env.DEV) return null;
  return (
    <div className={`dev-note ${className}`.trim()} role="note" data-dev-note="">
      <strong>Pendiente para Javier:</strong>
      <span>{children}</span>
    </div>
  );
}
