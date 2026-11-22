# Revisión de seguridad

Actualizada el 21 de noviembre de 2026. Alcance: código del repositorio, build servido localmente
(`npm run preview:demo`) y pruebas automatizadas. **No** incluye el dominio final. No se promete
invulnerabilidad: estos son los controles aplicados y lo que falta.

## Cómo funciona el formulario

El sitio es estático: no tiene funciones de servidor, base de datos ni credenciales. Al pulsar
**"Enviar por WhatsApp"**, el navegador valida los datos, arma el mensaje y abre
`https://wa.me/526863872193?text=…` en una pestaña nueva. El mensaje **no se envía solo**: la persona lo revisa
en WhatsApp y decide si lo manda. La página no puede saber si lo envió, así que nunca muestra "enviado".

Se retiraron el 21 de noviembre de 2026 el envío automático y todo lo que lo sostenía: `/api/leads`,
`/api/twilio-status`, el adaptador de Twilio, el almacenamiento en Upstash (registro, límites e idempotencia) y
sus variables. Ya no aplican los controles de esa API (validación en servidor, límites por IP, cupo diario,
firma de callbacks).

## Controles aplicados

### Datos del formulario
- Se preparan solo en el navegador: no hay petición a ningún servidor del sitio, no se guardan en
  `localStorage` ni `sessionStorage` y no se emiten eventos de analítica (prueba E2E).
- Validación compartida (`shared/lead-schema.js`): tipos, longitudes, rangos, opciones permitidas,
  consentimiento marcado y limpieza de caracteres de control e invisibles. Con errores no se abre WhatsApp.
- El mensaje lleva solo el dato del medio elegido (correo **o** teléfono) y se codifica con
  `encodeURIComponent` (acentos, ñ, saltos de línea y signos como `&`, `#` o `+` no rompen la URL).
- El destinatario es fijo (`site.whatsapp.href`); ningún campo del formulario puede cambiarlo.
- Pestaña nueva con `noopener,noreferrer`: WhatsApp no recibe referencia a esta página.
- Campo trampa (honeypot): si se llena, no se prepara ningún mensaje.
- `SITE_MODE=demo`: no se abre WhatsApp; solo se muestra la vista previa del mensaje.

### Secretos y repositorio
- No hay secretos que manejar. `release-check` detiene el build si encuentra una variable `VITE_*` con nombre
  de secreto (terminaría en el navegador).
- `.gitignore` excluye `.env*` (salvo `.env.example`), `.vercel/`, llaves y credenciales sueltas, originales
  pesados, builds y reportes. `.env.example` sin valores reales.
- Build sin sourcemaps; prueba E2E de que el bundle no contiene nombres de variables privadas ni URLs de APIs de
  terceros.

### Transporte y headers (`vercel.json`)
- Todas las rutas: CSP sin `unsafe-inline` ni `eval` (`default-src 'self'`; scripts, estilos, fuentes,
  imágenes, conexiones y medios solo del propio origen; `object-src 'none'`; `base-uri 'self'`;
  `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests`), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva, `X-Frame-Options: DENY`,
  `Cross-Origin-Opener-Policy: same-origin`.
- Abrir `wa.me` es una navegación a otra pestaña, no una conexión desde la página: no requiere relajar la CSP.
- Inventario de recursos externos: **ninguno** (fuentes autoalojadas, sin CDNs, sin analítica, sin píxeles).
  El bloque JSON-LD es un dato, no se ejecuta.
- El HTML prerenderizado se valida en el build para que no contenga atributos `style` (compatibles con la CSP).
- HSTS: Vercel agrega por defecto `max-age=63072000` en dominios propios. No se añadió `includeSubDomains` ni
  `preload` (requieren revisar subdominios y autorización).
- Las rutas `/api/*` ya no existen: responden 404 (prueba E2E en el servidor local).

### Indexación
- Con `SITE_MODE=demo` (activo en Vercel): `noindex, nofollow` en todas las páginas y `robots.txt` con
  `Disallow: /`, sin canonical ni sitemap.
- El aviso de privacidad en borrador lleva `noindex` aunque se quite el modo demo.

## Comprobaciones realizadas (con evidencia, 21 nov 2026)

| Comprobación | Resultado |
| --- | --- |
| Pruebas unitarias (`npm test`) | Validación compartida, armado y codificación del mensaje, textos y simulador |
| Pruebas E2E (Chromium y WebKit en emulación) | Formulario por correo y por teléfono, errores que impiden abrir el chat, cero peticiones a `/api/`, sin analítica ni datos guardados, rutas antiguas con 404, modo demo solo con vista previa |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| `npm audit` (árbol completo) | 0 vulnerabilidades (21 nov 2026; sin `--force`) |
| ESLint | Sin errores |

## Hallazgos pendientes y riesgos residuales

1. **No verificado en el dominio final**: HTTPS, redirección desde HTTP, recursos mixtos y valores reales de
   headers (incluido HSTS). Comprobar con `curl -I` en `/`, `/aviso-de-privacidad` y una ruta inexistente.
2. **Teléfono físico**: abrir WhatsApp depende del dispositivo (app instalada o WhatsApp Web, bloqueador de
   ventanas). Hay un enlace de respaldo "¿No se abrió? Abrir WhatsApp". Falta probarlo en iOS y Android.
3. **Aviso de privacidad en borrador** (sin datos del responsable ni revisión legal).
4. **Dependencias**: revisar `npm audit` periódicamente. Las alertas de picomatch (solo desarrollo) que
   seguían abiertas el 17 nov 2026 ya no aparecen; no se usó `npm audit fix --force`.
5. **Vistas previas de Vercel**: mantener *Deployment Protection*.
6. **Variables antiguas en Vercel**: si alguna vez se cargaron credenciales de Twilio, Upstash o
   `LEAD_HASH_SECRET` en el proyecto, borrarlas y revocarlas en cada proveedor; ya no se usan.

## Si un secreto se expone

1. Avisar a Javier (sin pegar el secreto en chats ni tickets).
2. Revocar o rotar en el proveedor y actualizar Vercel.
3. Si llegó a Git: `.gitignore` no lo elimina del historial. Rotar primero; reescribir historial compartido
   solo con autorización.
