import type { Intervention } from '../../domaine/maintenance/intervention';
import type { Utilisateur } from '../../domaine/referentiel/referentiel';
import type { Depots } from '../depots';
import { trouverInterventionPour } from './trouver-intervention';

/** RG-5 : le responsable d'exploitation corrige la durée d'une intervention close. */
export function corrigerDuree(depots: Depots, utilisateur: Utilisateur, id: number, dureeMinutes: number): Intervention {
  const intervention = trouverInterventionPour(depots, utilisateur, 'corrigerDuree', id);
  intervention.corrigerDuree(dureeMinutes);
  return depots.interventions.enregistrer(intervention);
}
