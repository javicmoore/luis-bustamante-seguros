# Registro de pruebas: móvil, fluidez y rendimiento

Versión evaluada: build de producción del 3 de octubre de 2026 (`npm run build`, prerender incluido), servido
con `npm run preview:demo` (headers de `vercel.json`, proveedor simulado). Bloques en desarrollo
(`npm run dev`): carrusel con fixtures, video y testimonios pendientes.

Entorno: Windows 11, Intel Celeron N4020 (1.1 GHz), 3.8 GB de RAM, GPU Intel UHD 600; Node 24.20;
Chromium 153 (Playwright 1.63) en modo headless. **No se probó en un teléfono físico ni en Safari/Firefox.**

## Tamaños y modos probados

| Viewport | Modo | Resultado |
| --- | --- | --- |
| 320×568, 375×667, 390×844 | móvil táctil (emulado) | sin scroll horizontal, CTA del hero dentro del primer viewport, sin texto oculto tras recorrer |
| 768×1024 | tableta | ídem; header con CTA, servicios en 2 columnas |
| 1366×768, 1920×1080 | escritorio | ídem; título del hero en 3 líneas, primer viewport completo |
| 740×360 | móvil horizontal | CTA del header visible; título reducido para pantallas bajas |
| Los seis anchos | `prefers-reduced-motion: reduce` | todo visible sin animaciones; carrusel como lista estática (desarrollo) |

Revisión visual (capturas en `qa-output/`, no versionadas): primera pantalla, formulario en estados vacío,
con errores, fallo y recibido; diálogo de privacidad; menú móvil; aviso de privacidad; 404; página completa en
móvil y escritorio. También se probó el camino de **fotos reales** con imágenes sintéticas temporales (sin
rostros): `<picture>` AVIF/WebP, tamaño correcto por ancho y densidad, retrato como elemento LCP con
`fetchpriority="high"` y sin violaciones de CSP. Las imágenes de prueba se eliminaron.

## Pruebas automatizadas

- `npm test`: 80/80 (cálculo del simulador, validación, API, idempotencia, límites, Twilio, callbacks, Upstash).
- `npm run test:e2e`: 37/37 (estructura y orden, teléfonos, rutas directas, 404, seis anchos, header, anclas,
  menú móvil, foco, simulador con tasa cero/aportación cero/plazos límite/teclado, FAQ, movimiento reducido,
  CSP, bundle sin secretos, formulario: errores, consentimiento, recibido, doble clic, fallo del proveedor con
  reintento idempotente, cambio de datos, red caída, 429, resultado incierto, respuesta no válida, diálogo de
  privacidad sin perder datos, header y barra de contacto con teclado móvil; carrusel: duplicados fuera del
  árbol accesible, pausa por foco/hover/botón, loop, alturas).
- `npm run qa:hydration`: sin advertencias de hidratación en las tres páginas (React en modo desarrollo).

## Mediciones (Chromium headless con GPU real, CDP)

Son indicativas y variaron bastante entre corridas en este equipo (OneDrive sincronizaba en segundo plano).

| Perfil | FCP | LCP | CLS | Transferido |
| --- | --- | --- | --- | --- |
| Móvil 390×844, DPR 2, red "4G lenta" (150 ms, 1.6 Mbps), CPU ×1–×4 | 2.3–3.6 s | 2.3–4.0 s | 0 | 180 KB, 8 peticiones |
| Escritorio 1366×768, red 4G (60 ms, 9 Mbps), CPU ×1–×4 | 0.78–1.25 s | igual al FCP | 0 | 180 KB |

Scroll completo (bajada y subida rápida, ~2200 px/s), GPU real:
- Mediana 16.7 ms por frame y p95 16.8 ms en todos los perfiles; **sin tareas largas** en el hilo principal.
- En la primera pasada con cachés frías aparecen de 1 a 9 frames de 100–200 ms (raster inicial de secciones a
  densidad 2 en una GPU de gama baja). En pasadas posteriores: 0 frames sobre 33 ms en la mayoría de corridas.

Carrusel (desarrollo): ~35 px/s en 375 y 1920 px; 5 y 2 vueltas completas observadas (acelerado ×8 solo para
medir) con error de continuidad en el reinicio de 0.06 px y 0.01 px; la pausa mantiene la posición exacta.

## Ajuste del 3 de octubre: botones dorados y carrusel con logos reales

- Botones dorados sin sombra ni filtros en reposo, hover y active (prueba E2E); foco visible con contorno.
- Carrusel con los seis logos: cargados (sin errores 404), alt correctos, copias ocultas al lector de pantalla,
  proporciones intactas (desviación < 3 %), sin scroll horizontal a 320/375/390 px y en escritorio.
- Fluidez (emulado, GPU real, 10 s a velocidad real): 0 frames > 33 ms y sin tareas largas a 320, 375 y
  390 px (CPU ×4) y en 1366 px (CPU ×1); en 1366 px con CPU ×4, 5 frames lentos al inicio. Loop: error al
  reiniciar 0.03–0.08 px, ~35 px/s. Una corrida previa con pausas de 0.8–1 s no se repitió (equipo ocupado).
- Corregido: los logos fuera de pantalla usaban carga diferida y podían aparecer de golpe en móvil; ahora se
  cargan de inmediato con prioridad baja.
- No probado en teléfono físico.

## Carrusel en teléfono real (reporte del 3 de octubre)

Reporte: en la demo, el carrusel no se veía en un teléfono real. No se reprodujo en emulación (Chromium ni
WebKit, el motor de Safari), así que se corrigieron las causas probables que la emulación no detecta:
- `mask-image` sobre contenido animado (fallo conocido de Safari en iOS) → reemplazado por degradados
  superpuestos.
- Capa animada de ~1,800 px de CSS (≈5,400 px a densidad 3) → ahora se anima cada juego por separado
  (capas de la mitad de ancho; separación medida entre juegos: 0 px).
- WebP sin respaldo (iOS < 14) → `<picture>` con PNG de respaldo.
- Movimiento reducido: la lista estática no se acomodaba en varias líneas y recortaba logos → corregido;
  prueba E2E que exige los seis logos completos dentro de la pantalla a 320/375/390/1366 px.
Pendiente: confirmación en el teléfono real tras el despliegue.

## Ajuste del 11 de octubre: fotos y logo reales, simulador e interés del formulario

Comprobado sobre el build de demostración (`SITE_MODE=demo`) con **emulación** en Chromium y WebKit
(Playwright, Windows); no sustituye la prueba en teléfono físico ni permite afirmar fluidez sin tirones.

| Comprobación | Chromium | WebKit |
| --- | --- | --- |
| 320, 375, 390 y 1366 px: sin scroll horizontal; CTA del hero en la primera pantalla; foto sin tapar título ni CTA | ✓ | ✓ |
| Imágenes: retrato del hero `eager` + `fetchpriority="high"`, el resto `lazy`; todas con `width`/`height`; AVIF según ancho y densidad (p. ej. 720 w a 390 px ×2, 480 w en escritorio) | ✓ | ✓ |
| Logo: isotipo + nombre en HTML en el header (29–32 px de alto), logo completo sobre placa blanca en el footer | ✓ | ✓ |
| Fondo del hero: la línea se dibuja y el conjunto flota con movimiento normal; estático con movimiento reducido | ✓ | ✓ |
| Carrusel: animado con movimiento normal; lista estática con movimiento reducido | ✓ | ✓ |
| Pregunta de interés: aparece en ambas ramas, sin desbordar a 320 px y sin tomar el foco | ✓ | ✓ |

- Unitarias (`npm test`): 101/101, incluidas combinaciones de interés permitidas y rechazadas, encabezados del
  aviso para cada interés, mínimo de $2,000 aplicado al cálculo y 8 variables limpias para WhatsApp.
- E2E (`npm run test:e2e`): 50/50 en dos corridas seguidas (más 3 de demostración con `E2E_DEMO=1`); la
  prueba de la pregunta de interés también pasa en WebKit.
- Hidratación sin advertencias (normal y demo); `npm audit`: 0 vulnerabilidades.
- Corregido en esta ronda: a 320×568 el CTA del hero quedaba justo en el borde (espaciado compacto en
  teléfonos bajos) y el foco tras un envío podía perderse si el resultado aún no estaba montado (ahora se
  aplica en un efecto).
- En WebKit, como en Safari, un clic en un radio no lo enfoca; el foco tampoco pasa a la nueva pregunta.

## Ajuste del 11 de octubre (2): hero y header en móvil

Build de demostración, **emulación** en Chromium y WebKit a 320, 375, 390 y 414 px, con movimiento normal y
reducido (16 combinaciones), con capturas de viewport al inicio y durante el scroll.

- Retrato: sin tarjetas encima (la de llamada se oculta por debajo de 1024 px; el nombre y la especialidad
  quedan debajo como texto); muestreo de puntos sobre la foto sin ningún elemento ajeno; marco y gráficos
  atenuados.
- Header: al desplazarse es una franja blanca opaca de borde a borde; la región del header es idéntica píxel
  a píxel sobre el simulador, el formulario y la FAQ. Antes era 97 % opaca y el contenido se veía por el
  hueco bajo el aviso. Cambia de estado a los 8 px de scroll, antes de que el contenido llegue debajo.
- Aviso de demo: medía 63 px con 54 reservados; ahora 56/56 con 10 px de separación. Con texto al 150 % el
  espacio reservado se ajusta a la altura real (84–107 px) y el botón de menú sigue visible.
- Sin scroll horizontal; destinos del menú con el título debajo del header (en "Sobre Luis" a 320/375 px
  el título queda bajo la foto de esa sección, que va primero en móvil; la sección empieza a la vista).
- Escritorio (1024, 1366 y 1920 px): misma geometría y estilos calculados en 162 elementos del aviso, header
  y hero, comparados contra el build anterior.

## Ajuste del 13 de octubre: "Sobre Luis", "Conoce a Luis", espaciado y redacción

Build de demostración, **emulación** en Chromium y WebKit a 320, 375, 390, 768 y 1366 px, con movimiento normal
y reducido (20 combinaciones), con recorrido completo de la página en capturas de viewport.

- "Sobre Luis" sin las cuatro filas de datos (retiradas del componente y del contenido); foto, presentación y
  contacto intactos.
- "Conoce a Luis" justo después de "Sobre Luis": foto de traje azul completa (diferencia de proporción menor
  a 0.002), 380 px de ancho en escritorio y el ancho disponible en móvil; etiqueta "Video de presentación
  próximamente" debajo; ningún control ni botón. La imagen es diferida y reutiliza el archivo del hero: la
  carga inicial pide las mismas imágenes que antes (logo, retrato del hero, marcas y avatar).
- Espaciado: entre secciones, de 144 a 159 px en móvil, de 188 a 203 en tableta y de 259 a 270 en escritorio,
  bajó a 113 a 127, 146 a 155 y 200 a 210 (escala `--section-y` y `--block-y`). Sin huecos internos
  injustificados.
- Apariciones: ningún elemento invisible en pantalla durante el recorrido ni al llegar por anclas (el
  contenido de la sección de destino se muestra mientras se desplaza); con movimiento reducido todo es
  visible desde el inicio.
- Sin guiones largos como puntuación en los textos de las tres páginas (prueba E2E y unitaria).

## Video de presentación integrado (13 de octubre)

**Emulación** en el build de demostración; no sustituye la prueba en teléfonos físicos.

| Comprobación | Chromium | Chrome | WebKit (Windows) |
| --- | --- | --- | --- |
| Al abrir la página no se pide el video ni el póster | ✓ | ✓ | ✓ |
| Póster completo (1600×900) al acercarse; caja 16:9 reservada antes de reproducir | ✓ | ✓ | ✓ |
| Controles nativos, `playsInline`, `preload="none"`, sin autoplay ni silencio forzado | ✓ | ✓ | ✓ |
| Reproduce al pedirlo el visitante, imagen 1280×720 y audio decodificado | ✓ | ✓ | imagen ✓, audio no medible |
| Pausa y pantalla completa | ✓ | ✓ | ✓ |
| 320, 375, 390, 768 y 1366 px sin desbordamiento; movimiento normal y reducido | ✓ | ✓ | ✓ |

- Bytes medidos en Chrome a 390 px: 0 MB de video al abrir la página; 127 KB de póster al llegar a la sección;
  unos 4 MB tras 5 s de reproducción y ninguna descarga adicional después de pausar.
- WebKit para Windows reproduce con sus propios componentes y no expone el audio decodificado ni las
  peticiones del video: el audio en Safari debe comprobarse en un iPhone.

## Ajuste del 21 de octubre: header, hero, simulador, formulario y secciones

**Emulación** en Chromium y WebKit (320, 375, 390, 768, 1024 y 1366 px); no sustituye teléfonos físicos.

- Header: navegación completa desde 1360 px (siete secciones, Llamar, correo y "Solicitar asesoría" en una
  línea, centros alineados, sin rotaciones ni desbordes); por debajo, menú compacto con llamada y correo.
- Hero: cinco accesos a WhatsApp con el mensaje prellenado y codificado (no se envía nada solo); tarjetas
  del retrato rectas en escritorio.
- Simulador: barras desde cero con leyenda y tabla accesible; costo de esperar comprobado con 10 %, 0 %, el
  mínimo de $2,000 y plazos de 5 años o menos (sin comparación).
- Formulario: correo o teléfono (México por defecto, otro país y números pegados con prefijo), ingresos e
  interés en ambas ramas; solo viaja el dato del medio elegido.
- La librería de teléfonos internacionales se descarga solo al usar el formulario: el JavaScript inicial
  creció ~5 KB comprimidos en lugar de ~35 KB.

## Problemas encontrados y corregidos

1. **Hidratación fallida** (React #418): un `<div>` (avatar) dentro de un `<p>`. Corregido; script de
   verificación permanente.
2. **Colisión de clases**: `.lead` (párrafo) y la sección del formulario compartían nombre; el párrafo heredaba
   fondo y la sección quedaba a 38rem de ancho. Renombrada la sección (`.request`).
3. **Desbordamiento horizontal de 4 px** a 768/1024 px: el reset `ul[role=list]` anulaba el padding de los
   carriles. Reset con `:where()`.
4. **Subrayado del hero** ocupaba toda la línea en móvil; ahora solo acompaña a "viene.".
5. **Tarjetas ocultas en el carrusel móvil** (fuera de pantalla en horizontal nunca "entraban"). La entrada se
   desactiva para tarjetas del carrusel manual.
6. **Campo exacto del simulador**: al enfocar cambiaba "3,000" por "3000" y lo tecleado se sumaba al final.
   Ahora conserva el texto al enfocar.
7. **Logos muy anchos**: la caja se deformaba al limitar solo el ancho. Tamaño exacto por atributos
   (alto uniforme, ancho máximo proporcional).
8. **Movimiento reducido**: el título arrancaba desde su estado inicial durante el retardo. Ahora no hay
   animaciones con esa preferencia.
9. **Pausa del carrusel**: el foco en el control no pausaba; luego, tras "Reanudar", el foco seguía pausando.
   Ahora el foco pausa hasta que el visitante usa el botón, cuya elección manda.
10. **Primer layout costoso**: las fuentes de respaldo con `local()` encarecían ~30 % el primer layout
    (mediana 290 → 198 ms). Eliminadas: con `font-display: optional` no hay intercambio de fuente.
11. **`content-visibility: auto`** se probó: adelantaba el primer pintado (~880 → 520 ms con CPU ×4) pero
    causaba tirones de 300–400 ms al llegar a cada sección. **Descartado** por priorizar fluidez.
12. **Primer pintado esperaba a la hidratación**: ahora React hidrata tras el primer pintado.
13. **Envío antes de hidratar**: el botón queda deshabilitado hasta hidratar y el formulario usa `POST`, para
    que nunca se envíen datos en la URL.
14. Picos de 1–3 s en el scroll resultaron ser del **render por software** de Chromium headless (SwiftShader);
    las mediciones finales usan la GPU real.

## Limitaciones de esta comprobación

- Sin teléfono físico, sin Safari/iOS ni Firefox. La emulación no reproduce el teclado virtual real, la barra
  dinámica de Safari ni el rendimiento térmico de un teléfono.
- Red emulada sobre servidor local HTTP/1.1 (Vercel usa HTTP/2-3 con prioridades; la competencia entre CSS y
  fuentes debería ser menor).
- `font-display: optional` con precarga: Chrome retiene el primer pintado hasta que llegan las fuentes (dentro de
  un límite). Es el costo de no mostrar cambios de fuente; en conexiones muy lentas se usará la fuente del sistema
  en la primera visita.
- No se afirma una tasa de FPS ni una puntuación de rendimiento.

## Prueba pendiente en teléfono físico

1. En la PC: `npm run build` y luego `npm run preview:demo -- --host`. Abrir en el teléfono (misma Wi-Fi) la URL
   de red que imprime (por ejemplo `http://192.168.1.20:4173`). Si Windows pregunta, permitir Node en redes
   privadas.
2. Probar en Safari (iPhone) y Chrome (Android), en vertical y horizontal:
   - Primera carga y recarga: hero visible de inmediato, sin parpadeos ni saltos; fuentes estables.
   - Scroll completo hacia abajo y hacia arriba: sin tirones; las secciones aparecen una vez.
   - Menú: abrir, navegar a cada sección (el título queda bajo el header), cerrar con la X.
   - Simulador: arrastrar los tres controles, escribir valores exactos (menos de $2,000 muestra el aviso y se
     corrige al salir del campo; tasa 0 % y fuera de rango).
   - FAQ: abrir y cerrar.
   - Formulario: con el teclado abierto el campo activo queda visible y el header se retira; probar errores,
     las dos ramas de la pregunta de interés (y que cambiar de rama limpia la elección), autorización, envío
     (modo demostración) y el aviso de privacidad sin perder datos.
   - Hero: foto de Luis nítida y bien encuadrada; logo legible en header y footer.
   - Ajustes → Accesibilidad → Reducir movimiento: todo visible y operable.
3. Para el carrusel con fixtures: `npm run dev -- --host` y abrir la URL de red en el puerto 5173.
4. Anotar modelo, sistema y navegador, y marcar `telefono-fisico` en `src/content/launch.js` solo si todo pasa.
