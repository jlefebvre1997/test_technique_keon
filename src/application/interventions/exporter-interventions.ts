import { ErreurMetier } from '../../domaine/commun/erreurs';
import { Periode } from '../../domaine/commun/periode';
import type { EtatIntervention } from '../../domaine/maintenance/intervention';
import type { Equipement, Site, Utilisateur } from '../../domaine/referentiel/referentiel';
import type { Depots } from '../depots';
import { droitsDe, exiger } from '../droits';

/** Intervention accompagnée des libellés du référentiel : l'export parle métier, pas identifiants techniques. */
export interface LigneExport {
  intervention: Readonly<EtatIntervention>;
  equipement: Equipement;
  technicien: Utilisateur;
}

export interface ExportInterventions {
  site: Site;
  lignes: LigneExport[];
}

/** RG-7 : interventions d'un site sur une période, pour le contrôle de gestion. */
export function exporterInterventions(
  depots: Depots,
  utilisateur: Utilisateur,
  siteId: number,
  { du, au }: { du?: string; au?: string },
): ExportInterventions {
  exiger(droitsDe(utilisateur), 'exporter', 'Site', { id: siteId });
  const site = depots.referentiel.trouverSite(siteId);
  if (!site) throw new ErreurMetier('SITE_INTROUVABLE', `Site ${siteId} introuvable.`);
  if (du === undefined || au === undefined) {
    throw new ErreurMetier('PERIODE_INVALIDE', "L'export porte sur une période : du et au sont obligatoires.");
  }
  const interventions = depots.interventions.listerParSite(siteId, { periode: Periode.depuisSaisie(du, au) });

  const equipements = new Map<number, Equipement | undefined>();
  const techniciens = new Map<number, Utilisateur | undefined>();
  const lignes = interventions.map((i) => {
    const intervention = i.donnees();
    return {
      intervention,
      equipement: memoriser(equipements, intervention.equipementId, (id) => depots.referentiel.trouverEquipement(id)),
      technicien: memoriser(techniciens, intervention.technicienId, (id) => depots.referentiel.trouverUtilisateur(id)),
    };
  });
  return { site, lignes };
}

function memoriser<T>(cache: Map<number, T | undefined>, id: number, charger: (id: number) => T | undefined): T {
  if (!cache.has(id)) cache.set(id, charger(id));
  const valeur = cache.get(id);
  // Garanti par les clés étrangères : une absence est une incohérence de données, pas un refus métier.
  if (valeur === undefined) throw new Error(`Référentiel incohérent : identifiant ${id} introuvable.`);
  return valeur;
}
