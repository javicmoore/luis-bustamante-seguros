# Pendientes para el lanzamiento

`npm run check:release` lista estos puntos en vivo. Mientras haya bloqueantes, el build de **producción** en
Vercel se detiene a propósito (las vistas previas sí se despliegan). Todo el contenido se edita en
`src/content/`.

## 1. Material de Luis

| Pendiente | Qué se necesita | Dónde va |
| --- | --- | --- |
| Subtítulos del video (recomendado) | Archivo `.vtt` en español del video de presentación | `public/media/` y `video.captions` en `src/content/media.js`. El video ya está integrado; sin subtítulos, quien no puede escucharlo no accede a su contenido |
| Constancia de testimonios | Autorización por escrito de Karla G., Sergio C. y Alberto G. para publicar su testimonio con ese nombre y contexto | Los tres testimonios ya se publican (entregados por Javier el 19 oct 2026, en `src/content/testimonials.js`). Marcar `testimonios-autorizacion` en `src/content/launch.js` solo con la constancia |
| Nueva exportación del video y su miniatura | Versión con el cargo "Asesor financiero y agente de seguros" | El video lleva el logo con "Agente de seguros" como marca de agua durante toda la reproducción y en la pantalla final; la miniatura también. La identidad editable junto al video ya usa el cargo nuevo. No se tapa el contenido del video |
| Logo con el cargo nuevo (si se desea) | Versión del logotipo con "Asesor financiero y agente de seguros" | El logo original dice "Agente de seguros"; se usa tal cual en el footer, el favicon y la imagen social. El header ya muestra el cargo nuevo en texto |
| Logo en vector (opcional) | SVG del logotipo, si existe | Hoy se usa el PNG original sin fondo blanco; un SVG daría bordes más nítidos en pantallas grandes |
| Imagen publicitaria (opcional) | La pieza que inspiró el fondo del hero, si se quiere replicar con más fidelidad | No estaba en `assets-originales/`: el fondo se compuso con elementos del propio logo (barras y flecha ascendente) |

Integrados el 11 de octubre de 2026 desde `assets-originales/` (originales intactos): retrato del hero (traje
azul), retrato de "Sobre Luis" (camisa azul), logo (header, footer, favicon e imagen social). Solo recorte,
escala y compresión; sin retoque ni versiones generativas.

El 23 de octubre de 2026 la foto de "Sobre Luis" pasó a la de traje gris (`assets-originales/luis-sentado.jpeg`, original intacto; copias `luis-sobre-gris-*`).

Nunca usar fotos de terceros ni caras generadas en lugar de Luis.

### Video de presentación (integrado el 13 de octubre de 2026)

- Original sin cambios (23 oct 2026, con música): `assets-originales/luis/Luis_Bustamante_video_landing_FINAL_con_musica_v4.mp4`
  (H.264 High 3.1 + AAC estéreo, 1280×720, 30 fps, 2:58, faststart, 26.0 MB). La versión anterior (`…_web_v2.mp4`) se conserva. Ya venía listo para web, así que la copia publicada
  (`public/media/luis-presentacion.mp4`) es idéntica: recomprimir solo restaría calidad de imagen y voz.
- Miniatura original: `assets-originales/luis/Luis_Bustamante_video_landing_web_v2-miniatura.png` (1672×941).
  Póster web completo, sin recortes: `public/media/luis-presentacion-poster.jpg` (1600×900, 127 KB), con
  `npm run video:poster -- <ruta>`.
- Reproductor nativo: controles, audio, pausa y pantalla completa; `playsInline`, `preload="none"` y sin
  reproducción automática. Al abrir la página no se descarga nada del video; el póster se pide al acercarse a
  la sección y el archivo, por partes, solo al reproducir.
- Consumo: cada reproducción completa transfiere hasta 25.8 MB. Revisar el límite de transferencia del plan de
  Vercel si el tráfico crece; si hiciera falta, servir el video desde un host de video autorizado (y agregar
  su origen a `media-src` en `vercel.json`).
- Pendiente: probar reproducción, audio y pantalla completa en Safari (iPhone) y Chrome (Android).

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
- **Twilio**: cuenta, remitente de WhatsApp, plantilla aprobada (versión 4, de 7 variables con encabezado
  general "Nuevo prospecto"; no se ha creado ni aprobado), aceptación de Luis y credenciales. Guía completa en
  `docs/WHATSAPP-TWILIO.md`.
- **Medición**: no se instaló ninguna herramienta. Si se decide usar una, ver "Medición" en el README.
- **Colores**: acentos ajustados al logo real (cobre #C88040, azul acero #385870) sobre el azul #102A43.

## 6. Verificaciones antes de recibir prospectos reales

Marcar en `src/content/launch.js` solo con evidencia:

- [ ] Plantilla de WhatsApp v4 (7 variables, encabezado general) aprobada y su `HX…` en `TWILIO_CONTENT_SID`.
- [ ] Prueba autorizada de WhatsApp con datos ficticios (plantilla aprobada, aviso recibido por Luis).
- [ ] Callback de estado recibido y verificado en el dominio final.
- [ ] Headers reales comprobados en landing, aviso, 404 y API (`curl -I https://dominio/…`).
- [ ] HTTPS y redirección desde HTTP en el dominio final.
- [ ] Recorrido completo en al menos un teléfono físico (ver `docs/QA-RENDIMIENTO.md`).
