# Notificación automática por WhatsApp (Twilio)

Estado: **implementado y probado con un proveedor simulado. No está operativo**: faltan la cuenta, el
remitente de WhatsApp, la plantilla aprobada, las credenciales y una prueba autorizada.

## Cómo funciona

```
Navegador ──POST /api/leads──▶ Función de Vercel ──▶ Upstash Redis (registro mínimo, límites, idempotencia)
                                       │
                                       └──▶ Twilio Messages API (plantilla aprobada) ──▶ WhatsApp de Luis
Twilio ──POST /api/twilio-status?lead=LB-XXXXXXXX (firmado)──▶ Función de Vercel ──▶ estado de entrega
```

- El navegador **solo envía** nombre, edad, teléfono, respuesta de ahorro y consentimiento. El servidor decide
  destinatario, plantilla, remitente y credenciales. Cualquier campo extra (por ejemplo `to`) se rechaza.
- El destino es **Luis** (`LEAD_NOTIFICATION_TO`). No se envía nada al prospecto.
- Se usa una **plantilla de contenido aprobada por WhatsApp** (`ContentSid` + `ContentVariables`), necesaria para
  escribir fuera de la ventana de 24 horas. No depende de que Luis haya escrito antes.
- "Aceptado por Twilio" **no es entrega**: la entrega o el fallo llegan por el callback de estado.

Documentación consultada (octubre 2026): Messages API (`POST /2010-04-01/Accounts/{AccountSid}/Messages.json`,
parámetros `To`, `From`, `ContentSid`, `ContentVariables`, `StatusCallback`), envío de plantillas del Content
Template Builder, aprobación de plantillas de WhatsApp, callbacks de estado y seguridad de webhooks
(`X-Twilio-Signature`, HMAC-SHA1 con el **Auth Token**).

## Qué hay que configurar en Twilio

1. **Cuenta de Twilio** de pago (las cuentas de prueba tienen restricciones).
2. **Remitente de WhatsApp** registrado (WhatsApp Business vinculado a un Meta Business). Su número debe ser
   **distinto** del de Luis. El código lo valida.
3. **Plantilla** en Content Template Builder, categoría sugerida *Utility* (WhatsApp puede reclasificarla).
   Texto propuesto, versión 2 con el interés del prospecto (8 variables numeradas; ninguna al inicio ni al
   final; nunca dos variables juntas):

   ```
   Nuevo prospecto {{1}}

   Folio: {{2}}
   Nombre: {{3}}
   Edad: {{4}} años
   Teléfono: {{5}}
   Interés: {{6}}
   ¿Puede destinar parte de sus ingresos a ahorro o retiro?: {{7}}
   Recibida: {{8}}

   Este aviso se generó automáticamente desde el formulario de tu sitio.
   ```

   `{{1}}` completa el encabezado según el interés que eligió la persona (WhatsApp no admite una variable al
   inicio del texto, por eso "Nuevo prospecto" es fijo):

   | Interés elegido | Encabezado resultante | `{{6}}` Interés |
   | --- | --- | --- |
   | Gastos médicos mayores (GMM) | Nuevo prospecto para GMM | Gastos médicos mayores (GMM) |
   | Auto | Nuevo prospecto para Auto | Auto |
   | Auto turista | Nuevo prospecto para Auto turista | Auto turista |
   | Hogar | Nuevo prospecto para Hogar | Hogar |
   | Otro (seguro) | Nuevo prospecto — Otro seguro | Otro seguro |
   | PPR / retiro | Nuevo prospecto para PPR | PPR / retiro |
   | Ahorro e inversión | Nuevo prospecto para Ahorro e inversión | Ahorro e inversión |
   | Educación | Nuevo prospecto para Educación | Educación |
   | Necesito orientación | Nuevo prospecto — Necesita orientación | Necesita orientación |

   El interés nunca se deduce: responder "Sí" a la pregunta de ahorro no implica PPR. El servidor solo acepta
   las combinaciones permitidas ("Busco un seguro / No aplica" → seguros; "Sí" o "No" → asesoría de ahorro).

   Valores de ejemplo para la revisión (ficticios): `para GMM`, `LB-7K3M9QX2`, `Ana López`, `34`,
   `+52 686 000 1234`, `Gastos médicos mayores (GMM)`, `Busco un seguro / No aplica`,
   `11 oct 2026, 11:30 (hora de Mexicali)`.
   La aprobación suele tardar minutos y puede llegar a 48 h. **No asumir que está aprobada** hasta verla con
   estado *Approved*. Si se rechaza, ajustar y reenviar con otro nombre.

   **Estado (11 oct 2026): esta plantilla no se ha creado ni aprobado, y no se ha probado ningún envío.** Los
   avisos se verificaron solo con pruebas automatizadas (`tests/unit/lead-message.test.js`,
   `tests/unit/leads-handler.test.js`), sin contactar a Twilio.

   Cambios respecto de la versión 1 (6 variables, encabezado fijo "Nueva solicitud de asesoría…"):
   - Una plantilla aprobada no se edita: hay que **crear una nueva** (p. ej. `aviso_prospecto_v2`), esperar
     su aprobación y poner su `HX…` en `TWILIO_CONTENT_SID`. Con el SID de la versión 1 el envío fallaría,
     porque el código manda 8 variables.
   - Riesgos de revisión de Meta: más variables por cantidad de texto fijo (si la rechazan por esa
     proporción, agregar texto fijo, no quitar datos) y posible reclasificación de categoría. La variable del
     encabezado admite valores cortos y previsibles (máx. 40 caracteres).
   - `npm run check:release` mantiene como pendiente "Plantilla de WhatsApp de 8 variables…" hasta marcarla
     en `src/content/launch.js` con evidencia.
4. **Aceptación de Luis**: Luis debe aceptar recibir estas notificaciones del remitente (dejar constancia).
5. **API Key** (tipo *Standard*): `SK…` + secreto. Se usa para crear mensajes.
6. **Auth Token** de la cuenta: Twilio firma los callbacks con él. Si se rota, actualizarlo en Vercel.

El orden de las variables lo fija `backend/lead-message.js` (`{{1}}`…`{{8}}`; `previewNotification()` arma
el texto completo para pruebas). Si cambian el texto de la plantilla, mantengan esa numeración. Los valores se limpian (sin saltos de línea, tabuladores ni espacios
repetidos), como exige WhatsApp.

### Formato del número de Luis

`LEAD_NOTIFICATION_TO` va en E.164 (`+52…`). En México algunos números de WhatsApp aparecen con el antiguo
prefijo móvil (`+521…`). Confirmar en la prueba autorizada cuál formato entrega correctamente; no lo fije por
suposición.

## Variables en Vercel (privadas; nunca con prefijo `VITE_`)

| Variable | Ejemplo de formato | Uso |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | `AC…` (34 caracteres) | Cuenta (va en la URL de la API) |
| `TWILIO_API_KEY` / `TWILIO_API_SECRET` | `SK…` / secreto | Autenticación para crear mensajes |
| `TWILIO_AUTH_TOKEN` | — | Verificar la firma de los callbacks |
| `TWILIO_WHATSAPP_FROM` | `+1…` o `whatsapp:+1…` | Remitente habilitado |
| `TWILIO_CONTENT_SID` | `HX…` | Plantilla aprobada |
| `LEAD_NOTIFICATION_TO` | `+52…` | WhatsApp de Luis |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | `https://…upstash.io` | O `KV_REST_API_URL` / `_TOKEN` de la integración |
| `LEAD_HASH_SECRET` | 32+ caracteres aleatorios | Seudónimos de IP/teléfono para límites |
| `SITE_URL` | `https://dominio-final` | URL del callback y SEO |

`LEAD_PROVIDER` debe quedar sin definir o en `twilio`. En producción, `mock` se rechaza y cualquier variable
faltante produce un **503 controlado** (nunca un éxito ficticio).

## Callback de estado

- URL que el servidor envía a Twilio: `${SITE_URL}/api/twilio-status?lead=<folio>` (si no hay `SITE_URL`, usa la
  URL del despliegue). Solo se solicita si existe `TWILIO_AUTH_TOKEN`.
- Se verifica la firma (réplica del algoritmo del SDK oficial, con pruebas de paridad contra `twilio`), la
  cuenta (`AccountSid`) y las repeticiones (`I-Twilio-Idempotency-Token`). Los estados solo avanzan
  (los callbacks pueden llegar desordenados) y se ignoran los de un mensaje anterior.
- Las vistas previas de Vercel con *Deployment Protection* bloquean a Twilio (401). Probar el callback en el
  dominio de producción o en un despliegue sin protección.

## Registro mínimo y retención

En Upstash (acceso privado con token del servidor):

| Llave | Contenido | Expira |
| --- | --- | --- |
| `lead:LB-…` | nombre, edad, teléfono, respuesta, fecha de consentimiento, estado de la notificación | `LEAD_RETENTION_DAYS` (30 días) |
| `idem:<uuid>` | estado del envío y huella HMAC (sin datos en claro) | 24 h |
| `rl:*` | contadores con seudónimos HMAC | 10 min a 24 h |
| `cb:*` | tokens de callbacks ya procesados | 48 h |

No hay panel ni CRM. Para revisar un aviso fallido: Upstash → Data Browser → llave `lead:<folio>` → campo
`notify` (`send_failed`, `uncertain`, `undelivered`, `failed`). Recomendado: dar acceso solo a Javier y usar el
token de solo lectura para consultas.

Los logs de Vercel registran únicamente eventos, folios, estados y códigos (`lead_received`,
`lead_notification`, `lead_notification_status`, `lead_notification_undelivered`). Nunca nombre, teléfono ni IP.

## Prueba autorizada (cuando Javier la autorice)

No se ha ejecutado ningún envío real. Para hacerlo:

1. Configurar todas las variables en el entorno de **producción** de Vercel y desplegar en el dominio final.
2. Abrir el sitio y enviar el formulario con **datos ficticios** (nombre "Prueba Ficticia", un teléfono propio
   de Javier, nunca datos de un prospecto real).
3. Verificar: la página muestra "Tu solicitud fue recibida" con folio; Luis recibe el WhatsApp con la plantilla;
   en los logs de Vercel aparecen `lead_notification` (`accepted`) y luego `lead_notification_status`
   (`sent`/`delivered`/`read`); en Upstash, `lead:<folio>` tiene `notify = delivered` o `read`.
4. Hacer doble clic en el botón de envío en una segunda prueba: debe llegar un solo aviso. En un despliegue
   de prueba, quitar temporalmente `TWILIO_CONTENT_SID` y confirmar que la página muestra el error controlado
   (no un éxito) y conserva los datos.
5. Marcar como `done: true` los puntos correspondientes en `src/content/launch.js`.

Para probar localmente sin enviar nada: `npm run preview:demo` (proveedor simulado). Con
`MOCK_NOTIFY_OUTCOME=failed|uncertain|slow` se simulan fallo, resultado incierto o respuesta lenta.

## Códigos de error frecuentes

- `63016`: mensaje fuera de la ventana de 24 h sin plantilla aprobada (revisar `TWILIO_CONTENT_SID` y su estado).
- `63007`: Twilio no encuentra un canal para el remitente (`TWILIO_WHATSAPP_FROM`).
- `21211`: número de destino inválido (`LEAD_NOTIFICATION_TO`).
- `20003`: autenticación fallida (API Key/secreto o Account SID).

El detalle de cada envío está en Twilio Console → Monitor → Logs → Messaging.
