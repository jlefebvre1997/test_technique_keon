import type { Intervention } from '../../domaine/maintenance/intervention';
import type { Utilisateur } from '../../domaine/referentiel/referentiel';
import type { Depots } from '../depots';
import { trouverInterventionPour } from './trouver-intervention';

export function demarrerIntervention(depots: Depots, utilisateur: Utilisateur, id: number): Intervention {
  const intervention = trouverInterventionPour(depots, utilisateur, 'demarrer', id);
  intervention.demarrer();
  return depots.interventions.enregistrer(intervention);
}
