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
   - Simulador: arrastrar los tres controles, escribir valores exactos (0 y fuera de rango).
   - FAQ: abrir y cerrar.
   - Formulario: con el teclado abierto el campo activo queda visible y el header se retira; probar errores,
     autorización, envío (modo demostración) y el aviso de privacidad sin perder datos.
   - Ajustes → Accesibilidad → Reducir movimiento: todo visible y operable.
3. Para el carrusel con fixtures: `npm run dev -- --host` y abrir la URL de red en el puerto 5173.
4. Anotar modelo, sistema y navegador, y marcar `telefono-fisico` en `src/content/launch.js` solo si todo pasa.
