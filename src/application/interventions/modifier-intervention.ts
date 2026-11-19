import { DateHeureParis } from '../../domaine/commun/date-heure-paris';
import type { Intervention } from '../../domaine/maintenance/intervention';
import type { Utilisateur } from '../../domaine/referentiel/referentiel';
import type { Depots } from '../depots';
import { trouverInterventionPour } from './trouver-intervention';

export interface CommandeModification {
  /** Heure locale de Paris, sans décalage (RG-6). */
  dateDebut?: string;
  dureeMinutes?: number | null;
  description?: string;
}

/** H3 : modifier une intervention non close. RG-4 : refusé une fois close. */
export function modifierIntervention(
  depots: Depots,
  utilisateur: Utilisateur,
  id: number,
  commande: CommandeModification,
): Intervention {
  const intervention = trouverInterventionPour(depots, utilisateur, 'modifier', id);
  intervention.modifier({
    dateDebut: commande.dateDebut === undefined ? undefined : DateHeureParis.depuisSaisie(commande.dateDebut),
    dureeMinutes: commande.dureeMinutes,
    description: commande.description,
  });
  return depots.interventions.enregistrer(intervention);
}
