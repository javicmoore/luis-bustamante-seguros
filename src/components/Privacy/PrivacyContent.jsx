import { privacy, isPrivacyFinal } from '../../content/privacy.js';
import { site } from '../../content/site.js';
import './Privacy.css';

function Pending({ children }) {
  return <mark className="privacy-pending">[Pendiente: {children}]</mark>;
}

/**
 * Aviso de privacidad (BORRADOR). No es definitivo hasta completar los datos del
 * responsable y su revisión legal (src/content/privacy.js → status: 'final').
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
        {site.name} ({r.legalName || <Pending>nombre legal completo</Pending>}), {site.role.toLowerCase()} en{' '}
        {site.location.city}, {site.location.state}, con domicilio en {r.address || <Pending>domicilio</Pending>}, es
        responsable del tratamiento de los datos personales que compartes en este sitio.
      </p>

      <H>Datos que se recaban</H>
      <p>
        A través del formulario de asesoría: nombre, edad, el medio por el que prefieres que te contacten y el dato
        correspondiente (correo electrónico o teléfono con su país), y el rango de tus ingresos
        mensuales. El rango de ingresos es un dato patrimonial que solo orienta la conversación: no se usa para aprobar
        ni rechazar solicitudes. No se solicitan ingresos exactos, datos de salud ni otros datos sensibles por este
        medio. <Pending>revisión legal del tratamiento de datos patrimoniales</Pending>
      </p>
      <p>
        Este sitio no guarda ni envía a un servidor los datos del formulario, y no instala herramientas de publicidad ni
        de seguimiento. Como cualquier sitio web, el proveedor de alojamiento puede procesar datos técnicos de la
        conexión, como tu dirección IP. <Pending>confirmar con el proveedor de alojamiento</Pending>
      </p>

      <H>Finalidad</H>
      <p>
        Tus datos se usan únicamente para contactarte por el medio que elegiste (correo electrónico, o llamada o
        WhatsApp) y dar seguimiento a la solicitud de asesoría que le enviaste. No se usan para enviarte publicidad ni campañas y no se venden.
      </p>

      <H>Cómo se procesa tu solicitud</H>
      <p>
        Al pulsar «Enviar por WhatsApp», tu navegador prepara un mensaje con los datos del formulario y abre WhatsApp
        en una conversación con Luis. El mensaje no se envía solo: puedes revisarlo, cambiarlo o no enviarlo. Solo si
        lo envías, le llega a Luis por WhatsApp, junto con tu número de WhatsApp.
      </p>
      <p>
        WhatsApp es un servicio de Meta, con sus propios términos y aviso de privacidad, y puede procesar la
        información fuera de México. El sitio se aloja en Vercel. <Pending>confirmar proveedores y su tratamiento
        antes del lanzamiento</Pending>
      </p>

      <H>Conservación</H>
      <p>
        Este sitio no conserva los datos del formulario. Los mensajes que le envíes a Luis se conservan en su
        WhatsApp. <Pending>plazo de conservación de las conversaciones una vez que Luis atiende la solicitud</Pending>
      </p>

      <H>Transferencias</H>
      <p>
        Tus datos no se transfieren a terceros para fines propios de ellos. <Pending>revisión legal</Pending>
      </p>

      <H>Derechos ARCO y revocación del consentimiento</H>
      <p>
        Puedes solicitar el acceso, la rectificación o la cancelación de tus datos, oponerte a su tratamiento o revocar
        tu consentimiento a través de {r.rightsContact || <Pending>medio de contacto para derechos ARCO</Pending>}.{' '}
        <Pending>procedimiento, requisitos y plazos de respuesta</Pending>
      </p>

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
