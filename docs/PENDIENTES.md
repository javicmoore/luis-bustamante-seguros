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

## 3. Textos

Aprobados el 23 de noviembre de 2026: Javier confirmó que todo el contenido de la página está aprobado
(`src/content/review.js`, todos en `aprobado`), incluidos el texto del aviso de privacidad y la respuesta de la FAQ
que describen el flujo de WhatsApp. Si un texto cambia después, volver a marcarlo como `pendiente` hasta que se
confirme.

## 4. Aviso de privacidad

Final desde el 23 de noviembre de 2026 (`src/content/privacy.js`, `status: 'final'`), con datos confirmados por
Javier: responsable Luis Bustamante; domicilio visible "Mexicali, Baja California, C.P. 21290" (sin calle, número
ni colonia, por decisión de Javier); solicitudes ARCO que Luis atiende personalmente por WhatsApp al
+52 686 387 2193, con identificación por videollamada y plazos de 20 y 15 días hábiles. Las conversaciones se usan
para responder y agendar; no se promete una fecha de borrado.

Recomendado (no bloquea): revisión por un abogado, en particular del domicilio completo, del nombre legal completo
y de las referencias a plazos y autoridad tras la reforma de 2025 a la ley de datos personales.

## 5. Configuración externa

El formulario prepara el mensaje de WhatsApp en el navegador (flujo definitivo desde el 21 nov 2026): no hay
servidor, almacenamiento ni credenciales que configurar. Se retiraron `/api/leads`, `/api/twilio-status`,
Twilio y Upstash.

- **Dominio propio** (pendiente): hoy `SITE_URL=https://luis-bustamante-seguros-7vt9-one.vercel.app` en Production. Al conectar el dominio en
  Vercel → Domains, cambiar `SITE_URL` y redeplegar (canonical, `og:url`, `og:image` y sitemap se regeneran).
- **Indexación**: `SITE_MODE=demo` se quitó de Production el 23 nov 2026; el sitio es indexable (`robots.txt`
  con `Allow: /` y sitemap).
- **Variables antiguas**: si en Vercel quedaron credenciales de Twilio o Upstash, borrarlas y revocarlas.
- **Medición**: no se instaló ninguna herramienta. Si se decide usar una, ver "Medición" en el README.
- **Colores**: acentos ajustados al logo real (cobre #C88040, azul acero #385870) sobre el azul #102A43.

## 6. Verificaciones antes del lanzamiento

Marcar en `src/content/launch.js` solo con evidencia. Las de fase `post-deploy` solo se comprueban con el sitio
publicado: el build de Vercel las avisa sin detenerse y se registran en cuanto termina el despliegue.

- [x] Autorización de los testimonios (confirmada por Javier el 23 nov 2026).
- [x] Headers reales en landing, aviso y 404 (23 nov 2026, URL de producción de Vercel).
- [x] HTTPS y redirección desde HTTP (23 nov 2026, 308 a https).
- [x] Indexación (23 nov 2026, producción): sin `noindex`, `robots.txt` con `Allow: /`, sitemap y canonical hacia `SITE_URL`.
- [ ] Teléfono físico (tras desplegar): "Enviar por WhatsApp" abre el chat de Luis con el mensaje correcto, sin
  enviarlo solo, y al volver los datos siguen ahí.
