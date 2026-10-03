// Datos del aviso de privacidad. BORRADOR: faltan datos del responsable y revisión legal.
// No inventar nombre legal, domicilio ni medio de contacto para derechos ARCO.
export const privacy = {
  // Cambiar a 'final' solo cuando los datos estén completos y el texto haya sido revisado.
  status: 'borrador',
  updatedAt: null, // 'AAAA-MM-DD' de la versión final
  responsible: {
    legalName: null, // nombre legal completo del responsable
    address: null, // domicilio para efectos del aviso
    rightsContact: null, // medio para ejercer derechos ARCO y revocar el consentimiento
  },
  // Días que se conserva el registro mínimo de la solicitud web (debe coincidir con
  // LEAD_RETENTION_DAYS en el servidor).
  retentionDays: 30,
};

export function isPrivacyFinal(p = privacy) {
  const r = p.responsible;
  return p.status === 'final' && Boolean(r.legalName && r.address && r.rightsContact && p.updatedAt);
}
