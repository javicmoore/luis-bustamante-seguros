# Pendientes para el lanzamiento

`npm run check:release` lista estos puntos en vivo. Mientras haya bloqueantes, el build de **producción** en
Vercel se detiene a propósito (las vistas previas sí se despliegan). Todo el contenido se edita en
`src/content/`.

## 1. Material de Luis

| Pendiente | Qué se necesita | Dónde va |
| --- | --- | --- |
| Retrato del hero | Foto real, vertical (4:5), 1600 px de ancho o más, buena luz, fondo que armonice con azul marino | `npm run images -- media-originales/luis-hero.jpg --name luis-hero` y pegar el resultado en `media.heroPortrait` (`src/content/media.js`) |
| Retrato de "Sobre Luis" | Segunda foto distinta (idealmente en contexto de trabajo) | Igual, en `media.aboutPortrait` |
| Logo (si existe) | Archivo original, de preferencia SVG | `public/brand/` y `site.logo` en `src/content/site.js`. Mientras tanto se usa su nombre compuesto con la tipografía, no un logotipo inventado |
| Video de presentación | MP4 H.264, horizontal 16:9, 1080p, idealmente 60–90 s, subtítulos `.vtt` y póster | `public/media/` y `video` en `src/content/media.js`. Si se decide no publicar video: `video.decision = 'omitir'` |
| Testimonios | Testimonios reales con autorización por escrito: texto, nombre como desean aparecer y contexto opcional | `src/content/testimonials.js` con `authorized: true` y referencia de la autorización. Si se publica sin ellos: `testimonialsDecision = 'omitir'` |
| Imagen social | Versión de `public/og/og-default.png` con un retrato real (1200×630) | Reemplazar el archivo (hoy es tipográfica y provisional) |

Nunca usar fotos de terceros ni caras generadas en lugar de Luis.

## 2. Marcas del carrusel

Integradas el 3 de octubre de 2026 con los logos entregados por Javier en `assets-originales/logos-marcas/`
(originales intactos): Allianz, Zurich, Skandia, Insignia Life, La Latino Seguros y MAPFRE, con el título
"Marcas con las que trabajo". Las copias web están en `public/brands/` y se regeneran con `npm run logos`
(solo se recorta el margen transparente). Para agregar o quitar marcas: `src/content/brands.js`.

## 3. Textos por validar con Luis

Listados en `src/content/review.js` (cambiar `status` a `'aprobado'` cuando Luis los confirme o ajustarlos):

- Título y descripción del hero.
- Beneficios y descripción de cada familia de servicios.
- Párrafo sobre su forma de trabajar ("Sobre Luis").
- Título del formulario, texto de autorización y nota breve de privacidad.
- FAQ: atención a distancia por teléfono o WhatsApp; el costo del producto se revisa antes de decidir; qué pasa
  al enviar el formulario; revisión de seguros o ahorros que ya se tienen; información sugerida.

Datos ya confirmados y usados: nombre, actividad, Mexicali, alcance nacional, teléfono/WhatsApp
686 387 2193, Instagram, servicios y cotización/asesoría gratuitas.

## 4. Aviso de privacidad

Está en **borrador** (con marcas `[Pendiente: …]` visibles y `noindex`). En `src/content/privacy.js` faltan:

- Nombre legal completo del responsable.
- Domicilio para efectos del aviso.
- Medio para ejercer derechos ARCO y revocar el consentimiento, con procedimiento y plazos.
- Plazo de conservación una vez que Luis atiende la solicitud.
- Confirmación de proveedores (Vercel, Upstash, Twilio) y revisión legal.

Al terminar: `status: 'final'` y `updatedAt: 'AAAA-MM-DD'`.

## 5. Configuración externa

- **Dominio definitivo** → `SITE_URL=https://…` en Vercel (activa canonical, `og:url`, `og:image` absoluta,
  sitemap y la URL del callback).
- **Upstash Redis** desde Vercel Marketplace (crea `KV_REST_API_URL` y `KV_REST_API_TOKEN`).
- **`LEAD_HASH_SECRET`**: cadena aleatoria de 32+ caracteres (ver `.env.example`).
- **Twilio**: cuenta, remitente de WhatsApp, plantilla aprobada, aceptación de Luis y credenciales. Guía completa
  en `docs/WHATSAPP-TWILIO.md`.
- **Medición**: no se instaló ninguna herramienta. Si se decide usar una, ver "Medición" en el README.
- **Colores**: confirmar la paleta (#102A43, #FFFFFF, #F5F7F9, #C69A49) cuando exista el logo original.

## 6. Verificaciones antes de recibir prospectos reales

Marcar en `src/content/launch.js` solo con evidencia:

- [ ] Prueba autorizada de WhatsApp con datos ficticios (plantilla aprobada, aviso recibido por Luis).
- [ ] Callback de estado recibido y verificado en el dominio final.
- [ ] Headers reales comprobados en landing, aviso, 404 y API (`curl -I https://dominio/…`).
- [ ] HTTPS y redirección desde HTTP en el dominio final.
- [ ] Recorrido completo en al menos un teléfono físico (ver `docs/QA-RENDIMIENTO.md`).
