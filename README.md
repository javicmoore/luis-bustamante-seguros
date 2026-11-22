# Landing de Luis Bustamante

Sitio de captación para Luis Bustamante, agente de seguros y asesor financiero en Mexicali, B.C., con asesoría
para todo México. React 19 + Vite 8 y HTML prerenderizado; sitio estático, sin funciones de servidor.

El formulario prepara en el navegador un mensaje para el WhatsApp de Luis y lo abre en una pestaña nueva; la
persona lo revisa y decide si lo envía. No hay API, base de datos ni credenciales.

> **Estado: versión de trabajo, publicada como demo (`SITE_MODE=demo`, `noindex`).** Faltan la constancia de
> autorización de los testimonios, datos del aviso de privacidad, dominio y aprobación de textos. Ver
> [`docs/PENDIENTES.md`](docs/PENDIENTES.md) o ejecutar `npm run check:release`.

## Qué incluye

Header flotante y diez bloques, en este orden (21 oct 2026): 1) Hero, 2) carrusel de marcas, 3) simulador de ahorro y retiro,
4) formulario de asesoría, 5) Sobre Luis, 6) video ("Conoce a Luis"), 7) testimonios, 8) beneficios (con las
tarjetas de servicios), 9) FAQ, 10) footer; además del aviso de privacidad (`/aviso-de-privacidad`) y una página 404.

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
npm run preview:demo        # sirve dist/ en http://127.0.0.1:4173 con los headers de vercel.json
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

El formulario no necesita configuración: funciona igual en `npm run dev` y en el build. Con un build hecho con
`SITE_MODE=demo` solo muestra la vista previa del mensaje; sin ella abre el chat de Luis en WhatsApp (sin
enviarlo: la persona decide).

Probar en un teléfono de la misma Wi-Fi: `npm run build` y `npm run preview:demo -- --host`, luego abrir la URL
de red que aparece (detalles en [`docs/QA-RENDIMIENTO.md`](docs/QA-RENDIMIENTO.md)).

## Estructura

```
shared/              Validación del formulario, países y reglas telefónicas
src/content/         TODO el contenido editable: textos, contacto, marcas, medios, FAQ, aviso, pendientes
src/components/      Componentes por bloque (cada uno con su CSS)
src/styles/          Fuentes, tokens de diseño y estilos base
scripts/             Prerender, revisión de lanzamiento, imágenes, servidor local y QA
public/              Fuentes (OFL), logo (brand/), fotos (media/), logos de marcas, favicon e imagen social
tests/unit, tests/e2e
docs/                Pendientes, demo, seguridad y registro de QA
```

## Editar contenido

- Textos: `src/content/copy.js`, `services.js`, `faq.js`. Los que Luis debe aprobar están en `review.js`.
- Contacto e identidad: `src/content/site.js` (teléfono vigente 686 387 2193, Instagram).
- Fotos y logo de Luis: originales en `assets-originales/` (`luis-hero.png`, `luis.png`,
  `Luis Bustamante Logo.png`), intactos. `npm run luis:assets` genera las versiones web en `public/media/`
  y `public/brand/` (AVIF/WebP/JPG sin metadatos; solo recorte, escala y compresión, sin retoque ni versiones
  generativas; al logo solo se le quita el fondo blanco). Datos de cada imagen en `src/content/media.js` y
  `site.logo`. Para otra foto: `npm run images -- ruta/foto.jpg --name nombre`.
- Marcas: `src/content/brands.js`. Originales en `assets-originales/logos-marcas/`; copias web con `npm run logos`.
- Video y testimonios: `src/content/media.js` y `src/content/testimonials.js`.
- Aviso de privacidad: `src/content/privacy.js` (borrador hasta completar datos y revisión legal).
- Favicon, íconos e imagen social: `npm run brand:assets` (isotipo, logo y foto reales; requiere Playwright
  Chromium).

## Variables de entorno

No hay credenciales. Ninguna variable lleva el prefijo `VITE_` (una variable `VITE_*` terminaría en el
navegador). Lista en [`.env.example`](.env.example).

| Variable | Para qué |
| --- | --- |
| `SITE_MODE=demo` | Demo de revisión: vista previa del mensaje en vez de abrir WhatsApp, aviso visible y `noindex` (activa hoy) |
| `SITE_URL` | Al tener dominio: canonical, og:url, og:image y sitemap |
| `RELEASE_CHECK=warn` | Decisión explícita de desplegar producción con pendientes |

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
   (`npm run build:vercel`), salida (`dist`), `cleanUrls` y headers.
2. *Settings → Deployment Protection*: mantener protegidas las vistas previas.
3. *Settings → Domains*: conectar el dominio definitivo y definir `SITE_URL=https://ese-dominio`.
4. Desplegar. Mientras `npm run check:release` tenga bloqueantes, **el build de producción se detiene a
   propósito**; las vistas previas sí se publican. Para publicar una **demo de revisión** (vista previa del
   mensaje, aviso visible, `noindex`) definir `SITE_MODE=demo`: ver [`docs/DEMO.md`](docs/DEMO.md). Para forzar producción con pendientes (decisión explícita),
   definir `RELEASE_CHECK=warn`.
5. Comprobar headers reales: `curl.exe -I https://dominio/`, `.../aviso-de-privacidad` y una ruta inexistente.

**Reversión:** Vercel → *Deployments* → elegir el despliegue anterior → *Promote to Production* (o
*Instant Rollback*). En Git: `git revert <commit>`.

## Medición

No hay Analytics ni píxeles instalados. El sitio emite eventos sin datos personales (`window.dataLayer` si
existe y el evento `lb:analytics`):

| Evento | Cuándo |
| --- | --- |
| `page_view` | Al cargar una página |
| `simulator_interaction` | Primera interacción con el simulador (`control`) |

El formulario no emite eventos: la página no puede saber si la persona envió el mensaje en WhatsApp y los datos
no deben salir del navegador. Si se instala una herramienta, usar un ID real, agregar su dominio a la CSP de `vercel.json` y revisar el
aviso de privacidad.

## Decisiones de diseño y movimiento

- Dirección editorial: azul profundo como ancla (#102A43), blancos y niebla (#F5F7F9) y los colores del logo
  real: cobre (#C88040) en detalles y botones sólidos sin brillo (texto #081018, 4.9:1) y azul acero (#385870);
  texto cobre sobre fondo claro con un tono más oscuro (#8F5420) para cumplir contraste.
- Tipografía: Fraunces (títulos, 600 y 500 itálica) y Manrope (lectura, variable), autoalojadas (~66 KB),
  precargadas y con `font-display: optional` para que no haya cambios visibles de fuente.
- Composiciones distintas por bloque: hero azul profundo con la foto de Luis en arco, gráficos financieros
  discretos (barras, cuadrícula y línea ascendente con movimiento suave) y tarjetas flotantes inclinadas en
  escritorio (en móvil y tableta la foto queda limpia, con el nombre debajo como texto);
  simulador como instrumento (controles claros + resultados oscuros); formulario en tarjeta blanca sobre azul;
  beneficios como lista editorial numerada y servicios en mosaico de tarjetas ilustradas con ligera inclinación;
  Sobre Luis con retrato y presentación; "Conoce a Luis" (video de presentación) en azul profundo, con el medio
  en su proporción original.
- Movimiento: entrada del hero en CSS (600–900 ms, sin intro); secciones que aparecen una vez al acercarse;
  transiciones cortas en el gráfico; header que cambia de superficie con un observador (sin escuchar scroll);
  carrusel lento con pausa. Con movimiento reducido no hay animaciones.
- Retratos reales de Luis: traje azul en el hero (prioritario, `fetchpriority="high"`) y camisa azul en
  "Sobre Luis" (diferido). Logo real: isotipo + nombre en HTML en el header y logo completo sobre placa blanca
  en el footer (sus letras son oscuras y no se leerían sobre azul).
