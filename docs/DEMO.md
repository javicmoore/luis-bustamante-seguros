# Despliegue de demostración (`SITE_MODE=demo`)

Sirve para revisar el sitio en Vercel antes del lanzamiento. No es el lanzamiento.

## Qué cambia con `SITE_MODE=demo`

- **Aviso fijo en todas las páginas**: "Versión de demostración. El formulario no envía datos y Luis no recibe
  solicitudes desde este sitio."
- **Formulario**: valida igual, pero al pulsar "Enviar por WhatsApp" **no abre WhatsApp**: muestra la vista
  previa del mensaje que se prepararía para Luis. Sin la demo, el mismo botón abre el chat de Luis con ese mensaje
  (la persona decide si lo envía). En ningún caso hay peticiones a un servidor.
- **Indexación**: `noindex` en todas las páginas y `robots.txt` con `Disallow: /`; sin canonical ni sitemap.
- **Verificación de lanzamiento**: `npm run build:vercel` informa los pendientes pero no detiene el build.
  Sin `SITE_MODE`, el build de producción **sigue bloqueado** mientras haya pendientes.

El sitio no usa credenciales ni almacenamiento, con o sin demo.

## Variables en Vercel para la demo

Settings → Environment Variables, entorno **Production** (la rama `main` despliega a producción):

| Variable | Valor |
| --- | --- |
| `SITE_MODE` | `demo` |

No definas `RELEASE_CHECK` ni `SITE_URL` para la demo. Después de agregar la variable, vuelve a desplegar (Deployments → Redeploy, o un nuevo push).

## Pasar al lanzamiento real

1. Resolver los bloqueantes de `npm run check:release` (aviso de privacidad, textos, dominio, indexación).
2. Definir `SITE_URL` con el dominio definitivo.
3. Eliminar `SITE_MODE` en Vercel y redeplegar. Al quitarlo, el sitio deja de llevar `noindex`.

## Probar la demo en local

```powershell
$env:SITE_MODE = 'demo'; npm run build; npm run preview:demo
$env:E2E_DEMO = '1'; npx playwright test tests/e2e/demo.spec.js
Remove-Item Env:SITE_MODE, Env:E2E_DEMO
```
