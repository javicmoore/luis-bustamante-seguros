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
        A través del formulario de asesoría: nombre, edad, teléfono de contacto y tu respuesta sobre si puedes destinar
        parte de tus ingresos a un objetivo de ahorro o retiro. No se solicitan correo electrónico, ingresos exactos,
        datos de salud ni otros datos sensibles por este medio.
      </p>
      <p>
        Para prevenir el uso abusivo del formulario, el servidor procesa tu dirección IP de forma seudonimizada y
        temporal (menos de 24 horas). Este sitio no instala herramientas de publicidad ni de seguimiento.
      </p>

      <H>Finalidad</H>
      <p>
        Tus datos se usan únicamente para contactarte por teléfono o WhatsApp y dar seguimiento a la solicitud de
        asesoría que enviaste. No se usan para enviarte publicidad ni campañas y no se venden.
      </p>

      <H>Cómo se procesa tu solicitud</H>
      <p>
        Al enviar el formulario, la solicitud se registra en un almacenamiento privado y se envía un aviso al WhatsApp
        de Luis. Para ello intervienen proveedores tecnológicos que actúan por cuenta del responsable: Vercel
        (alojamiento del sitio), Upstash (registro temporal de la solicitud) y Twilio (envío del aviso por WhatsApp).
        Estos proveedores pueden procesar la información fuera de México. <Pending>confirmar proveedores y su
        tratamiento antes del lanzamiento</Pending>
      </p>

      <H>Conservación</H>
      <p>
        El registro de tu solicitud en el sitio se conserva hasta {privacy.retentionDays} días y después se elimina
        automáticamente. <Pending>plazo de conservación una vez que Luis atiende la solicitud</Pending>
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
        Al marcar la casilla de autorización y enviar el formulario, aceptas que {site.name} te contacte por teléfono o
        WhatsApp sobre tu solicitud, conforme a este aviso. La autorización se limita a esa solicitud.
      </p>

      <H>Cambios a este aviso</H>
      <p>
        Cualquier cambio se publicará en esta página. Última actualización:{' '}
        {privacy.updatedAt || <Pending>fecha de la versión definitiva</Pending>}.
      </p>
    </div>
  );
}
