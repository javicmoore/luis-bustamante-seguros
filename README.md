# Landing de Luis Bustamante

Sitio de captación para Luis Bustamante, agente de seguros y asesor financiero en Mexicali, B.C., con asesoría
para todo México. React 19 + Vite 8, HTML prerenderizado y funciones de Vercel para el formulario.

> **Estado: versión de trabajo. No está lista para recibir prospectos reales.** El envío a WhatsApp funciona
> solo con el proveedor simulado; faltan fotos, marcas confirmadas, video, testimonios, datos del aviso de
> privacidad, dominio y la configuración de Twilio/Upstash. Ver [`docs/PENDIENTES.md`](docs/PENDIENTES.md) o
> ejecutar `npm run check:release`.

## Qué incluye

Header flotante y diez bloques, en este orden: 1) Hero, 2) carrusel de marcas, 3) simulador de ahorro y retiro,
4) formulario de asesoría, 5) beneficios y servicios, 6) Sobre Luis, 7) video, 8) testimonios, 9) FAQ,
10) footer; además del aviso de privacidad (`/aviso-de-privacidad`) y una página 404.

En producción, marcas, video y testimonios **solo aparecen con contenido real y autorizado**. En
`npm run dev` se ven sus espacios con el pendiente identificado (fixtures "DEMO" en el carrusel).

## Requisitos

- Node.js 20.19 o superior (probado con Node 24.20 y npm 11.19).
- Windows con PowerShell (los comandos funcionan igual en macOS/Linux).

> **Recomendación:** el proyecto está dentro de OneDrive. `node_modules` tiene miles de archivos y OneDrive los
> sincroniza, lo que vuelve lenta la PC y las pruebas. Mejor moverlo a una carpeta fuera de OneDrive, por
> ejemplo `C:\dev\luis-bustamante`, y ejecutar `npm install` ahí.

## Comandos (PowerShell)

```powershell
npm install                 # instalar dependencias
npm run dev                 # desarrollo en http://localhost:5173 (muestra pendientes)
npm run build               # build de producción en dist/ (con prerender)
npm run preview:demo        # sirve dist/ en http://127.0.0.1:4173 con el proveedor SIMULADO
npm run check:release       # lista bloqueantes de lanzamiento
npm test                    # pruebas unitarias (Vitest)
npx playwright install chromium   # solo la primera vez
npm run test:e2e            # pruebas E2E (levanta preview y dev si no están corriendo)
npm run lint                # ESLint
npm run qa:screens          # capturas en 6 anchos -> qa-output/
npm run qa:states           # capturas de menú, formulario, diálogo, páginas
npm run qa:perf             # mediciones de carga y scroll (indicativas)
npm run qa:hydration        # verifica la hidratación con React en modo desarrollo
```

Para que el formulario funcione en `npm run dev` sin credenciales, crea un archivo `.env.local` (no se versiona)
con:

```
LEAD_PROVIDER=mock
```

o define la variable solo para esa terminal: `$env:LEAD_PROVIDER = 'mock'; npm run dev`.
El modo simulado muestra "Modo demostración" al enviar y **no envía nada**. Con
`MOCK_NOTIFY_OUTCOME=failed`, `uncertain` o `slow` se simulan fallo, resultado incierto o respuesta lenta.

Probar en un teléfono de la misma Wi-Fi: `npm run build` y `npm run preview:demo -- --host`, luego abrir la URL
de red que aparece (detalles en [`docs/QA-RENDIMIENTO.md`](docs/QA-RENDIMIENTO.md)).

## Estructura

```
api/                 Funciones de Vercel: leads.js (formulario) y twilio-status.js (callback firmado)
backend/             Lógica del servidor: validación HTTP, idempotencia, límites, Upstash, adaptador Twilio
shared/              Esquema de validación compartido por formulario y servidor
src/content/         TODO el contenido editable: textos, contacto, marcas, medios, FAQ, aviso, pendientes
src/components/      Componentes por bloque (cada uno con su CSS)
src/styles/          Fuentes, tokens de diseño y estilos base
scripts/             Prerender, revisión de lanzamiento, imágenes, servidor local y QA
public/              Fuentes (OFL), favicon e imagen social provisional
tests/unit, tests/e2e
docs/                Pendientes, WhatsApp/Twilio, seguridad y registro de QA
```

## Editar contenido

- Textos: `src/content/copy.js`, `services.js`, `faq.js`. Los que Luis debe aprobar están en `review.js`.
- Contacto e identidad: `src/content/site.js` (teléfono vigente 686 330 3727, Instagram).
- Fotos: `npm run images -- media-originales/luis-hero.jpg --name luis-hero` (genera AVIF/WebP/JPG en
  `public/media/` sin metadatos) y pegar el resultado en `src/content/media.js`. Los originales van en
  `media-originales/`, que no se versiona ni se publica.
- Marcas: `src/content/brands.js`. Originales en `assets-originales/logos-marcas/`; copias web con `npm run logos`.
- Video y testimonios: `src/content/media.js` y `src/content/testimonials.js`.
- Aviso de privacidad: `src/content/privacy.js` (borrador hasta completar datos y revisión legal).
- Favicon e imagen social provisional: `npm run brand:assets` (requiere Playwright Chromium).

## Variables de entorno

Todas son privadas del servidor (sin prefijo `VITE_`; una variable `VITE_*` terminaría en el navegador). Lista
y formato en [`.env.example`](.env.example) y [`docs/WHATSAPP-TWILIO.md`](docs/WHATSAPP-TWILIO.md).

| Variable | Obligatoria en producción | Para qué |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET` | sí | Crear el mensaje |
| `TWILIO_AUTH_TOKEN` | sí (callback) | Verificar firmas de Twilio |
| `TWILIO_WHATSAPP_FROM`, `TWILIO_CONTENT_SID` | sí | Remitente y plantilla aprobada |
| `LEAD_NOTIFICATION_TO` | sí | WhatsApp de Luis |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` (o `KV_REST_API_*`) | sí | Registro, límites e idempotencia |
| `LEAD_HASH_SECRET` | sí | Seudónimos HMAC |
| `SITE_URL` | al tener dominio | Canonical, og:url, og:image, sitemap y callback |
| `LEAD_RETENTION_DAYS`, `LEAD_DAILY_CAP`, `ALLOWED_ORIGINS` | no | Ajustes (30 días, 50/día) |
| `RELEASE_CHECK=warn` | no | Decisión explícita de desplegar producción con pendientes |

## Git y GitHub

Git ya está inicializado en esta carpeta (rama `main`, **sin commits**). Cuando Javier lo autorice:

```powershell
git status                      # confirmar que no aparece ningún .env ni archivo con secretos
git add -A
git commit -m "Landing de Luis Bustamante: versión de trabajo"
# Crear un repositorio PRIVADO vacío en GitHub y luego:
git remote add origin https://github.com/<usuario>/<repositorio>.git
git push -u origin main
```

Antes de cada commit: `git status` y `git diff --cached` para revisar que no haya secretos. `.gitignore` no
borra un secreto que ya se haya versionado: si ocurre, rotarlo primero (ver `docs/SEGURIDAD.md`).

## Despliegue en Vercel

1. Vercel → *Add New Project* → importar el repositorio de GitHub. `vercel.json` ya define build
   (`npm run build:vercel`), salida (`dist`), funciones (`api/*.js`, 15 s máx.), `cleanUrls` y headers.
2. *Storage / Marketplace* → agregar **Upstash Redis** al proyecto (crea `KV_REST_API_URL` y
   `KV_REST_API_TOKEN`). Elegir una región cercana a la de las funciones.
3. *Settings → Environment Variables*: agregar las variables privadas (Production y, si se usa, Preview).
4. *Settings → Deployment Protection*: mantener protegidas las vistas previas.
5. *Settings → Domains*: conectar el dominio definitivo y definir `SITE_URL=https://ese-dominio`.
6. Desplegar. Mientras `npm run check:release` tenga bloqueantes, **el build de producción se detiene a
   propósito**; las vistas previas sí se publican. Para forzar producción con pendientes (decisión explícita),
   definir `RELEASE_CHECK=warn`.
7. Comprobar headers reales: `curl.exe -I https://dominio/`, `.../aviso-de-privacidad`, una ruta inexistente y
   `curl.exe -I -X POST https://dominio/api/leads`.

**Reversión:** Vercel → *Deployments* → elegir el despliegue anterior → *Promote to Production* (o
*Instant Rollback*). En Git: `git revert <commit>`.

## Medición

No hay Analytics ni píxeles instalados. El sitio emite eventos sin datos personales (`window.dataLayer` si
existe y el evento `lb:analytics`):

| Evento | Cuándo |
| --- | --- |
| `page_view` | Al cargar una página |
| `simulator_interaction` | Primera interacción con el simulador (`control`) |
| `lead_form_attempt` | Envío con datos válidos (antes de la respuesta) |
| `lead_submitted` | Solo cuando el servidor registró la solicitud (`notification: accepted/pending`) |

Si se instala una herramienta, usar un ID real, agregar su dominio a la CSP de `vercel.json` y revisar el
aviso de privacidad.

## Decisiones de diseño y movimiento

- Dirección editorial: azul profundo como ancla (#102A43), blancos y niebla (#F5F7F9), dorado (#C69A49) solo en
  detalles; texto dorado sobre fondo claro con un tono más oscuro (#8C6A2E) para cumplir contraste.
- Tipografía: Fraunces (títulos, 600 y 500 itálica) y Manrope (lectura, variable), autoalojadas (~66 KB),
  precargadas y con `font-display: optional` para que no haya cambios visibles de fuente.
- Composiciones distintas por bloque: hero oscuro con retrato en arco y tarjetas flotantes inclinadas;
  simulador como instrumento (controles claros + resultados oscuros); formulario en tarjeta blanca sobre azul;
  beneficios como lista editorial numerada y servicios en mosaico de tarjetas ilustradas con ligera inclinación;
  Sobre Luis con retrato desplazado y datos en lista.
- Movimiento: entrada del hero en CSS (600–900 ms, sin intro); secciones que aparecen una vez al acercarse;
  transiciones cortas en el gráfico; header que cambia de superficie con un observador (sin escuchar scroll);
  carrusel lento con pausa. Con movimiento reducido no hay animaciones.
- Sin retratos todavía: se muestra un monograma "LB" provisional (nunca una cara de stock o generada).
