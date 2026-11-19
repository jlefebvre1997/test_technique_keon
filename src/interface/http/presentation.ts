import type { Intervention } from '../../domaine/maintenance/intervention';

export function interventionVersJson(intervention: Intervention) {
  const d = intervention.donnees();
  return {
    id: d.id,
    siteId: d.siteId,
    equipementId: d.equipementId,
    technicienId: d.technicienId,
    dateDebut: d.dateDebut.versAffichage(),
    dureeMinutes: d.dureeMinutes,
    description: d.description,
    statut: d.statut,
  };
}
