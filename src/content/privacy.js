// Datos del aviso de privacidad. No inventar nombre legal, domicilio ni medio de contacto para derechos ARCO.
// 23 nov 2026: datos confirmados por Javier (responsable, domicilio visible y medio ARCO). El texto lo aprobó
// Javier; no consta revisión de un abogado.
export const privacy = {
  status: 'final',
  updatedAt: '2026-11-23', // 'AAAA-MM-DD' de la versión vigente
  responsible: {
    legalName: 'Luis Bustamante', // responsable confirmado por Javier
    address: 'Mexicali, Baja California, C.P. 21290', // domicilio visible confirmado (sin calle, número ni colonia)
    rightsContact: 'WhatsApp al +52 686 387 2193', // Luis atiende personalmente las solicitudes ARCO
  },
};

export function isPrivacyFinal(p = privacy) {
  const r = p.responsible;
  return p.status === 'final' && Boolean(r.legalName && r.address && r.rightsContact && p.updatedAt);
}
