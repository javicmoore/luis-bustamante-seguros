import { privacy, isPrivacyFinal } from '../../content/privacy.js';
import { site } from '../../content/site.js';
import './Privacy.css';

function Pending({ children }) {
  return <mark className="privacy-pending">[Pendiente: {children}]</mark>;
}

/**
 * Aviso de privacidad. Los datos del responsable viven en src/content/privacy.js; si falta alguno, se muestra
 * como pendiente y la página se marca como borrador.
 */
export function PrivacyContent({ headingLevel = 2 }) {
  const H = `h${headingLevel}`;
  const final = isPrivacyFinal();
  const r = privacy.responsible;

  return (
    <div className="privacy-content">
      {!final ? (
        <p className="privacy-draft" role="note">
          <strong>Borrador pendiente de revisión.</strong> Este texto todavía no es el aviso de privacidad
          definitivo: faltan los datos del responsable y su revisión legal.
        </p>
      ) : null}

      <H>Responsable</H>
      <p>
        {r.legalName || <Pending>nombre del responsable</Pending>}, {site.role.toLowerCase()}, con domicilio en{' '}
        {r.address || <Pending>domicilio</Pending>}, es responsable del tratamiento de los datos personales que
        compartes en este sitio.
      </p>

      <H>Datos que se recaban</H>
      <p>
        A través del formulario de asesoría: nombre, edad, el medio por el que prefieres que te contacten y el dato
        correspondiente (correo electrónico o teléfono con su país), y el rango de tus ingresos
        mensuales. El rango de ingresos es un dato patrimonial que solo orienta la conversación: no se usa para aprobar
        ni rechazar solicitudes. Por tratarse de un dato patrimonial, se te pide tu consentimiento expreso con la casilla
        de autorización. No se solicitan ingresos exactos, datos de salud ni otros datos sensibles por este medio.
      </p>
      <p>
        Este sitio no guarda ni envía a un servidor los datos del formulario, y no instala herramientas de publicidad ni
        de seguimiento. Como cualquier sitio web, su proveedor de alojamiento (Vercel) procesa datos técnicos de la
        conexión, como tu dirección IP, para mostrarte la página.
      </p>

      <H>Finalidad</H>
      <p>
        Tus datos se usan únicamente para contactarte por el medio que elegiste (correo electrónico, o llamada o
        WhatsApp), responder la solicitud de asesoría que le enviaste y, si lo deseas, agendar una cita. No se usan
        para enviarte publicidad ni campañas y no se venden.
      </p>

      <H>Cómo se procesa tu solicitud</H>
      <p>
        Al pulsar «Enviar por WhatsApp», tu navegador prepara un mensaje con los datos del formulario y abre WhatsApp
        en una conversación con Luis. El mensaje no se envía solo: puedes revisarlo, cambiarlo o no enviarlo. Solo si
        lo envías, le llega a Luis por WhatsApp, junto con tu número de WhatsApp.
      </p>
      <p>
        WhatsApp es un servicio de Meta, con sus propios términos y aviso de privacidad, y puede procesar la
        información fuera de México. El sitio se aloja en Vercel, que no recibe los datos del formulario.
      </p>

      <H>Conservación</H>
      <p>
        Este sitio no conserva los datos del formulario. Los mensajes que le envíes a Luis se conservan en su WhatsApp
        y se usan para responderte y, en su caso, agendar contigo. Puedes pedir en cualquier momento que se cancelen
        tus datos, como se explica en la sección de derechos ARCO.
      </p>

      <H>Transferencias</H>
      <p>
        Tus datos no se transfieren a terceros. WhatsApp (Meta) y Vercel solo prestan el servicio técnico de mensajería
        y de alojamiento descrito arriba.
      </p>

      <H>Derechos ARCO y revocación del consentimiento</H>
      <p>
        Puedes pedir el acceso a tus datos, su rectificación o su cancelación, oponerte a su tratamiento o revocar tu
        consentimiento. {site.name} atiende personalmente estas solicitudes por{' '}
        {r.rightsContact || <Pending>medio de contacto para derechos ARCO</Pending>}.
      </p>
      <ol>
        <li>
          <strong>Qué escribir.</strong> Tu nombre, qué derecho quieres ejercer (o que revocas tu consentimiento), a
          qué datos se refiere y, si pides una corrección, cuál es el dato correcto. La respuesta te llegará por la
          misma conversación, salvo que indiques otro medio.
        </li>
        <li>
          <strong>Cómo se confirma tu identidad.</strong> Antes de responder, {site.name} te pedirá mostrar una
          identificación oficial vigente en una videollamada por WhatsApp. No necesitas enviar una copia; si prefieres
          enviarla, tapa los datos que no hagan falta para identificarte (por ejemplo, la CURP o el domicilio). Si
          actúas en nombre de otra persona, también deberás acreditar que la representas, por ejemplo con una carta
          poder firmada ante dos testigos y las identificaciones de ambas personas.
        </li>
        <li>
          <strong>Plazos.</strong> Recibirás respuesta en un máximo de 20 días hábiles desde que tu solicitud esté
          completa. Si procede, se hará efectiva dentro de los 15 días hábiles siguientes a esa respuesta. Ambos plazos
          pueden ampliarse una sola vez por un periodo igual cuando haya una causa justificada; en ese caso se te
          avisará. Si falta información, se te pedirá antes de que empiece a correr el plazo.
        </li>
        <li>
          <strong>Costo.</strong> Es gratuito. Solo podrían cobrarse los gastos de envío o de reproducción si pides
          copias de tus datos.
        </li>
        <li>
          <strong>Si no estás de acuerdo.</strong> Si no recibes respuesta o no estás conforme con ella, puedes
          acudir a la autoridad en materia de protección de datos personales.
        </li>
      </ol>

      <H>Consentimiento</H>
      <p>
        Al marcar la casilla de autorización y enviarle tu mensaje por WhatsApp, aceptas de forma expresa que {site.name} te
        contacte por el medio que elegiste (correo electrónico, o llamada o WhatsApp) sobre tu solicitud, conforme a
        este aviso. La autorización se limita a esa solicitud.
      </p>

      <H>Cambios a este aviso</H>
      <p>
        Cualquier cambio se publicará en esta página. Última actualización:{' '}
        {privacy.updatedAt || <Pending>fecha de la versión definitiva</Pending>}.
      </p>
    </div>
  );
}
