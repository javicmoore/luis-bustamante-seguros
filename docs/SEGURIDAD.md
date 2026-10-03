# Revisión de seguridad

Fecha: 3 de octubre de 2026. Alcance: código del repositorio, build de producción servido localmente
(`npm run preview:demo`) y pruebas automatizadas. **No** incluye el dominio final, Vercel, Twilio ni Upstash
reales (aún no configurados). No se promete invulnerabilidad: estos son los controles aplicados y lo que falta.

## Controles aplicados

### Secretos y repositorio
- Credenciales solo en variables privadas del servidor (`process.env` en `/api` y `backend/`); ninguna con
  prefijo `VITE_`. `release-check` detiene el build si detecta una variable `VITE_*` con nombre de secreto.
- `.gitignore` excluye `.env*` (salvo `.env.example`), `.vercel/`, llaves y credenciales sueltas, originales
  pesados (`media-originales/`), builds y reportes. Verificado con `git check-ignore` usando archivos ficticios.
- `.env.example` sin valores reales. Git inicializado localmente **sin commits**; no hay historial que limpiar.
- Build sin sourcemaps; el bundle del navegador no contiene nombres de variables privadas ni la URL de la API
  de Twilio (prueba E2E y búsqueda en `dist/`).

### Transporte y headers (`vercel.json`)
- Páginas: CSP sin `unsafe-inline` ni `eval` (`default-src 'self'`; scripts, estilos, fuentes, imágenes,
  conexiones y medios solo del propio origen; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`;
  `frame-ancestors 'none'`; `upgrade-insecure-requests`), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva, `X-Frame-Options: DENY`,
  `Cross-Origin-Opener-Policy: same-origin`.
- Inventario de recursos externos: **ninguno** (fuentes autoalojadas, sin CDNs, sin analítica, sin píxeles).
  Excepción documentada: el bloque JSON-LD (`application/ld+json`) es un dato, no se ejecuta, y no requiere
  relajar la CSP.
- El HTML prerenderizado se valida en el build para que no contenga atributos `style` (compatibles con la CSP).
- API: `Cache-Control: no-store`, `nosniff`, `Referrer-Policy: no-referrer`, CSP `default-src 'none'`.
- HSTS: Vercel agrega por defecto `max-age=63072000` en dominios propios (sin `includeSubDomains` ni `preload`).
  No se añadió nada más; activar `includeSubDomains`/`preload` requiere revisar subdominios y autorización.

### API `POST /api/leads`
- Solo `POST` (405 con `Allow`), solo `application/json` (415), cuerpo máximo 2 KB (413, también sin
  `Content-Length`), JSON inválido (400).
- Validación estricta compartida (`shared/lead-schema.js`): tipos, longitudes, rangos, opciones permitidas,
  consentimiento exactamente `true`, limpieza de caracteres de control/invisibles. Campos inesperados (p. ej.
  `to`, `contentSid`) → 400. Destinatario, plantilla, remitente y credenciales nunca vienen del navegador.
- Origen permitido (dominio configurado y URLs de Vercel; localhost/red privada solo fuera de producción) y
  `Sec-Fetch-Site` como defensa adicional, **no** como autenticación.
- Límites de uso en almacenamiento compartido (Upstash, transacción `MULTI/EXEC`): 30 peticiones/10 min por IP;
  para solicitudes nuevas, 5/10 min y 20/día por IP, 3/día por teléfono y un tope global diario
  (`LEAD_DAILY_CAP`). IP y teléfono se guardan como seudónimos HMAC con `LEAD_HASH_SECRET`.
- Campo trampa (honeypot) → 400 genérico; nunca un éxito ficticio.
- Idempotencia con llave UUID del navegador: reintentos sin duplicar, 409 mientras procesa, 422 si se reutiliza
  la llave con otros datos, reintento tras fallo con el mismo folio, recuperación de ejecuciones interrumpidas.
- Resultados honestos: 201 solo si el registro se guardó y Twilio aceptó; 202 si quedó registrado pero el aviso
  es incierto (timeout/5xx; sin reenvío a ciegas); 502 si el proveedor rechazó; 503 ante configuración ausente
  o almacenamiento caído. El navegador nunca muestra éxito por temporizador.
- Sin datos personales en logs ni en respuestas (solo folio y códigos); las excepciones internas no se exponen.
- Proveedor simulado solo fuera de producción; en producción se rechaza (503).

### Callback `POST /api/twilio-status`
- Firma `X-Twilio-Signature` verificada con el Auth Token (comparación en tiempo constante; paridad probada
  contra el SDK oficial), `AccountSid` verificado, repeticiones descartadas (`I-Twilio-Idempotency-Token`),
  cuerpo máximo 16 KB, parámetros sin prototipo, estados que solo avanzan y control del SID del mensaje.

### Frontend
- Formulario: sin correo, ingresos ni datos médicos; autorización desmarcada al inicio; botón deshabilitado
  hasta hidratar y `method="post"` para que un envío prematuro nunca ponga datos en la URL.
- Eventos de medición sin datos personales (lista blanca de propiedades); la conversión solo se cuenta con
  recepción real del servidor.
- Enlaces externos con `rel="noopener noreferrer"`.

## Comprobaciones realizadas (con evidencia)

| Comprobación | Resultado |
| --- | --- |
| Pruebas unitarias (`npm test`) | 80/80: validación, manipulación de campos, destinatario inyectado, idempotencia, doble envío, límites, fallos y timeouts del proveedor, configuración ausente, almacenamiento caído, logs sin datos personales, firma y callbacks |
| Pruebas E2E (`npm run test:e2e`, Chromium) | 37/37: incluye CSP sin violaciones, bundle sin secretos, estados del formulario y rutas directas |
| Headers en `vite preview` (réplica de `vercel.json`) | CSP, nosniff, referrer, permisos, X-Frame-Options y COOP presentes en landing; 404 con estado 404 |
| `npm audit` (todas y solo producción) | 0 vulnerabilidades. No se usó `npm audit fix --force` |
| ESLint | Sin errores |
| Búsqueda de secretos en el árbol versionable | Sin coincidencias (SIDs, llaves privadas, tokens) |
| `dist/` | Sin variables privadas ni sourcemaps |

## Hallazgos pendientes y riesgos residuales

1. **No verificado en el dominio final**: HTTPS, redirección desde HTTP, recursos mixtos y valores reales de
   headers (incluido HSTS). Comprobar con `curl -I` en `/`, `/aviso-de-privacidad`, una ruta inexistente y
   `/api/leads`.
2. **Twilio y Upstash sin configurar**: sin prueba real de entrega ni del callback. El sitio **no debe recibir
   prospectos reales** hasta completar la prueba autorizada.
3. **Abuso distribuido**: los límites son por IP y teléfono más un tope global; un ataque desde muchas IP podría
   agotar el tope diario (bloquea solicitudes, no genera costos ilimitados). Si aparece spam, agregar un
   desafío (p. ej. Cloudflare Turnstile) con validación del token en el servidor.
4. **Datos en Upstash**: el registro mínimo contiene datos personales durante 30 días. Proteger el acceso a la
   consola (2FA, solo Javier), usar token de solo lectura para consultas y revisar las opciones de cifrado del
   proveedor. No se agregó cifrado a nivel de aplicación.
5. **Rotación de credenciales**: al rotar el Auth Token o la API Key, actualizar Vercel de inmediato (los
   callbacks fallarían la verificación de firma con un token viejo).
6. **Vistas previas de Vercel**: mantener *Deployment Protection*. Si se usa `LEAD_PROVIDER=mock` en Preview, el
   sitio lo indica como demostración.
7. **Aviso de privacidad en borrador** (sin datos del responsable ni revisión legal).
8. **Navegadores**: las pruebas automatizadas usan Chromium; falta verificar Safari (iOS) y Firefox.

## Configuración externa faltante

Variables privadas de Twilio, Upstash, `LEAD_HASH_SECRET` y `SITE_URL` (ver `docs/WHATSAPP-TWILIO.md`), dominio
con HTTPS, plantilla aprobada y aceptación de Luis, y Deployment Protection en vistas previas.

## Si un secreto se expone

1. Detener el lanzamiento y avisar a Javier (sin pegar el secreto en chats ni tickets).
2. Revocar/rotar en el proveedor (Twilio: API Key o Auth Token; Upstash: token) y actualizar Vercel.
3. Si llegó a Git: `.gitignore` no lo elimina del historial. Rotar primero; reescribir historial compartido solo
   con autorización.
4. Revisar logs del proveedor por uso indebido.
