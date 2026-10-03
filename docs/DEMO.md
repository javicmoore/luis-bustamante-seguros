# Despliegue de demostración (`SITE_MODE=demo`)

Sirve para revisar diseño, botones y carrusel en Vercel **antes** de conectar Twilio. No es el lanzamiento.

## Qué cambia con `SITE_MODE=demo`

- **Aviso fijo en todas las páginas**: "Versión de demostración. El formulario no envía datos y Luis no recibe
  solicitudes desde este sitio."
- **Formulario**: valida igual, pero al enviar **no hace ninguna petición** al servidor. Muestra "Formulario de
  demostración: no se envió nada… Luis no recibió ninguna solicitud", sin folio ni mensaje de recepción. No se
  registra la conversión.
- **Servidor**: `/api/leads` y `/api/twilio-status` responden 503 sin leer el cuerpo, sin guardar nada y sin
  notificar (defensa adicional por si alguien llama a la API directamente).
- **Indexación**: `noindex` en todas las páginas y `robots.txt` con `Disallow: /`; sin canonical ni sitemap.
- **Verificación de lanzamiento**: `npm run build:vercel` informa los pendientes pero no detiene el build.
  Sin `SITE_MODE`, el build de producción **sigue bloqueado** mientras haya pendientes.

No se necesitan credenciales ni almacenamiento: el modo demo no usa Twilio ni Upstash.

## Variables en Vercel para la demo

Settings → Environment Variables, entorno **Production** (la rama `main` despliega a producción):

| Variable | Valor |
| --- | --- |
| `SITE_MODE` | `demo` |

No definas `LEAD_PROVIDER`, `RELEASE_CHECK`, `SITE_URL` ni ninguna credencial de Twilio o Upstash para la
demo. Después de agregar la variable, vuelve a desplegar (Deployments → Redeploy, o un nuevo push).

## Pasar al lanzamiento real

1. Eliminar `SITE_MODE` en Vercel.
2. Configurar las variables privadas de `docs/WHATSAPP-TWILIO.md` y `SITE_URL`.
3. Resolver los bloqueantes de `npm run check:release` y redeplegar.

## Probar la demo en local

```powershell
$env:SITE_MODE = 'demo'; npm run build; npm run preview:demo
$env:E2E_DEMO = '1'; npx playwright test tests/e2e/demo.spec.js
Remove-Item Env:SITE_MODE, Env:E2E_DEMO
```
