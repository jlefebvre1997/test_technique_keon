import { ErreurMetier } from '../../domaine/commun/erreurs';
import { Periode } from '../../domaine/commun/periode';
import type { Intervention } from '../../domaine/maintenance/intervention';
import type { Statut } from '../../domaine/maintenance/intervention.machine';
import type { Utilisateur } from '../../domaine/referentiel/referentiel';
import type { Depots } from '../depots';
import { droitsDe, exiger } from '../droits';

export interface FiltresListe {
  statut?: Statut;
  /** Jours AAAA-MM-JJ, heure de Paris, bornes incluses (H8). */
  du?: string;
  au?: string;
}

export function listerInterventions(
  depots: Depots,
  utilisateur: Utilisateur,
  siteId: number,
  filtres: FiltresListe,
): Intervention[] {
  exiger(droitsDe(utilisateur), 'lire', 'Site', { id: siteId });
  if (!depots.referentiel.trouverSite(siteId)) throw new ErreurMetier('SITE_INTROUVABLE', `Site ${siteId} introuvable.`);
  return depots.interventions.listerParSite(siteId, {
    statut: filtres.statut,
    periode: Periode.optionnelle(filtres.du, filtres.au),
  });
}
